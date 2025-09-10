
import axios from "axios";
export async function fetchXRecent({ bearerToken, query, maxResults=20 }){
  if (!bearerToken || !query) return [];
  try {
    const { data } = await axios.get("https://api.x.com/2/tweets/search/recent", {
      params: { query, max_results: Math.min(maxResults, 100), "tweet.fields": "created_at,public_metrics,lang" },
      headers: { Authorization: `Bearer ${bearerToken}` }
    });
    const out = [];
    for (const t of (data.data || [])){
      out.push({ source: "twitter", text: t.text || "", author: null, createdAt: t.created_at, url: `https://x.com/i/web/status/${t.id}`, metrics: { likes: t.public_metrics?.like_count || 0, comments: t.public_metrics?.reply_count || 0, shares: t.public_metrics?.retweet_count || 0 }, lang: t.lang });
    }
    return out;
  } catch (e) { console.log("X fetch error:", e.response?.data || e.message); return []; }
}
