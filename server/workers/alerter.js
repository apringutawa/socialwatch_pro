
import "dotenv/config";
import { prisma } from "../src/db.js";
import { evaluateRule } from "../src/alerts.js";
async function run(){ const rules = await prisma.alertRule.findMany({ where:{ active:true } }); for (const r of rules){ try { await evaluateRule(r); } catch (e) { console.log("alert rule error:", r.id, e.message); } } }
async function loop(){ await run(); setTimeout(loop, 300_000); }
console.log("Alerter worker up"); loop();
