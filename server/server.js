
import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { prisma } from "./src/db.js";
import { searchPosts, summaryMetrics, trendMetrics, platformMetrics, keywordsSeries, topList } from "./src/queries.js";
import { authenticate, authorize, hashPassword, comparePassword, signAccess, issueRefresh, rotateRefresh, setRefreshCookie, clearRefreshCookie } from "./src/auth.js";
import { ensureAdmin } from "./src/bootstrap.js";
import { ensureIndex } from "./src/os.js";
import { osSearch, osMetrics } from "./src/os_routes.js";
import { evaluateRule } from "./src/alerts.js";

dotenv.config();
const app = express();
const ORIGIN = process.env.WEB_ORIGIN || "http://localhost:5173";
app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

const PORT = process.env.PORT || 4000;
await ensureAdmin();
await ensureIndex();

// ---- Auth ----
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email & password required" });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  const access = signAccess(user);
  const refresh = await issueRefresh(user.id);
  setRefreshCookie(res, refresh);
  res.json({ token: access, user: { id:user.id, email:user.email, role:user.role, name:user.name } });
});

app.post("/api/auth/refresh", async (req, res) => {
  const old = req.cookies["sw_refresh"];
  if (!old) return res.status(401).json({ error: "no refresh" });
  const header = req.headers.authorization || "";
  let userId = null;
  if (header.startsWith("Bearer ")){
    try { userId = JSON.parse(Buffer.from(header.slice(7).split('.')[1], 'base64').toString()).sub; } catch {}
  }
  if (!userId) return res.status(401).json({ error: "no user" });
  const newTok = await rotateRefresh(old, userId);
  if (!newTok) return res.status(401).json({ error: "refresh invalid" });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const access = signAccess(user);
  setRefreshCookie(res, newTok);
  res.json({ token: access });
});

