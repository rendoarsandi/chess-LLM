# Chess LLM - AI Chess Game

Aplikasi chess powered by AI (Google Gemini) yang berjalan di Cloudflare infrastructure dengan Next.js frontend dan Cloudflare Workers backend.

## Features

- 🎮 Play against AI (powered by Google Gemini)
- 🤖 Watch AI vs AI games
- 💾 Game history stored in Cloudflare D1
- ⚡ Real-time game state with Durable Objects
- 📊 AI reasoning explanation for each move
- 🌍 Global edge deployment for low latency

## Tech Stack

- **Frontend**: Next.js 15 + React 19 + TailwindCSS
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare KV + Durable Objects
- **AI**: Google Gemini API

## Quick Start

### Prerequisites

- Node.js 20+
- Cloudflare account
- Gemini API key

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Setup environment:
```bash
# Login to Cloudflare
wrangler login

# Create database and run migrations
wrangler d1 create chess-llm-db
wrangler d1 migrations apply chess-llm-db

# Set API key
wrangler secret put GEMINI_API_KEY
```

3. Run development servers:

**Terminal 1 - Backend (Worker):**
```bash
npm run worker:dev
```

**Terminal 2 - Frontend (Next.js):**
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Deployment

### ⚡ Single Worker Fullstack Deploy (Recommended)

Deploy **frontend + backend** dalam **single Cloudflare Worker** dengan satu command:

```bash
npm run deploy
```

This will:
1. Build Next.js dengan @cloudflare/next-on-pages
2. Bundle frontend + backend dalam satu Worker
3. Deploy ke Cloudflare Workers

**Result**: Single URL untuk semua (frontend + API)!
- Frontend: `https://chess-ai.rendoarsandi.workers.dev/`
- API: `https://chess-ai.rendoarsandi.workers.dev/api/game/{id}/*`

### Deployment Guides

- **⚡ [Single Worker Deployment](./SINGLE_WORKER_DEPLOYMENT.md)** - Setup & deploy single Worker fullstack (Recommended)
- **📘 [Cloudflare Pages Deployment](./CLOUDFLARE_PAGES_DEPLOYMENT.md)** - Alternative: Worker + Pages terpisah
- **📗 [Worker-only Deployment](./DEPLOYMENT.md)** - Legacy: API-only Worker
- **📙 [KV Setup](./SETUP_KV.md)** - Setup KV namespace

## Project Structure

```
chess-LLM/
├── app/                    # Next.js app directory
├── components/             # React components
├── worker/                 # Cloudflare Worker
│   └── src/
│       ├── index.ts       # Worker entry point
│       ├── durable-objects/  # Game state management
│       └── lib/           # Shared utilities
├── migrations/            # D1 database migrations
├── wrangler.toml         # Cloudflare configuration
└── next.config.ts        # Next.js configuration
```

## Architecture

### Single Worker Fullstack (Current)

```
┌─────────────────────────────────────┐
│   Cloudflare Global Network (Edge)  │
└────────────────┬────────────────────┘
                 │
      ┌──────────▼──────────┐          ┌─────────────────┐
      │  Single Worker      │          │  Google Gemini  │
      │  chess-ai           │◄─────────┤  AI API         │
      ├─────────────────────┤          └─────────────────┘
      │                     │
      │  Frontend           │
      │  - Next.js Pages    │
      │  - React Components │
      │  - Static Assets    │
      │                     │
      │  Backend            │
      │  - API Routes       │
      │  - Game Logic       │
      ├─────────────────────┤
      │                     │
      │  Durable Objects    │◄─── Game State
      │  D1 Database        │◄─── Game History
      │  KV Store           │◄─── Opening Cache
      └─────────────────────┘
```

## Available Scripts

- `npm run dev` - Run Next.js dev server (UI development)
- `npm run dev:worker` - Run Worker dev server
- `npm run build` - Build Next.js untuk Cloudflare Workers
- `npm run preview` - Build & run fullstack Worker locally
- `npm run deploy` - Build & deploy single Worker fullstack
- `npm run cf-typegen` - Generate Cloudflare TypeScript types

## Environment Variables

### Worker (Cloudflare Secrets)
- `GEMINI_API_KEY` - Google Gemini API key

### Pages (Environment Variables)
- `NODE_VERSION` - Node.js version (20)
- `NEXT_PUBLIC_API_URL` - Worker API URL

## API Endpoints

All endpoints are prefixed with `/api/game/{gameId}/`:

- `POST /api/game/{gameId}/move` - Make a move
- `POST /api/game/{gameId}/ai-move` - Request AI move
- `POST /api/game/{gameId}/reset` - Start new game
- `GET /api/game/{gameId}/state` - Get game state
- `GET /api/game/{gameId}/reasoning` - Get AI reasoning

## Troubleshooting

### "Not Found" Error on Website

**Cause**: Worker belum deploy dengan Next.js frontend (hanya API).

**Solution**: Deploy dengan single Worker fullstack:
```bash
npm run deploy
```

Setelah deploy, akses `https://chess-ai.rendoarsandi.workers.dev/` untuk frontend.

### Build Error: "Cannot resolve dependency"

**Cause**: Next.js version conflict dengan @cloudflare/next-on-pages

**Solution**: Install dengan legacy peer deps:
```bash
npm install --legacy-peer-deps
```

### API Routes Tidak Work di Local Dev

**Cause**: `npm run dev` hanya jalankan Next.js dev server.

**Solution**: Gunakan `npm run preview` untuk test fullstack locally.

### More Issues?

Lihat [Single Worker Deployment Guide](./SINGLE_WORKER_DEPLOYMENT.md#troubleshooting) untuk troubleshooting lengkap.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
