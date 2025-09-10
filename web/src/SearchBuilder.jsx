
import React, { useState } from "react";
export default function SearchBuilder({ onQuery }){
  const [must, setMust] = useState("");
  const [should, setShould] = useState("");
  const [notq, setNotq] = useState("");
  const build = () => {
    const m = must.split(",").map(s=>s.trim()).filter(Boolean).map(w=>`"${w}"`);
    const s = should.split(",").map(s=>s.trim()).filter(Boolean).map(w=>`"${w}"`);
    const n = notq.split(",").map(s=>s.trim()).filter(Boolean).map(w=>`-"${w}"`);
    const parts = []; if (m.length) parts.push(m.join(" AND ")); if (s.length) parts.push("(" + s.join(" OR ") + ")"); if (n.length) parts.push(n.join(" "));
    onQuery(parts.filter(Boolean).join(" AND "));
  };
  return (
    <div style={{background:"#0f172a", border:"1px solid #334155", borderRadius:12, padding:12, color:"#cbd5e1"}}>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12}}>
        <div><label style={{fontSize:12, color:"#94a3b8"}}>Must include</label><input value={must} onChange={e=>setMust(e.target.value)} placeholder="iphone,promo" style={{width:"100%", padding:8, background:"#111827", color:"#e5e7eb", border:"1px solid #334155", borderRadius:8}}/></div>
        <div><label style={{fontSize:12, color:"#94a3b8"}}>Should include (OR)</label><input value={should} onChange={e=>setShould(e.target.value)} placeholder="garansi,diskon" style={{width:"100%", padding:8, background:"#111827", color:"#e5e7eb", border:"1px solid #334155", borderRadius:8}}/></div>
        <div><label style={{fontSize:12, color:"#94a3b8"}}>Must NOT include</label><input value={notq} onChange={e=>setNotq(e.target.value)} placeholder="giveaway,spam" style={{width:"100%", padding:8, background:"#111827", color:"#e5e7eb", border:"1px solid #334155", borderRadius:8}}/></div>
      </div>
      <div style={{marginTop:10, display:"flex", gap:8}}><button onClick={build} style={{padding:"8px 12px", background:"#4f46e5", color:"#fff", border:"none", borderRadius:8, cursor:"pointer"}}>Buat Query</button></div>
    </div>
  );
}
