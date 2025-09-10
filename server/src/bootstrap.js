
import { prisma } from "./db.js";
import { hashPassword } from "./auth.js";
export async function ensureAdmin(){
  const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD, name = process.env.ADMIN_NAME || "Admin";
  if (!email || !password) return;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;
  const passwordHash = await hashPassword(password);
  await prisma.user.create({ data: { email, passwordHash, name, role: "admin" } });
  console.log("Admin user created:", email);
}
