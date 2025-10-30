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

### Single Command Fullstack Deploy

Deploy both frontend and backend with one command:

```bash
npm run deploy
```

This will:
1. Deploy Worker API to Cloudflare Workers
2. Build Next.js app
3. Deploy frontend to Cloudflare Pages

### Separate Deployment

```bash
# Deploy Worker only
npm run worker:deploy

# Deploy Pages only
npm run pages:deploy
```

### Deployment Guides

- **📘 [Cloudflare Pages Fullstack Deployment](./CLOUDFLARE_PAGES_DEPLOYMENT.md)** - Panduan lengkap deploy fullstack
- **📗 [Worker Deployment](./DEPLOYMENT.md)** - Panduan deploy Worker
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

```
┌─────────────────┐
│  Cloudflare CDN │
│   (Edge Cache)  │
└────────┬────────┘
         │
         ├─→ Frontend (Pages)     ┌─────────────────┐
         │   - Next.js App         │   Google Gemini │
         │   - Static Assets       │   AI API        │
         │                         └────────▲────────┘
         └─→ Backend (Worker)              │
             - API Routes  ────────────────┘
             - Durable Objects (Game State)
             - D1 Database (History)
             - KV Store (Cache)
```

## Available Scripts

- `npm run dev` - Run Next.js dev server
- `npm run build` - Build Next.js app
- `npm run worker:dev` - Run Worker dev server
- `npm run worker:deploy` - Deploy Worker
- `npm run pages:deploy` - Deploy Pages
- `npm run deploy` - Deploy fullstack (Worker + Pages)

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

**Problem**: Mengakses Worker URL langsung (`chess-ai.rendoarsandi.workers.dev`)

**Solution**: Gunakan Cloudflare Pages URL, bukan Worker URL. Worker URL hanya untuk API endpoints.

### More Issues?

Lihat [Troubleshooting Guide](./CLOUDFLARE_PAGES_DEPLOYMENT.md#troubleshooting) untuk solusi lengkap.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
