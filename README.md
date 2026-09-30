# 🚀 TrendPost — AI-Powered Trend & Content SaaS Engine

TrendPost is a production-grade full-stack SaaS application that automates the viral creator workflow for Indian and global creators. Every day at **07:00 AM IST**, TrendPost extracts live trending topics across **Google Trends India**, **YouTube**, **Reddit**, and **X**, applies cross-platform deduplication, computes transparent multi-factor virality scores, generates production-quality social media content packages using **OpenRouter AI** (with configurable models, defaulting to `openrouter/free` and safe fallback to Development AI), and dispatches the top 5 ideas via **Telegram** at **07:30 AM IST** with atomic claiming and inline approval buttons for a two-user team (Person A and Person B).

---

## 1. What TrendPost Does

- **Automated Multi-Source Extraction:** Pulls live trends at 07:00 AM IST from Google Trends India, YouTube Trending (IN), Reddit (`r/all`, `r/india`), and X (Twitter).
- **Cross-Platform Clustering:** Deduplicates topics using token overlap and containment (e.g., merging "ISRO Launch" and "ISRO India Rocket Launch").
- **Transparent Virality Scoring:** Computes a composite virality score (0–100) based on Freshness (20%), Velocity (25%), Volume (20%), Instagram Fit (20%), and Cross-Platform presence (15%).
- **AI Content Generation:** Generates complete social media content packages:
  - 3-second hook
  - ~30-second Reel script (Hook, Body, Payoff, CTA)
  - 3 caption options (Punchy, Storytelling, Conversational debate)
  - Exactly 15 targeted hashtags
  - Slide-by-slide Carousel outline
  - Recommended posting time explicitly in **Asia/Kolkata (IST)** with rationale
  - Strategic content angle
- **Two-User Workflow & Atomic Claiming:** Allows Person A and Person B to collaborate without collision. Once an idea is claimed by one user, PostgreSQL transactional locking prevents the second user from claiming it.
- **Telegram Interactive Delivery:** Delivers top 5 ideas daily at 07:30 AM IST with inline action buttons (`[ ✅ Approve ]`, `[ ❌ Reject ]`, `[ 🔒 Claim ]`).
- **2-Hour Spike Detection Radar:** Continuously monitors trends every 2 hours, identifies velocity surges (+20 points), and dispatches urgent Telegram breakout alerts.
- **Enterprise Observability:** Comprehensive structured logging with run IDs, execution durations, and full audit logs.

---

## 2. Architecture

```
                 ┌───────────────────────────────────────────────────────────┐
                 │                   LIVE TREND PROVIDERS                    │
                 │   Google Trends IN  │  YouTube IN  │  Reddit  │  X Trends │
                 └─────────────────────────────┬─────────────────────────────┘
                                               │
                                               ▼
                              ┌─────────────────────────────────┐
                              │  Normalization & Deduplication  │
                              │  (Cross-Platform Token Cluster) │
                              └────────────────┬────────────────┘
                                               │
                                               ▼
                              ┌─────────────────────────────────┐
                              │    Transparent Virality Scorer  │
                              │  Freshness + Velocity + Fit...  │
                              └────────────────┬────────────────┘
                                               │ (Top 10 Ranked)
                                               ▼
                              ┌─────────────────────────────────┐
                              │     OpenRouter AI Engine        │
                              │ (Primary: openrouter/free)      │
                              │ (Fallback: Development AI)      │
                              │ 100% Original Content Package   │
                              └────────────────┬────────────────┘
                                               │
                                               ▼
                              ┌─────────────────────────────────┐
                              │  Persistent Storage Engine      │
                              │  Atomic Claims, Two-User Sync   │
                              └────────┬───────────────┬────────┘
                                       │               │
                                       ▼               ▼
                        ┌────────────────────┐   ┌───────────────────────────┐
                        │ Telegram Bot API   │   │ Next.js 15 SaaS Dashboard │
                        │ Inline Buttons     │   │ Realtime Two-User Sync    │
                        │ (Approve / Claim)  │   │ Mobile-First, Dark Mode   │
                        └────────────────────┘   └───────────────────────────┘
```

- **Frontend & Full-Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons.
- **Database & Storage:** Zero-config persistent store with atomic transactional locks (Vercel serverless & local file-backed).
- **Primary AI Provider:** OpenRouter API (`https://openrouter.ai/api/v1`) using `openrouter/free` (or user-defined model in `OPENROUTER_MODEL`).
- **Secondary / Fallback AI:** Development AI Generator (zero external credentials required, structured template engine).
- **Messaging:** Telegram Bot API with webhook callback handlers.
- **Scheduling:** Standard crons configured for Asia/Kolkata (IST), executed via Vercel Cron.

---

## 3. Local Setup

### Prerequisites
- Node.js >= 18.0 (Tested on Node.js v22/v24)
- npm or pnpm

### Installation Steps
```bash
# 1. Clone repository
git clone https://github.com/your-username/trendpost.git
cd trendpost

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local

# 4. Run automated test suite (33 tests across 8 test suites)
npm test

# 5. Build for production to verify compilation
npm run build

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application dashboard.

---

## 4. Environment Variables

Create `.env.local` based on `.env.example`. All credentials are kept strictly server-side and never exposed to client bundles:

```env
# Core Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEFAULT_TIMEZONE=Asia/Kolkata

# OpenRouter AI Provider (Primary)
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openrouter/free

# Anthropic Claude API (Alternative / Legacy)
ANTHROPIC_API_KEY=

# Telegram Delivery Bot
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=

