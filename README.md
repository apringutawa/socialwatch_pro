
# SocialWatch Pro — JWT+Refresh+RBAC • Advanced Search • IG/FB/X • Alerts

## Quick Start (Docker)
```bash
cp .env.example .env
# Edit .env: JWT_SECRET, ADMIN_EMAIL/PASSWORD, kredensial IG/FB/X, SMTP/Slack jika pakai alerts
docker compose up -d --build
```
Akses: Web `http://localhost:5173`, API `http://localhost:4000`, OS Dashboards (opsional) `http://localhost:5601`  
Login awal: `ADMIN_EMAIL` / `ADMIN_PASSWORD` dari `.env`.
