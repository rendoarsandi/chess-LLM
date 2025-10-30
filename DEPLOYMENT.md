# Chess LLM - Cloudflare Deployment Guide

This guide will help you deploy the Chess LLM application to Cloudflare Workers with D1 database support.

## Prerequisites

- Node.js 18+ installed
- Cloudflare account
- Wrangler CLI installed (`npm install -g wrangler`)
- Gemini API key from Google AI Studio

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Authenticate with Cloudflare

```bash
wrangler login
```

### 3. Create D1 Database

Create a new D1 database for your application:

```bash
wrangler d1 create chess-llm-db
```

This will output a database ID. Copy this ID and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "chess-llm-db"
database_id = "YOUR_DATABASE_ID_HERE"  # Replace with your actual database ID
migrations_dir = "migrations"
```

### 4. Run Database Migrations

Apply the database schema:

```bash
wrangler d1 migrations apply chess-llm-db
```

### 5. Create KV Namespace

Create a KV namespace for storing chess opening data:

```bash
# Production
wrangler kv:namespace create "OPENINGS_KV"

# Preview (for development)
wrangler kv:namespace create "OPENINGS_KV" --preview
```

Update the `id` and `preview_id` in `wrangler.toml` with the values returned.

### 6. Set Environment Variables

Set your Gemini API key as a secret:

```bash
wrangler secret put GEMINI_API_KEY
```

When prompted, enter your Gemini API key.

### 7. Deploy the Worker

Deploy your application:

```bash
wrangler deploy
```

## Local Development

### Start Development Server

```bash
# Start the Next.js development server
npm run dev

# In another terminal, start the Wrangler dev server
wrangler dev
```

### Test with Local D1

```bash
# Create local D1 database
wrangler d1 migrations apply chess-llm-db --local

# Run in local mode
wrangler dev --local
```

## Configuration

### wrangler.toml

The configuration file includes:

- **D1 Database**: For storing game history and move data
- **KV Namespace**: For caching chess opening information
- **Durable Objects**: For managing game state
- **Observability**: Logging and monitoring configuration

### Observability Settings

The application includes observability configuration for monitoring:

```toml
[observability]
enabled = false
head_sampling_rate = 1

[observability.logs]
enabled = true
head_sampling_rate = 1
persist = true
invocation_logs = true
```

To enable observability, set `enabled = true` in the `[observability]` section.

## Features

### Automatic Game Execution on Workers

The game automatically runs on Cloudflare Workers:

1. **Human vs AI Mode**: When a player makes a move, the worker automatically:
   - Validates the move
   - Saves it to D1 database
   - Triggers AI move calculation
   - Returns the AI's move with reasoning

2. **AI vs AI Mode**: When started, the game automatically:
   - Makes AI moves in sequence
   - Continues until game over
   - All processing happens on the worker

### D1 Database Schema

The application stores:

- **Games**: Complete game records with metadata
- **Moves**: Individual move history with AI reasoning
- **AI Metrics**: Performance tracking for AI models

## API Endpoints

All endpoints are prefixed with `/api/game/{gameId}/`:

- `POST /move` - Make a move (triggers AI response automatically)
- `POST /ai-move` - Request AI move
- `POST /reset` - Start a new game
- `GET /state` - Get current game state
- `GET /reasoning` - Get AI reasoning for last move

## Monitoring

View logs and analytics:

```bash
# View recent logs
wrangler tail

# View D1 database
wrangler d1 execute chess-llm-db --command "SELECT * FROM games LIMIT 10"
```

## Troubleshooting

### Database Issues

```bash
# Check database
wrangler d1 execute chess-llm-db --command "SELECT name FROM sqlite_master WHERE type='table'"

# View migrations
wrangler d1 migrations list chess-llm-db
```

### Worker Issues

```bash
# View live logs
wrangler tail

# Check worker status
wrangler deployments list
```

### Common Errors

1. **"Database not found"**: Ensure you've created the D1 database and updated `wrangler.toml`
2. **"GEMINI_API_KEY not set"**: Run `wrangler secret put GEMINI_API_KEY`
3. **"Durable Object not found"**: Ensure you've deployed at least once

## GitHub Actions CI/CD

The repository includes automatic deployment on push to main branch. Set up these secrets in your GitHub repository:

- `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [D1 Database Documentation](https://developers.cloudflare.com/d1/)
- [Durable Objects Documentation](https://developers.cloudflare.com/durable-objects/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
