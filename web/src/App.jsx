
import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Legend } from "recharts";
import { api, setToken, getToken, clearToken } from "./auth.js";
import SearchBuilder from "./SearchBuilder.jsx";
import Admin from "./Admin.jsx";

const Card = ({ title, right, children }) => (
  <div style={{background:"#11182799", border:"1px solid #334155", borderRadius:16, padding:20, boxShadow:"0 6px 24px rgba(0,0,0,.3)"}}>
    <div style={{display:"flex", justifyContent:"space-between", marginBottom:12}}>
      <h3 style={{color:"#e5e7eb", fontWeight:600}}>{title}</h3>{right}
    </div>
    {children}
  </div>
);

function Login({ onLogged }){
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:4000";
      const res = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ email, password }), credentials:"include" });
      if (!res.ok) throw new Error();
      const { token } = await res.json();
      setToken(token);
      onLogged();
    } catch {
      setErr("Login gagal");
    }
  };

  return (
    <div style={{minHeight:"100vh", display:"grid", placeItems:"center", background:"#0b1220"}}>
      <form onSubmit={submit} style={{width:360, background:"#0f172a", border:"1px solid #334155", borderRadius:12, padding:20}}>
        <h2 style={{color:"#fff", marginTop:0}}>Login SocialWatch</h2>
        {err && <div style={{color:"#ef4444", marginBottom:8}}>{err}</div>}
        <div style={{marginBottom:10}}>
          <label style={{fontSize:12, color:"#94a3b8"}}>Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required style={{width:"100%", padding:10, background:"#111827", color:"#e5e7eb", border:"1px solid #334155", borderRadius:8}}/>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:12, color:"#94a3b8"}}>Password</label>
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" required style={{width:"100%", padding:10, background:"#111827", color:"#e5e7eb", border:"1px solid #334155", borderRadius:8}}/>
        </div>
        <button type="submit" style={{width:"100%", padding:10, background:"#4f46e5", color:"#fff", border:"none", borderRadius:8, cursor:"pointer"}}>Masuk</button>
      </form>
    </div>
  );
}

