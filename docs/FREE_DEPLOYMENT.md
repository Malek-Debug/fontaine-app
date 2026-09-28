# Fontaine — Free Cloud Deployment Guide

Deploy Fontaine at **$0/month** using Render (hosting) and Neon (PostgreSQL).

## Architecture

| Component | Service | Free Tier |
|-----------|---------|-----------|
| Web server | Render Free | 750h/month, Docker, WebSockets |
| Database | Neon Free PostgreSQL | 0.5 GB, permanent, no credit card |
| AI | Mock provider | Realistic test data (Ollama local only) |
| Real-time | Socket.IO | WebSocket on same server |

## Why These Services

**Render** is the only free platform that supports custom Node.js servers + WebSockets + Docker without a credit card. Vercel cannot run custom servers. Fly.io requires a credit card. Railway is not truly free.

**Neon** is chosen over Render's built-in PostgreSQL because **Render Free PostgreSQL expires and is deleted 30+14 days after creation**. Neon's free tier is permanent, never deletes data, and requires no credit card.

## Free-Tier Limitations (Verified September 2026)

### Render Free Web Service
- **Cost:** $0/month
- **Credit card:** Not required
- **RAM:** 512 MB
- **CPU:** Less than 1 vCPU
- **Hours:** 750 instance hours/month (enough for 31 days continuous)
- **Cold start:** Spins down after 15 minutes of no traffic; takes ~1 minute to spin back up
- **Filesystem:** Ephemeral (lost on redeploy/restart — this is why we use external PostgreSQL)
- **WebSockets:** Supported (WebSocket messages keep the service awake)
- **Bandwidth:** 100 GB/month outbound (if exceeded without payment method, services are suspended)
- **Auto-billing:** No — without a payment method, Render suspends services instead of charging
- **Expiration:** None — free web services do not expire

### Neon Free PostgreSQL
- **Cost:** $0/month
- **Credit card:** Not required
- **Storage:** 0.5 GB per project
- **Compute:** 100 CU-hours/month (scales to zero after 5 minutes of inactivity)
- **Cold start:** ~1-2 seconds on first query after idle
- **Branches:** 10 per project
- **Expiration:** Permanent — "not a trial" per Neon's pricing page
- **Data deletion:** Never. Exceeding limits blocks writes but does not delete data
- **Auto-billing:** No — Free plan has no billing mechanism

### What Happens If Limits Are Exceeded
- **Render:** Without a payment method, services are suspended until next month. No bill.
- **Neon:** Compute hours exhausted → compute suspends until next billing period. Storage full → writes blocked. No data loss. Upgrade to lift limits.

## Prerequisites

