
import { Client } from "@opensearch-project/opensearch";
let client = null;
export function getClient(){
  if (!client && process.env.OPENSEARCH_URL){
    client = new Client({ node: process.env.OPENSEARCH_URL });
  }
  return client;
}
export async function ensureIndex(){
  const os = getClient();
  if (!os) return;
  await os.indices.putIndexTemplate({
    name: "posts-template",
    body: {
      index_patterns: ["posts-*"],
      template: {
        settings: { number_of_shards: 1 },
        mappings: {
          properties: {
            source:      { type: "keyword" },
            author:      { type: "keyword" },
            text:        { type: "text" },
            lang:        { type: "keyword" },
            created_at:  { type: "date" },
            sentiment:   { type: "keyword" },
            like_count:  { type: "integer" },
            comment_count:{ type: "integer" },
            share_count: { type: "integer" },
            url:         { type: "keyword", index: false }
          }
        }
      }
    }
  });
}