# Trend Providers (Optional API Keys)
YOUTUBE_API_KEY=
X_BEARER_TOKEN=
```

---

## 5. Development Mode

TrendPost is designed to be **100% functional out of the box** without any paid API keys:

- **Free Trend Sources:** Google Trends India (official RSS) and Reddit (`r/all`, `r/india` JSON feeds) require no API keys and extract real, live data.
- **Development AI Generator:** When `OPENROUTER_API_KEY` is not provided, TrendPost automatically activates its built-in Development AI Generator. It produces compliant 3-second hooks, 30-second Reel scripts, 3 caption options, 15 hashtags, and carousel outlines conforming strictly to the Zod schema.
- **Simulated Telegram Delivery:** When `TELEGRAM_BOT_TOKEN` is not configured, deliveries are captured and recorded in the local store. You can preview messages, verify formatting, and click inline Approve, Reject, and Claim buttons directly in the web dashboard at `/deliveries`.
- **Zero-Config Persistent Storage:** Operates using a fast, atomic file-backed persistent store that supports all CRUD operations, claims, and audit logs.

---

## 6. OpenRouter Setup

TrendPost uses **OpenRouter** as its primary production AI generator. OpenRouter provides access to hundreds of AI models including free high-performance models.

### Step-by-Step Configuration:
1. Visit [openrouter.ai](https://openrouter.ai) and sign up for a free account.
2. Go to **Keys** and click **Create Key**.
3. Copy your API key (starts with `sk-or-v1-...`).
4. In `.env.local`, set:
   ```env
   OPENROUTER_API_KEY=sk-or-v1-your-key-here
   OPENROUTER_MODEL=openrouter/free
   ```
5. *(Optional)* You can change `OPENROUTER_MODEL` to any model on OpenRouter (e.g., `meta-llama/llama-3.3-70b-instruct:free`, `google/gemini-2.0-flash-exp:free`, or paid models like `anthropic/claude-3.5-sonnet`) without modifying a single line of code!
6. In the dashboard at `/settings/api-keys`, enter your key and click **Test Connection** to verify live connectivity.

---

## 7. Storage & Concurrency Architecture

### Zero-Config Persistent Storage:
TrendPost requires no external database setup. The application features a built-in atomic storage engine:
- **Serverless Persistence:** On Vercel, state is automatically persisted in `/tmp/trendpost-db.json` across warm invocations. In local development, state is persisted in `.data/trendpost-db.json`.
- **Transactional Atomic Claims:** Single-claimer guarantees prevent concurrency collisions between Person A and Person B.
- **Pre-Seeded Accounts:** Pre-configured with **Person A** (`a0000000-0000-0000-0000-000000000001`) and **Person B** (`b0000000-0000-0000-0000-000000000002`).

---

## 8. Telegram Setup

### Bot Configuration:
1. Open Telegram and search for [@BotFather](https://t.me/BotFather).
2. Send `/newbot`, choose a name (e.g. `TrendPost Indian Creator Bot`) and username (e.g. `TrendPostBot`).
3. Copy the HTTP API token into `.env.local`:
   ```env
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
   TELEGRAM_WEBHOOK_SECRET=your_custom_secure_secret_token
   ```
4. Obtain user Chat IDs:
   - Have Person A and Person B message [@userinfobot](https://t.me/userinfobot) or start the bot.
   - Set each user's `telegram_chat_id` in `/settings` or in the Supabase `users` table.
5. Register the webhook:
   ```bash
   curl -F "url=https://YOUR_DOMAIN.com/api/telegram/webhook" \
        -F "secret_token=YOUR_WEBHOOK_SECRET" \
        https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
   ```

---

## 9. Cron Jobs

All scheduled jobs operate strictly with reference to **Asia/Kolkata (IST)**:

| Schedule (IST) | Schedule (UTC) | Cron Expression | Target Endpoint | Description |
|---|---|---|---|---|
| **07:00 AM IST** | 01:30 AM UTC | `30 1 * * *` | `/api/pipeline/daily` | Fetches all 4 trend feeds, deduplicates, virality scores, and generates Top 10 via OpenRouter |
| **07:30 AM IST** | 02:00 AM UTC | `0 2 * * *` | `/api/pipeline/deliver` | Dispatches Top 5 ideas with inline Approve/Reject/Claim buttons to Telegram |
| **Every 2 Hours** | Every 2 Hours | `0 */2 * * *` | `/api/pipeline/detect-spikes` | Velocity breakout scanner; alerts users on +20 point surges |

### Cron Integration Options:
- **Vercel Cron:** Automatically configured in `vercel.json`.
- **Supabase pg_cron:** Included in `supabase/cron.sql`.
- **External Webhooks:** Can be triggered via GitHub Actions, EasyCron, or AWS EventBridge.

---

## 10. Production Deployment (Vercel)

### Step-by-Step Vercel Deployment:
1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: complete TrendPost production readiness"
   git push origin main
   ```
2. Go to [vercel.com](https://vercel.com) and import the repository.
3. Configure the Project Settings:
   - Framework Preset: **Next.js**
   - Root Directory: `./`
4. Add Environment Variables in Vercel Dashboard:
   - `NEXT_PUBLIC_APP_URL` (e.g. `https://trendpost.vercel.app`)
   - `DEFAULT_TIMEZONE=Asia/Kolkata`
   - `OPENROUTER_API_KEY`
   - `OPENROUTER_MODEL=openrouter/free`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET`
5. Click **Deploy**. Vercel will build the project using `next build` and configure crons from `vercel.json`.
6. Once deployed, register your live Telegram webhook using your new Vercel domain URL.
