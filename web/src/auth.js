
export function setToken(t){ localStorage.setItem("sw_token", t); }
export function getToken(){ return localStorage.getItem("sw_token"); }
export function clearToken(){ localStorage.removeItem("sw_token"); }
export async function api(path, opts={}){
  const base = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const headers = Object.assign({ "Content-Type":"application/json" }, opts.headers || {});
  const t = getToken(); if (t) headers.Authorization = "Bearer " + t;
  let res = await fetch(base + path, Object.assign({}, opts, { headers, credentials: "include" }));
  if (res.status === 401){
    const r = await fetch(base + "/api/auth/refresh", { method: "POST", headers, credentials: "include" });
    if (r.ok){ const data = await r.json(); if (data.token){ setToken(data.token); headers.Authorization = "Bearer " + data.token; } res = await fetch(base + path, Object.assign({}, opts, { headers, credentials: "include" })); }
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
