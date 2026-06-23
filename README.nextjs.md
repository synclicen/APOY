# APOY — Next.js + Turso + Cloudflare Workers

Professional AI-powered photo curation and editing workspace for RAW and high-quality images.

This branch contains the **Next.js 16** port of the APOY app, with:
- **Turso** (libSQL) database for cloud-synced project saving and export history
- **Cloudflare Workers** deployment (serves the static frontend + handles the API at the edge)
- Fullscreen responsive layout that fits one screen on any device

> The original Vite version lives on the `main` branch.

Live deployment: **https://apoy.synclicen.workers.dev**

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Cloudflare Worker (apoy.synclicen.workers.dev)     │
│                                                     │
│  ┌─────────────┐    ┌────────────────────────────┐  │
│  │ Static Assets│    │ Worker fetch handler       │  │
│  │ (Next.js     │    │ /api/projects  → Turso     │  │
│  │  export)     │    │ /api/history   → Turso     │  │
│  └─────────────┘    └────────────┬───────────────┘  │
└──────────────────────────────────┼──────────────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │  Turso (libSQL)     │
                        │  projects table     │
                        │  export_history tbl │
                        └─────────────────────┘
```

- **Frontend**: Next.js 16 App Router, statically exported (`out/`) and served via Workers Static Assets.
- **API**: Implemented in `worker/apoy.ts` (Cloudflare Worker) using `@libsql/client`, mirroring the Next.js API routes in `src/app/api/`.
- **Database**: Turso (edge SQLite). Schema in `scripts/setup-turso-schema.mjs`.

## Features backed by Turso

1. **Save / Load Projects** — Save the current photo session (photos + analysis/export settings) to the cloud and reload it later from any device. ("My Projects" dropdown in the Import view.)
2. **Export History** — Every export is logged with format, quality, photo count, file size, and destination. (Collapsible "Export History" panel in the Export view.)

## Run Locally

```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env
#   → fill in TURSO_DATABASE_URL and TURSO_AUTH_TOKEN

# 3. (Optional) Apply the database schema
TURSO_DATABASE_URL="libsql://..." bun scripts/setup-turso-schema.mjs

# 4. Start the dev server
bun run dev
```

The Next.js dev server includes the API routes natively (`src/app/api/`), so the full app works locally without the Worker.

## Deploy to Cloudflare Workers

```bash
# Set Cloudflare credentials
export CLOUDFLARE_API_TOKEN="cfut_..."
export CLOUDFLARE_ACCOUNT_ID="..."

# Set the Turso auth token as a Worker secret (one-time)
echo "your-turso-token" | bunx wrangler secret put TURSO_AUTH_TOKEN

# Build + deploy
bun run deploy:cf
```

`deploy:cf` runs `bash .zscripts/build-worker.sh` (static export, with API routes temporarily moved aside since the Worker handles them) followed by `wrangler deploy`.

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS 4 + Material Design 3 dark theme
- **Database**: Turso (libSQL) via `@libsql/client`
- **Hosting**: Cloudflare Workers + Workers Static Assets
- **Animation**: Motion (Framer Motion)
- **Icons**: lucide-react

---

APOY — Add Photos, Originate Yours.
Made by Fajrianor — PUSHAKIN UIN Antasari Banjarmasin 2026.
