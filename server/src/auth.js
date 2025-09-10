
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { prisma } from "./db.js";
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const ACCESS_TTL_MIN = Number(process.env.ACCESS_TTL_MIN || 15);
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TTL_DAYS || 30);
export async function hashPassword(pw){ const salt = await bcrypt.genSalt(10); return bcrypt.hash(pw, salt); }
export async function comparePassword(pw, hash){ return bcrypt.compare(pw, hash); }
export function signAccess(user){ return jwt.sign({ sub:user.id, role:user.role, email:user.email }, JWT_SECRET, { expiresIn: `${ACCESS_TTL_MIN}m` }); }
function randomHex(bytes=32){ return [...crypto.getRandomValues(new Uint8Array(bytes))].map(b=>b.toString(16).padStart(2,"0")).join(""); }
export async function issueRefresh(userId){ const token = randomHex(); const tokenHash = await bcrypt.hash(token, 10); const expiresAt = new Date(Date.now()+REFRESH_TTL_DAYS*864e5); await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } }); return token; }
export async function rotateRefresh(oldToken, userId){ if (!oldToken) return null; const rt = await prisma.refreshToken.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }); if (!rt) return null; const ok = await bcrypt.compare(oldToken, rt.tokenHash); if (!ok || rt.revokedAt || rt.expiresAt < new Date()) return null; const newToken = await issueRefresh(userId); await prisma.refreshToken.update({ where: { id: rt.id }, data: { revokedAt: new Date(), replacedByToken: newToken } }); return newToken; }
export async function authenticate(req, res, next){ const header = req.headers.authorization || ""; const token = header.startsWith("Bearer ") ? header.slice(7) : null; if (!token) return res.status(401).json({ error: "Unauthorized" }); try { const payload = jwt.verify(token, JWT_SECRET); const user = await prisma.user.findUnique({ where: { id: payload.sub }}); if (!user) return res.status(401).json({ error: "Unauthorized" }); req.user = user; next(); } catch { return res.status(401).json({ error: "Invalid token" }); } }
export function authorize(roles=[]){ if (typeof roles==="string") roles=[roles]; return (req,res,next)=>{ if (!req.user) return res.status(401).json({ error: "Unauthorized" }); if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" }); next(); }; }
export function setRefreshCookie(res, token){ const isProd = process.env.NODE_ENV === "production"; res.cookie("sw_refresh", token, { httpOnly:true, secure:isProd, sameSite:"lax", path:"/api/auth/refresh", maxAge: REFRESH_TTL_DAYS*864e5 }); }
export function clearRefreshCookie(res){ res.clearCookie("sw_refresh", { path:"/api/auth/refresh" }); }