1. A GitHub account (to connect Render)
2. A [Neon](https://neon.com) account (free, no credit card)
3. A [Render](https://render.com) account (free, no credit card)

## Step 1: Create a Neon Database

1. Go to [neon.com](https://neon.com) and sign up
2. Create a new project (name: `fontaine`, region: closest to your users)
3. Copy the connection string — it looks like:
   ```
   postgresql://user:pass@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Save this — you'll need it for both local development and Render

## Step 2: Set Up Local Development

1. Update your `.env` file:
   ```bash
   DATABASE_URL="postgresql://user:pass@ep-xxx.region.neon.tech/neondb?sslmode=require"
   ```

2. Run the database migration:
   ```bash
   npx prisma migrate deploy
   ```

3. Seed the database:
   ```bash
   npx prisma db seed
   ```

4. Verify:
   ```bash
   npx prisma studio
   ```
   Check that User, Class, Student, Skill, Activity tables have data.

5. Start the dev server:
   ```bash
   npm run dev
   ```

6. Ollama AI still works locally — just keep `OLLAMA_URL` and `OLLAMA_MODEL` in your `.env`.

## Step 3: Deploy to Render

### Option A: Render Blueprint (Recommended)
1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **New** → **Blueprint**
4. Connect your repo — Render will read `render.yaml`
5. Set `DATABASE_URL` to your Neon connection string
6. Click **Apply**

### Option B: Manual Setup
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Runtime:** Docker
   - **Plan:** Free
   - **Health Check Path:** `/api/health`
5. Set environment variables:
   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | Your Neon connection string |
   | `AUTH_SECRET` | Run `openssl rand -base64 32` |
   | `NEXTAUTH_SECRET` | Same value as AUTH_SECRET |
   | `AUTH_TRUST_HOST` | `true` |
   | `AI_MOCK` | `true` |
   | `NODE_ENV` | `production` |
6. Click **Create Web Service**

### First Deploy
- The Dockerfile builds Next.js and runs `prisma migrate deploy` on startup
- If the database is empty, run seed manually:
  ```bash
  # In Render Shell (or locally against the same DATABASE_URL)
  npx prisma db seed
  ```

## Step 4: Verify Deployment

1. Visit `https://your-app.onrender.com`
2. Login: `teacher@fontaine.tn` / `fontaine2026`
3. Check:
   - Dashboard loads with stats
   - Classes page shows "القسم أ"
   - Curriculum shows 8 units
   - Activities list loads
   - AI status shows "Mock" (not Ollama)
4. Test real-time:
   - Create a session
   - Open the join link in another tab
   - Verify Socket.IO connects (check browser DevTools → Network → WS)

## Local vs Cloud Differences

| Feature | Local Development | Cloud (Render) |
|---------|------------------|----------------|
| AI | Ollama qwen2.5:3b (real) | Mock provider (test data) |
| Database | Same Neon PostgreSQL | Same Neon PostgreSQL |
| Cold start | None | ~1 min after 15min idle |
| Socket.IO | WebSocket | WebSocket (same) |
| Auth | JWT | JWT (same) |
| URL | http://localhost:3000 | https://xxx.onrender.com |

## Backup Instructions

### Database
Neon provides point-in-time restore on paid plans. On the free tier:
```bash
# Export data using pg_dump (requires psql installed)
pg_dump "YOUR_NEON_DATABASE_URL" > backup.sql

# Or use Prisma
npx prisma db pull    # saves schema
npx prisma db seed    # re-creates from seed
```

### SQLite Recovery
The original SQLite database is preserved at:
- `prisma/dev.db.backup-pre-postgres`
- `prisma/dev.db.backup-20260920015600`
- `prisma/migrations-sqlite-archive/` (original SQLite migrations)

To revert to SQLite:
1. Change `prisma/schema.prisma` provider back to `"sqlite"`
2. Restore migrations from `prisma/migrations-sqlite-archive/`
3. Set `DATABASE_URL="file:./dev.db"` in `.env`
4. Copy backup: `cp prisma/dev.db.backup-pre-postgres prisma/dev.db`

## Troubleshooting

### App won't start on Render
- Check Render build logs for errors
- Verify `DATABASE_URL` is set correctly in Render environment variables
- Ensure Neon database exists and is accessible

### Database connection fails
- Neon compute may have scaled to zero — first connection takes 1-2s
- Verify the connection string includes `?sslmode=require`
- Check Neon dashboard for connection status

### Socket.IO not connecting
- Render supports WebSockets on free tier
- Client connects to same origin (no CORS issues)
- If the service was sleeping, the first WebSocket connection triggers a cold start (~1 min)

### Auth redirect issues
- `AUTH_TRUST_HOST=true` must be set (Render terminates TLS at load balancer)
- Do NOT set `NEXTAUTH_URL` or `AUTH_URL` in production — Auth.js v5 auto-detects from request headers

### Cold start is slow
- This is expected on Render Free (15min idle → ~1min spin-up)
- Optional: Use a free uptime monitor (e.g., UptimeRobot) to ping `/api/health` every 14 minutes
- WebSocket activity from connected clients keeps the service alive during sessions

## Cost Summary

| Service | Monthly Cost | Credit Card | Expires |
|---------|-------------|-------------|---------|
| Render Web Service | $0 | No | Never |
| Neon PostgreSQL | $0 | No | Never |
| Ollama (local only) | $0 | No | N/A |
| **Total** | **$0** | **No** | **Never** |
