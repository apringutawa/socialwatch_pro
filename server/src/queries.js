
import dayjs from "dayjs";
import { prisma } from "./db.js";
export async function searchPosts({ q, from, to, sources = [], sentiments = [], page = 1, size = 50 }) {
  const where = {
    createdAt: { gte: from ? new Date(from) : dayjs().subtract(7,"day").toDate(), lte: to ? new Date(to) : new Date() }
  };
  if (sources.length) where.source = { in: sources };
  if (sentiments.length) where.sentiment = { is: { label: { in: sentiments } } };
  const terms = (q || "").trim().split(/\s+/).filter(Boolean);
  if (terms.length){ where.AND = terms.map(t => ({ text: { contains: t.replace(/\"/g, ""), mode: "insensitive" }})); }
  const [total, rows] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page-1)*size, take: Number(size), include: { sentiment: true } })
  ]);
  return { total, rows };
}
export async function summaryMetrics(params){
  const { rows } = await searchPosts({ ...params, page:1, size: 100000 });
  const total = rows.length;
  const pos = rows.filter(r => r.sentiment?.label === "positive").length;
  const neg = rows.filter(r => r.sentiment?.label === "negative").length;
  const neu = total - pos - neg;
  const engagement = rows.reduce((a,r)=> a + r.likeCount + r.commentCount + r.shareCount, 0);
  return { totalPosts: total, sentimentPosPct: total ? Math.round((pos/total)*100) : 0, sentimentNegPct: total ? Math.round((neg/total)*100) : 0, engagement, breakdown: { positive: pos, negative: neg, neutral: neu } };
}
export async function trendMetrics(params){
  const { rows } = await searchPosts({ ...params, page:1, size:100000 });
  const map = {}; rows.forEach(r=>{ const k = dayjs(r.createdAt).format("YYYY-MM-DD"); map[k] ||= { date:k, positive:0, negative:0, neutral:0, total:0 }; const lab = r.sentiment?.label || "neutral"; map[k][lab] += 1; map[k].total += 1; });
  return Object.values(map).sort((a,b)=> a.date.localeCompare(b.date));
}
export async function platformMetrics(params){
  const { rows } = await searchPosts({ ...params, page:1, size:100000 });
  const map = {}; rows.forEach(r => { map[r.source] = (map[r.source]||0)+1; });
  return Object.entries(map).map(([platform, count]) => ({ platform, count }));
}
export async function keywordsSeries({ keywords = [], ...params }){
  if (!keywords.length) return []; const { rows } = await searchPosts({ ...params, page:1, size:100000 });
  const series = {}; keywords.forEach(k => series[k] = {});
  rows.forEach(r => { const kdate = dayjs(r.createdAt).format("YYYY-MM-DD"); const text = r.text.toLowerCase(); keywords.forEach(k => { const regex = new RegExp(`\\b${k.toLowerCase()}\\b`, "g"); const c = (text.match(regex) || []).length; if (c>0){ series[k][kdate] = (series[k][kdate]||0) + c; } }); });
  return Object.entries(series).map(([kw, days]) => ({ keyword: kw, points: Object.entries(days).sort((a,b)=> a[0].localeCompare(b[0])).map(([date,count])=>({date, count})) }));
}
export async function topList({ type="authors", limit=10, ...params }){
  const { rows } = await searchPosts({ ...params, page:1, size:100000 });
  const map = {};
  if (type === "authors"){ rows.forEach(r => { const k=r.author || "unknown"; map[k]=(map[k]||0)+1; }); }
  else if (type === "hashtags"){ rows.forEach(r=>{ (r.text.match(/#[a-z0-9_]+/gi)||[]).forEach(h=> map[h.toLowerCase()] = (map[h.toLowerCase()]||0)+1); }); }
  else { rows.forEach(r=>{ (r.text.toLowerCase().match(/[a-z0-9_]+/g)||[]).forEach(w=>{ if (w.length>=4) map[w] = (map[w]||0)+1; }); }); }
  return Object.entries(map).sort((a,b)=> b[1]-a[1]).slice(0, Number(limit)).map(([item,count])=>({ item, count }));
}
