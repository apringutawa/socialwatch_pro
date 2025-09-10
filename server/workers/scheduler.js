
import "dotenv/config";
import IORedis from "ioredis";
import { Worker, Queue } from "bullmq";
import { prisma } from "../src/db.js";
import { labelScore, extractKeywords } from "../src/sentiment.js";
import { getClient } from "../src/os.js";
import { fetchInstagramHashtagRecent } from "../src/connectors/instagram.js";
import { fetchFacebookPages } from "../src/connectors/facebook.js";
import { fetchXRecent } from "../src/connectors/x.js";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");
const os = getClient();

async function indexToOS(post, sentiment){
  if (!os) return;
  const index = `posts-${post.createdAt.toISOString().slice(0,10)}`;
  await os.index({ index, body: { source: post.source, author: post.author || "unknown", text: post.text, lang: post.lang || "id", created_at: post.createdAt, sentiment: sentiment?.label || "neutral", like_count: post.likeCount, comment_count: post.commentCount, share_count: post.shareCount, url: post.url }, refresh: false });
}

new Worker("ingest", async job => {
  const { source, text, author, createdAt, url, metrics, lang } = job.data;
  const post = await prisma.post.create({ data: { source, text, author, createdAt: new Date(createdAt), url, lang: lang || "id", likeCount: metrics?.likes || 0, commentCount: metrics?.comments || 0, shareCount: metrics?.shares || 0 } });
  const s = labelScore(text);
  const sentiment = await prisma.sentiment.create({ data: { label: s.label, score: s.score, postId: post.id } });
  await prisma.post.update({ where:{id:post.id}, data: { sentimentId: sentiment.id } });
  const kws = extractKeywords(text);
  for (const token of kws) {
    const kw = await prisma.keyword.upsert({ where:{ token }, create:{ token }, update:{} });
    await prisma.keywordOnPost.upsert({ where:{ postId_keywordId: { postId: post.id, keywordId: kw.id } }, create:{ postId: post.id, keywordId: kw.id, count: 1 }, update:{ count: { increment: 1 } } });
  }
  await indexToOS(post, sentiment);
}, { connection });

const queue = new Queue("ingest", { connection });

async function produceFromEnv(){
  const igToken = process.env.IG_USER_TOKEN;
  const igBiz = process.env.IG_BUSINESS_ID;
  const igTags = (process.env.IG_HASHTAGS || "").split(",").map(s=>s.trim()).filter(Boolean);
  const fbPairs = (process.env.FB_PAGE_ACCESS_TOKENS || "").split(",").map(s=>s.trim()).filter(Boolean);
  const xToken = process.env.X_BEARER_TOKEN;
  const xQuery = process.env.X_QUERY || "iphone";
  let items = [];
  items.push(...await fetchInstagramHashtagRecent({ hashtags: igTags, userToken: igToken, businessId: igBiz, limit: 20 }));
  items.push(...await fetchFacebookPages({ pageTokens: fbPairs, limit: 20 }));
  items.push(...await fetchXRecent({ bearerToken: xToken, query: xQuery, maxResults: 20 }));
  return items;
}

async function produceFromDB(){
  const srcs = await prisma.sourceConf.findMany({ where: { active: true } });
  let items = [];
  for (const s of srcs){
    try {
      if (s.type === "instagram"){
        const conf = s.config || {};
        items.push(...await fetchInstagramHashtagRecent({
          hashtags: conf.hashtags || [],
          userToken: conf.userToken,
          businessId: conf.businessId,
          limit: conf.limit || 20
        }));
      } else if (s.type === "facebook"){
        const conf = s.config || {};
        items.push(...await fetchFacebookPages({
          pageTokens: conf.pages || [],
          limit: conf.limit || 20
        }));
      } else if (s.type === "twitter"){
        const conf = s.config || {};
        items.push(...await fetchXRecent({
          bearerToken: conf.bearerToken,
          query: conf.query || "iphone",
          maxResults: conf.maxResults || 20
        }));
      }
    } catch(e){ console.log("produceFromDB error:", e.message); }
  }
  return items;
}

async function produce(){
  const items = [ ...(await produceFromEnv()), ...(await produceFromDB()) ];
  if (items.length){ await queue.addBulk(items.map((data) => ({ name:"ingest", data }))); }
}

async function loop(){ try { await produce(); } catch (e) { console.log("scheduler error:", e.message); } setTimeout(loop, 120_000); }
console.log("Scheduler worker up"); loop();
