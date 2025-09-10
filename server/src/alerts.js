
import nodemailer from "nodemailer";
import axios from "axios";
import { searchPosts } from "./queries.js";
export async function evaluateRule(rule){
  const to = new Date(); const from = new Date(Date.now() - rule.windowMinutes*60*1000);
  const { rows } = await searchPosts({ q: rule.query, from, to, sources: (rule.sources||[]), sentiments: rule.sentiment ? [rule.sentiment] : [], page:1, size: 100000 });
  const count = rows.length;
  if (count >= rule.threshold){ await notify(rule, count); }
}
async function notify(rule, count){
  if (rule.channel === "slack"){ const url = process.env.SLACK_WEBHOOK_URL || rule.target; if (!url) return; await axios.post(url, { text: `:rotating_light: Alert *${rule.name}* fired! Count=${count} (window ${rule.windowMinutes}m)` }); }
  else { const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT||587), secure: String(process.env.SMTP_SECURE||"false")==="true", auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined }); await transport.sendMail({ from: process.env.ALERT_FROM || "alerts@example.com", to: rule.target || process.env.SMTP_USER, subject: `[SocialWatch] Alert ${rule.name}`, text: `Rule ${rule.name} fired with count=${count} in last ${rule.windowMinutes} minutes.` }); }
}
