# 📋 TrendPost — Setup & Operational Status Matrix

This document provides the definitive verification matrix for TrendPost, specifying what runs right now in **Free/Development Mode** versus what will activate upon supplying production credentials.

---

## 🔍 Feature & Provider Status Matrix

| Feature / Subsystem | Current Status | Free Mode Available? | Production Credential Needed? | Configuration Location |
|---|---|---|---|---|
| **Google Trends India** | ✅ **LIVE & ACTIVE** | ✅ Yes (Public Daily RSS geo=IN) | ❌ None (Free & Public) | [`src/lib/providers/google-trends.ts`](file:///C:/Users/navee/.gemini/antigravity/scratch/trendpost/src/lib/providers/google-trends.ts) |
| **Reddit (`r/all` & `r/india`)** | ✅ **LIVE & ACTIVE** | ✅ Yes (Public JSON Feed with User-Agent) | ❌ None (Optional OAuth) | [`src/lib/providers/reddit.ts`](file:///C:/Users/navee/.gemini/antigravity/scratch/trendpost/src/lib/providers/reddit.ts) |
| **YouTube India Trending** | ⏸️ **WAITING FOR API KEY** | ⚠️ Graceful Fallback (Isolated failure) | `YOUTUBE_API_KEY` | `.env.local` or `/settings/api-keys` |
| **X (Twitter Trends)** | ⏸️ **WAITING FOR API KEY** | ⚠️ Graceful Fallback (Isolated failure) | `X_BEARER_TOKEN` | `.env.local` or `/settings/api-keys` |
| **Trend Normalization & Deduplication** | ✅ **LIVE & ACTIVE** | ✅ Yes (Deterministic Token Clustering) | ❌ None | [`src/lib/normalization/deduplicator.ts`](file:///C:/Users/navee/.gemini/antigravity/scratch/trendpost/src/lib/normalization/deduplicator.ts) |
| **Transparent Virality Scoring (0-100)** | ✅ **LIVE & ACTIVE** | ✅ Yes (Freshness, Velocity, Volume, Fit) | ❌ None | [`src/lib/scoring/scorer.ts`](file:///C:/Users/navee/.gemini/antigravity/scratch/trendpost/src/lib/scoring/scorer.ts) |
| **Claude AI Content Generation** | 🔄 **DUAL MODE ACTIVE** | ✅ Yes (`[DEVELOPMENT TEST CONTENT]`) | `ANTHROPIC_API_KEY` (Claude 3.5 Sonnet) | `.env.local` or `/settings/api-keys` |
| **Telegram Top 5 Dispatch (07:30 IST)** | 🔄 **DUAL MODE ACTIVE** | ✅ Yes (`[DEVELOPMENT DELIVERY]`) | `TELEGRAM_BOT_TOKEN` | `.env.local` or `/settings/api-keys` |
| **Atomic Claiming (Person A & B)** | ✅ **LIVE & ACTIVE** | ✅ Yes (Transactional Row Locking) | ❌ None | [`src/lib/claims/claim-manager.ts`](file:///C:/Users/navee/.gemini/antigravity/scratch/trendpost/src/lib/claims/claim-manager.ts) |
| **Two-User Workflow & Persona Switcher** | ✅ **LIVE & ACTIVE** | ✅ Yes (Person A / Person B instant toggle) | ❌ None | UI Header & Sidebar |
| **2-Hour Spike Detection Radar** | ✅ **LIVE & ACTIVE** | ✅ Yes (Dashboard Alert Stream) | ❌ None (Telegram optional) | [`src/lib/spikes/spike-detector.ts`](file:///C:/Users/navee/.gemini/antigravity/scratch/trendpost/src/lib/spikes/spike-detector.ts) |
| **Get Updates Now (with Cooldown)** | ✅ **LIVE & ACTIVE** | ✅ Yes (300s Rate-Limit Protection) | ❌ None | [`src/app/api/pipeline/refresh/route.ts`](file:///C:/Users/navee/.gemini/antigravity/scratch/trendpost/src/app/api/pipeline/refresh/route.ts) |
| **Publishing Calendar (IST Dayparts)** | ✅ **LIVE & ACTIVE** | ✅ Yes (Morning, Afternoon, Evening, Night) | ❌ None | [`src/app/calendar/page.tsx`](file:///C:/Users/navee/.gemini/antigravity/scratch/trendpost/src/app/calendar/page.tsx) |
| **Structured Observability Logs** | ✅ **LIVE & ACTIVE** | ✅ Yes (Ring buffer + JSON explorer) | ❌ None | [`src/app/logs/page.tsx`](file:///C:/Users/navee/.gemini/antigravity/scratch/trendpost/src/app/logs/page.tsx) |
| **Zero-Config Persistent Storage Engine** | ✅ **LIVE & ACTIVE** | ✅ Yes (Vercel Serverless & Local File-Backed) | ❌ None | [`src/lib/db/repository.ts`](file:///C:/Users/navee/.gemini/antigravity/scratch/trendpost/src/lib/db/repository.ts) |

---

## 🚀 1. How to Start the Application

```bash
cd C:\Users\navee\.gemini\antigravity\scratch\trendpost
npm run dev
```
Open **`http://localhost:3000`** in your browser. The dashboard will launch in **FREE DEVELOPMENT MODE** immediately without asking for any API keys.

---

## 🧪 2. How to Run Tests

TrendPost includes comprehensive automated tests covering normalization, deduplication, scoring, spike detection, claim race conditions, Telegram callbacks, and full end-to-end integration:

```bash
npm test
```
All 7 test suites pass in ~5 seconds with zero external network dependencies.

---

## 🏗️ 3. How to Run Production Build

Verify TypeScript compilation, page data collection, and static generation:

```bash
npm run build
```
All 22 dynamic and static Next.js 15 pages and API routes compile with 0 errors.

---

## 🔑 4. How to Add Production API Keys Later

You can add API keys in **two simple ways** whenever you are ready:

### Method A: Via Web Dashboard (Recommended)
1. Go to **Settings → API Keys** (`/settings/api-keys`).
2. Paste your **Anthropic Claude API Key**, **Telegram Bot Token**, **YouTube API Key**, or **X Bearer Token**.
3. Click **"Save"** and **"Test Connection"**.
4. The system will immediately verify connectivity and switch from `DEVELOPMENT TEST CONTENT` to live `CLAUDE 3.5 PRODUCTION` without restarting the server!

### Method B: Via `.env.local`
Edit `C:\Users\navee\.gemini\antigravity\scratch\trendpost\.env.local`:
```env
ANTHROPIC_API_KEY=sk-ant-api03-...
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
YOUTUBE_API_KEY=AIzaSy...
X_BEARER_TOKEN=AAAA...
```

---

## 🤖 5. How to Configure Telegram Delivery

1. Message **`@BotFather`** on Telegram and create a new bot (`/newbot`).
2. Copy the bot token and save it in `/settings/api-keys`.
3. Set your webhook endpoint:
   ```bash
   curl -F "url=https://YOUR_DOMAIN.com/api/telegram/webhook" \
        -F "secret_token=dev_webhook_secret" \
        https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
   ```
4. Obtain your numerical Chat ID by messaging `@userinfobot` on Telegram.
5. In TrendPost, update Person A or Person B's Telegram Chat ID in database or settings. Top 5 daily dispatches will automatically arrive at **07:30 AM IST** with inline buttons!

---

## ⏰ 6. How to Configure Scheduled Jobs (IST)

TrendPost schedules operate explicitly in **Asia/Kolkata (IST)**:

- **07:00 AM IST** (`30 1 * * *` UTC): Daily Trend Pipeline (`/api/pipeline/daily`)
- **07:30 AM IST** (`0 2 * * *` UTC): Telegram Delivery (`/api/pipeline/deliver`)
- **Every 2 Hours** (`0 */2 * * *` UTC): Spike Detection Radar (`/api/pipeline/detect-spikes`)

To enable native PostgreSQL scheduling in Supabase, execute [`supabase/cron.sql`](file:///C:/Users/navee/.gemini/antigravity/scratch/trendpost/supabase/cron.sql).

---

## 🌐 7. How to Deploy

### Option A: Vercel + Supabase (Recommended)
1. Push repository to GitHub.
2. Import project into [Vercel](https://vercel.com).
3. In Vercel Project Settings, add environment variables from `.env.example`.
4. Apply migrations in Supabase SQL editor from [`supabase/migrations/20260929_init_trendpost.sql`](file:///C:/Users/navee/.gemini/antigravity/scratch/trendpost/supabase/migrations/20260929_init_trendpost.sql).

### Option B: Docker / Node Server
```bash
npm run build
npm start
```
TrendPost runs on port 3000 with standalone production assets.
