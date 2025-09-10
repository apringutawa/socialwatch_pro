
import { getClient } from "./os.js";
export async function osSearch(req, res){
  const os = getClient();
  if (!os) return res.status(503).json({ error: "OpenSearch not enabled" });
  const { q, from, to, page=1, size=50 } = req.query;
  const sources   = [].concat(req.query.source || req.query.platform || []).filter(Boolean);
  const sentiments= [].concat(req.query.sentiment || []).filter(Boolean);
  const must = [];
  if (from || to) must.push({ range: { created_at: { gte: from, lte: to } } });
  if (sources.length) must.push({ terms: { source: sources }});
  if (sentiments.length) must.push({ terms: { sentiment: sentiments }});
  const query = q
    ? { bool: { must: [...must, { query_string: { query: q, default_field: "text" } }] } }
    : { bool: { must } };
  const resp = await os.search({
    index: "posts-*",
    from: (page-1)*size,
    size: Number(size),
    body: { query, sort: [{ created_at: "desc" }] }
  });
  res.json({
    total: resp.hits.total.value,
    page: Number(page),
    size: Number(size),
    rows: resp.hits.hits.map(h => ({ id:h._id, ...h._source }))
  });
}
export async function osMetrics(req, res){
  const os = getClient();
  if (!os) return res.status(503).json({ error: "OpenSearch not enabled" });
  const { q, from, to, interval="1d" } = req.query;
  const sources   = [].concat(req.query.source || req.query.platform || []).filter(Boolean);
  const sentiments= [].concat(req.query.sentiment || []).filter(Boolean);
  const must = [];
  if (from || to) must.push({ range: { created_at: { gte: from, lte: to } } });
  if (sources.length) must.push({ terms: { source: sources }});
  if (sentiments.length) must.push({ terms: { sentiment: sentiments }});
  const query = q
    ? { bool: { must: [...must, { query_string: { query: q, default_field: "text" } }] } }
    : { bool: { must } };
  const resp = await os.search({
    index: "posts-*",
    size: 0,
    body: {
      query,
      aggs: {
        trend: {
          date_histogram: { field: "created_at", calendar_interval: interval, min_doc_count: 0 },
          aggs: { by_sent: { terms: { field: "sentiment" } } }
        },
        platform: { terms: { field: "source" } }
      }
    }
  });
  const trend = resp.aggregations.trend.buckets.map(b => {
    const x = { date: b.key_as_string, positive:0, negative:0, neutral:0, total:b.doc_count };
    b.by_sent.buckets.forEach(s => x[s.key] = s.doc_count);
    return x;
  });
  const platform = resp.aggregations.platform.buckets.map(p=>({ platform:p.key, count:p.doc_count }));
  res.json({ trend, platform });
}
