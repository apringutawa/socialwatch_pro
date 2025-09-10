
import React, { useEffect, useState } from "react";
import { api } from "./auth.js";
function Section({ title, children }){ return <div style={{background:"#0f172a", border:"1px solid #334155", borderRadius:12, padding:16, marginBottom:16}}><h3 style={{color:"#e5e7eb", marginTop:0}}>{title}</h3>{children}</div>; }
export default function Admin(){
  const [sources,setSources] = useState([]); const [alerts,setAlerts] = useState([]);
  const load = async ()=>{ try { setSources(await api("/api/sources")); } catch {} try { setAlerts(await api("/api/alerts")); } catch {} };
  useEffect(()=>{ load(); },[]);
  const addSource = async (e)=>{ e.preventDefault(); const form = new FormData(e.target); const payload = { type: form.get("type"), name: form.get("name"), config: JSON.parse(form.get("config")||"{}"), active: form.get("active")==="on" }; await api("/api/sources",{ method:"POST", body: JSON.stringify(payload)}); e.target.reset(); load(); };
  const addAlert = async (e)=>{ e.preventDefault(); const form = new FormData(e.target); const payload = { name: form.get("name"), query: form.get("query"), sources: form.get("sources")?.split(",").map(s=>s.trim()).filter(Boolean), sentiment: form.get("sentiment") || null, windowMinutes: Number(form.get("windowMinutes")||60), threshold: Number(form.get("threshold")||20), channel: form.get("channel"), target: form.get("target") || null, active: form.get("active")==="on" }; await api("/api/alerts",{ method:"POST", body: JSON.stringify(payload)}); e.target.reset(); load(); };
  return (
    <div>
      <Section title="Sources (Admin)">
        <form onSubmit={addSource} style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8}}>
          <select name="type" required style={{padding:8, background:"#111827", color:"#e5e7eb", border:"1px solid #334155", borderRadius:8}}><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="twitter">Twitter (X)</option></select>
          <input name="name" placeholder="Nama" required style={{padding:8, background:"#111827", color:"#e5e7eb", border:"1px solid #334155", borderRadius:8}}/>
          <input name="config" placeholder='JSON config (mis: {"userToken":"...","businessId":"...","hashtags":["iphone"]})' style={{padding:8, background:"#111827", color:"#e5e7eb", border:"1px solid #334155", borderRadius:8}}/>
          <label style={{display:"flex", alignItems:"center", gap:6, color:"#e5e7eb"}}><input type="checkbox" name="active" defaultChecked/>Aktif</label>
          <button type="submit" style={{gridColumn:"span 4", padding:10, background:"#4f46e5", color:"#fff", border:"none", borderRadius:8, marginTop:6}}>Tambah</button>
        </form>
        <ul>{sources.map(s=> <li key={s.id} style={{color:"#cbd5e1"}}>{s.type} — <b>{s.name}</b> — aktif: {String(s.active)}</li>)}</ul>
      </Section>
      <Section title="Alert Rules (Analyst/Admin)">
        <form onSubmit={addAlert} style={{display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:8}}>
          <input name="name" placeholder="Nama" required style={{gridColumn:"span 2", padding:8, background:"#111827", color:"#e5e7eb", border:"1px solid #334155", borderRadius:8}}/>
          <input name="query" placeholder='Query (boleh kosong)' style={{gridColumn:"span 2", padding:8, background:"#111827", color:"#e5e7eb", border:"1px solid #334155", borderRadius:8}}/>
          <input name="sources" placeholder="Sumber (comma, ex: instagram,twitter)" style={{gridColumn:"span 2", padding:8, background:"#111827", color:"#e5e7eb", border:"1px solid #334155", borderRadius:8}}/>
          <select name="sentiment" style={{padding:8, background:"#111827", color:"#e5e7eb", border:"1px solid #334155", borderRadius:8}}><option value="">(apa saja)</option><option value="positive">positive</option><option value="negative">negative</option><option value="neutral">neutral</option></select>
          <input name="windowMinutes" type="number" placeholder="Window (m)" defaultValue="60" style={{padding:8, background:"#111827", color:"#e5e7eb", border:"1px solid #334155", borderRadius:8}}/>
          <input name="threshold" type="number" placeholder="Ambang" defaultValue="20" style={{padding:8, background:"#111827", color:"#e5e7eb", border:"1px solid #334155", borderRadius:8}}/>
          <select name="channel" style={{padding:8, background:"#111827", color:"#e5e7eb", border:"1px solid #334155", borderRadius:8}}><option value="slack">Slack</option><option value="email">Email</option></select>
          <input name="target" placeholder="Webhook Slack / Email" style={{gridColumn:"span 2", padding:8, background:"#111827", color:"#e5e7eb", border:"1px solid #334155", borderRadius:8}}/>
          <label style={{display:"flex", alignItems:"center", gap:6, color:"#e5e7eb"}}><input type="checkbox" name="active" defaultChecked/>Aktif</label>
          <button type="submit" style={{gridColumn:"span 6", padding:10, background:"#4f46e5", color:"#fff", border:"none", borderRadius:8}}>Tambah Rule</button>
        </form>
        <ul>{alerts.map(a=> <li key={a.id} style={{color:"#cbd5e1"}}>{a.name} — src:{(a.sources||[]).join(",")} — win:{a.windowMinutes}m — th:{a.threshold} — {a.channel}</li>)}</ul>
      </Section>
    </div>
  );
}