export default function App(){
  const [range, setRange] = useState("7d");
  const [platform, setPlatform] = useState("All");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalPosts:0, sentimentPosPct:0, sentimentNegPct:0, engagement:0 });
  const [trend, setTrend] = useState([]);
  const [platformDist, setPlatformDist] = useState([]);
  const [query, setQuery] = useState("");
  const [authed, setAuthed] = useState(!!getToken());
  const [tab, setTab] = useState("dashboard");

  const fromISO = () => { const days = range==="7d"?7:range==="30d"?30:14; const d = new Date(Date.now()-days*86400000); return d.toISOString(); };
  const toISO = () => new Date().toISOString();

  useEffect(() => {
    if (!authed || tab!=="dashboard") return;
    setLoading(true);
    const params = new URLSearchParams({ from: fromISO(), to: toISO(), ...(platform!=="All" ? { platform: platform.toLowerCase() } : {}), ...(query ? { q: query } : {}) });
    Promise.all([ api(`/api/metrics/summary?`+params.toString()), api(`/api/metrics/trend?`+params.toString()), api(`/api/metrics/platform?`+params.toString()) ])
      .then(([s, t, p])=>{ setSummary(s); setTrend((t.trend||[]).map(d=>({ ...d, date: new Date(d.date).toLocaleDateString("id-ID", {day:"2-digit", month:"short"}) }))); setPlatformDist((p.platform||[]).map(x=>({ ...x, platform: x.platform[0].toUpperCase()+x.platform.slice(1)}))); setLoading(false); })
      .catch(()=> setLoading(false));
  }, [authed, range, platform, query, tab]);

  if (!authed) return <Login onLogged={()=>setAuthed(true)} />;

  return (
    <div style={{minHeight:"100vh", background:"#0b1220", color:"#cbd5e1"}}>
      <div style={{maxWidth:1100, margin:"0 auto", padding:"32px 24px"}}>
        <div style={{display:"flex", justifyContent:"space-between", marginBottom:24, alignItems:"center"}}>
          <div><h1 style={{fontSize:40, color:"#fff", fontWeight:800, margin:0}}>SocialWatch Pro</h1><p style={{marginTop:6, color:"#94a3b8"}}>Monitoring sentiment media sosial real-time</p></div>
          <div style={{display:"flex", gap:12}}>
            <button onClick={()=>setTab("dashboard")} style={{padding:"8px 12px", background: tab==="dashboard"?"#4f46e5":"#111827", color:"#fff", border:"none", borderRadius:8}}>Dashboard</button>
            <button onClick={()=>setTab("admin")} style={{padding:"8px 12px", background: tab==="admin"?"#4f46e5":"#111827", color:"#fff", border:"none", borderRadius:8}}>Admin</button>
            <button onClick={()=>{ clearToken(); location.reload(); }} style={{padding:"8px 12px", background:"#ef4444", color:"#fff", border:"none", borderRadius:8}}>Logout</button>
          </div>
        </div>

        {tab==="admin" ? <Admin /> : (<>
          <div style={{display:"flex", gap:12, marginBottom:16}}>
            <select value={range} onChange={(e)=>setRange(e.target.value)} style={{padding:"8px 12px", borderRadius:12, background:"#111827", color:"#e5e7eb", border:"1px solid #334155"}}>
              <option value="7d">7 Hari</option><option value="14d">14 Hari</option><option value="30d">30 Hari</option>
            </select>
            <div style={{display:"inline-flex", border:"1px solid #334155", borderRadius:12, overflow:"hidden"}}>
              {["All","Instagram","Facebook","Twitter"].map(p=>(
                <button key={p} onClick={()=>setPlatform(p)} style={{padding:"8px 14px", background: platform===p?"#4f46e5":"#111827", color: platform===p?"#fff":"#cbd5e1", border:"none", cursor:"pointer"}}>
                  {p==="All"?"Semua":p}
                </button>
              ))}
            </div>
          </div>

          <div style={{marginBottom:16}}><SearchBuilder onQuery={setQuery} /></div>

          <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:20, marginBottom:20}}>
            <Card title="Total Posts" right={<span style={{fontSize:12,color:"#9ca3af"}}>{loading?"…":"+12%"}</span>}><div style={{fontSize:36, fontWeight:800, color:"#fff"}}>{loading?"…":summary.totalPosts}</div></Card>
            <Card title="Sentiment Positif" right={<span style={{fontSize:12,color:"#22c55e"}}>{loading?"…":"↑"}</span>}><div style={{fontSize:36, fontWeight:800, color:"#22c55e"}}>{loading?"…":`${summary.sentimentPosPct}%`}</div><p style={{fontSize:12,color:"#94a3b8", marginTop:6}}>dari total periode</p></Card>
            <Card title="Sentiment Negatif" right={<span style={{fontSize:12,color:"#ef4444"}}>{loading?"…":"↓"}</span>}><div style={{fontSize:36, fontWeight:800, color:"#ef4444"}}>{loading?"…":`${summary.sentimentNegPct}%`}</div><p style={{fontSize:12,color:"#94a3b8", marginTop:6}}>dari total periode</p></Card>
            <Card title="Total Engagement" right={<span style={{fontSize:12,color:"#d946ef"}}>{loading?"…":"+8%"}</span>}><div style={{fontSize:36, fontWeight:800, color:"#fff"}}>{loading?"…":summary.engagement}</div></Card>
          </div>

          <div style={{display:"grid", gridTemplateColumns:"2fr 1fr", gap:20}}>
            <Card title="Tren Sentiment Harian">
              <div style={{height:300}}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{left:8, right:8, top:10, bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#243244" />
                    <XAxis dataKey="date" stroke="#99A2B3" />
                    <YAxis stroke="#99A2B3" />
                    <Tooltip contentStyle={{ background:"#0F172A", border:"1px solid #334155", borderRadius:12, color:"white"}} />
                    <Legend />
                    <Line type="monotone" dataKey="positive" name="Positif" dot={false} stroke="#22c55e" strokeWidth={2}/>
                    <Line type="monotone" dataKey="negative" name="Negatif" dot={false} stroke="#ef4444" strokeWidth={2}/>
                    <Line type="monotone" dataKey="neutral"  name="Netral"  dot={false} stroke="#94a3b8" strokeWidth={2}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Distribusi Platform">
              <div style={{height:300}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformDist} margin={{ left:8, right:8, top:10, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#243244" />
                    <XAxis dataKey="platform" stroke="#99A2B3" />
                    <YAxis stroke="#99A2B3" />
                    <Tooltip contentStyle={{ background:"#0F172A", border:"1px solid #334155", borderRadius:12, color:"white"}} />
                    <Bar dataKey="count" name="Posts" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>)}

        <div style={{fontSize:12, color:"#64748b", marginTop:20}}>Pro build • JWT+refresh • Alerts • Sources • Query: {query || "(kosong)"} </div>
      </div>
    </div>
  );
}
