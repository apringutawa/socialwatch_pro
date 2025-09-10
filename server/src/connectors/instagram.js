
import axios from "axios";
const GRAPH = "https://graph.facebook.com/v20.0";
export async function fetchInstagramHashtagRecent({ hashtags, userToken, businessId, limit=20 }){
  if (!userToken || !businessId || !hashtags?.length) return [];
  const all = [];
  for (const tag of hashtags){
    try {
      const { data: h } = await axios.get(`${GRAPH}/ig_hashtag_search`, { params: { user_id: businessId, q: tag, access_token: userToken } });
      const hashtagId = h?.data?.[0]?.id; if (!hashtagId) continue;
      const { data: m } = await axios.get(`${GRAPH}/${hashtagId}/recent_media`, { params: { user_id: businessId, fields: "caption,timestamp,permalink,like_count,comments_count", access_token: userToken, limit } });
      for (const item of (m.data || [])){
        all.push({ source: "instagram", text: item.caption || "", author: null, createdAt: item.timestamp, url: item.permalink, metrics: { likes: item.like_count||0, comments: item.comments_count||0, shares: 0 } });
      }
    } catch (e) { console.log("IG fetch error:", e.response?.data || e.message); }
  }
  return all;
}