app.post("/api/auth/logout", authenticate, async (req, res) => {
  clearRefreshCookie(res);
  await prisma.refreshToken.updateMany({ where: { userId: req.user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  res.json({ ok: true });
});

app.post("/api/auth/register", authenticate, authorize(["admin"]), async (req, res) => {
  const { email, password, role="viewer", name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email & password required" });
  const passwordHash = await hashPassword(password);
  const created = await prisma.user.create({ data: { email, passwordHash, role, name } });
  res.json({ id: created.id, email: created.email, role: created.role, name: created.name });
});

// ---- Search & Metrics ----
app.get("/api/search", authenticate, authorize(["viewer","analyst","admin"]), async (req, res) => {
  const { q, from, to, page = 1, size = 50 } = req.query;
  const sources   = [].concat(req.query.source || req.query.platform || []).filter(Boolean);
  const sentiments= [].concat(req.query.sentiment || []).filter(Boolean);
  const data = await searchPosts({ q, from, to, sources, sentiments, page: Number(page), size: Number(size) });
  res.json(data);
});
app.get("/api/metrics/summary", authenticate, authorize(["viewer","analyst","admin"]), async (req, res) => {
  const { q, from, to } = req.query;
  const sources   = [].concat(req.query.source || req.query.platform || []).filter(Boolean);
  const sentiments= [].concat(req.query.sentiment || []).filter(Boolean);
  res.json(await summaryMetrics({ q, from, to, sources, sentiments }));
});
app.get("/api/metrics/trend", authenticate, authorize(["viewer","analyst","admin"]), async (req, res) => {
  const { q, from, to } = req.query;
  const sources   = [].concat(req.query.source || req.query.platform || []).filter(Boolean);
  const sentiments= [].concat(req.query.sentiment || []).filter(Boolean);
  res.json({ trend: await trendMetrics({ q, from, to, sources, sentiments }) });
});
app.get("/api/metrics/platform", authenticate, authorize(["viewer","analyst","admin"]), async (req, res) => {
  const { q, from, to } = req.query;
  const sources   = [].concat(req.query.source || req.query.platform || []).filter(Boolean);
  const sentiments= [].concat(req.query.sentiment || []).filter(Boolean);
  res.json({ platform: await platformMetrics({ q, from, to, sources, sentiments }) });
});
app.get("/api/metrics/keywords", authenticate, authorize(["viewer","analyst","admin"]), async (req, res) => {
  const { q, from, to, keywords = [] } = req.query;
  const keys = [].concat(keywords).filter(Boolean);
  const sources   = [].concat(req.query.source || req.query.platform || []).filter(Boolean);
  const sentiments= [].concat(req.query.sentiment || []).filter(Boolean);
  res.json({ series: await keywordsSeries({ q, from, to, keywords: keys, sources, sentiments }) });
});
app.get("/api/top", authenticate, authorize(["viewer","analyst","admin"]), async (req, res) => {
  const { q, from, to, type="authors", limit=10 } = req.query;
  const sources   = [].concat(req.query.source || req.query.platform || []).filter(Boolean);
  const sentiments= [].concat(req.query.sentiment || []).filter(Boolean);
  res.json({ items: await topList({ q, from, to, type, limit, sources, sentiments }) });
});

// ---- OpenSearch ----
app.get("/api/os/search", authenticate, authorize(["viewer","analyst","admin"]), osSearch);
app.get("/api/os/metrics", authenticate, authorize(["viewer","analyst","admin"]), osMetrics);

// ---- Sources CRUD (Admin) ----
app.get("/api/sources", authenticate, authorize(["admin"]), async (req, res) => {
  res.json(await prisma.sourceConf.findMany({ orderBy: { createdAt: "desc" } }));
});
app.post("/api/sources", authenticate, authorize(["admin"]), async (req, res) => {
  const { type, name, config = {}, active = true } = req.body || {};
  if (!type || !name) return res.status(400).json({ error: "type & name required" });
  const created = await prisma.sourceConf.create({ data: { type, name, config, active } });
  res.json(created);
});
app.put("/api/sources/:id", authenticate, authorize(["admin"]), async (req, res) => {
  const { id } = req.params;
  const { name, config, active } = req.body || {};
  const updated = await prisma.sourceConf.update({ where: { id }, data: { name, config, active } });
  res.json(updated);
});
app.delete("/api/sources/:id", authenticate, authorize(["admin"]), async (req, res) => {
  const { id } = req.params;
  await prisma.sourceConf.delete({ where: { id } });
  res.json({ ok: true });
});

// ---- Alert Rules CRUD (Analyst/Admin) ----
app.get("/api/alerts", authenticate, authorize(["analyst","admin"]), async (req, res) => {
  res.json(await prisma.alertRule.findMany({ orderBy: { createdAt: "desc" } }));
});
app.post("/api/alerts", authenticate, authorize(["analyst","admin"]), async (req, res) => {
  const body = req.body || {};
  const created = await prisma.alertRule.create({ data: {
    name: body.name,
    query: body.query || null,
    sources: body.sources || [],
    sentiment: body.sentiment || null,
    windowMinutes: Number(body.windowMinutes || 60),
    threshold: Number(body.threshold || 20),
    channel: body.channel || "slack",
    target: body.target || null,
    active: body.active !== false,
    createdById: req.user.id
  }});
  res.json(created);
});
app.patch("/api/alerts/:id", authenticate, authorize(["analyst","admin"]), async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const updated = await prisma.alertRule.update({ where: { id }, data: {
    name: body.name,
    query: body.query,
    sources: body.sources,
    sentiment: body.sentiment,
    windowMinutes: body.windowMinutes,
    threshold: body.threshold,
    channel: body.channel,
    target: body.target,
    active: body.active
  }});
  res.json(updated);
});
app.delete("/api/alerts/:id", authenticate, authorize(["analyst","admin"]), async (req, res) => {
  const { id } = req.params;
  await prisma.alertRule.delete({ where: { id } });
  res.json({ ok: true });
});
app.post("/api/alerts/test/:id", authenticate, authorize(["analyst","admin"]), async (req, res) => {
  const { id } = req.params;
  const rule = await prisma.alertRule.findUnique({ where: { id } });
  if (!rule) return res.status(404).json({ error: "not found" });
  await evaluateRule(rule);
  res.json({ ok: true });
});

// Health
app.get("/api/health", (req,res)=> res.json({ ok:true }));

app.listen(PORT, () => console.log(`API running on http://0.0.0.0:${PORT}`));
