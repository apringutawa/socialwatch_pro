
import axios from "axios";
const GRAPH = "https://graph.facebook.com/v20.0";
export async function fetchFacebookPages({ pageTokens, limit=20 }){
  const out = [];
  for (const pair of pageTokens||[]){
    const [pageId, token] = (pair||"").split(":"); if (!pageId || !token) continue;
    try {
      const { data } = await axios.get(`${GRAPH}/${pageId}/posts`, { params: { fields: "message,created_time,permalink_url", access_token: token, limit } });
      for (const p of (data.data || [])){
        out.push({ source: "facebook", text: p.message || "", author: pageId, createdAt: p.created_time, url: p.permalink_url, metrics: { likes: 0, comments: 0, shares: 0 } });
      }
    } catch (e) { console.log("FB fetch error:", e.response?.data || e.message); }
  }
  return out;
}
