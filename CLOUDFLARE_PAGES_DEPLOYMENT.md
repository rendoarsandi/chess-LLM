# Cloudflare Pages Fullstack Deployment Guide

Panduan lengkap untuk deploy aplikasi Chess LLM sebagai **single fullstack deployment** di Cloudflare.

## Arsitektur Deployment

Project ini menggunakan arsitektur **hybrid deployment**:

1. **Frontend (Next.js)** → Cloudflare Pages
2. **Backend API (Worker)** → Cloudflare Workers
3. **Database** → Cloudflare D1
4. **Storage** → Cloudflare KV & Durable Objects

Kedua komponen (frontend & backend) akan di-deploy dalam satu workflow, tapi tetap terpisah secara infrastruktur untuk performa optimal.

## Prerequisites

- Node.js 20+
- Akun Cloudflare
- Wrangler CLI: `npm install -g wrangler`
- Gemini API key dari Google AI Studio

## Setup Awal

### 1. Install Dependencies

```bash
npm install
```

### 2. Login ke Cloudflare

```bash
wrangler login
```

### 3. Setup Database & KV (Jika Belum)

Jika sudah pernah setup, skip langkah ini.

```bash
# Create D1 Database
wrangler d1 create chess-llm-db

# Create KV Namespace
wrangler kv:namespace create "OPENINGS_KV"

# Update wrangler.toml dengan ID yang dihasilkan
# Jalankan migrations
wrangler d1 migrations apply chess-llm-db
```

### 4. Set Secrets

```bash
wrangler secret put GEMINI_API_KEY
```

## Deployment - Single Command

### Deploy Fullstack (Worker + Pages)

```bash
npm run deploy
```

Command ini akan:
1. Deploy Worker (backend API) ke `chess-ai.rendoarsandi.workers.dev`
2. Build Next.js app
3. Deploy frontend ke Cloudflare Pages

### Deploy Terpisah

Jika ingin deploy secara terpisah:

```bash
# Deploy Worker saja
npm run worker:deploy

# Deploy Pages saja
npm run pages:deploy
```

## Setup Cloudflare Pages (First Time)

Untuk deployment pertama kali melalui Cloudflare Dashboard:

### Via Dashboard (Recommended)

1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Pilih **Workers & Pages** → **Create application** → **Pages**
3. Pilih **Connect to Git** dan pilih repository Anda
4. Konfigurasi build:
   - **Framework preset**: Next.js
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
   - **Node version**: 20
5. Klik **Save and Deploy**

### Environment Variables di Pages

Tambahkan environment variable di Pages settings:

1. Pergi ke **Pages project** → **Settings** → **Environment variables**
2. Tambahkan:
   - `NODE_VERSION`: `20`
   - `NEXT_PUBLIC_API_URL`: URL worker Anda (e.g., `https://chess-ai.rendoarsandi.workers.dev`)

### Custom Domain (Optional)

1. Pergi ke **Pages project** → **Custom domains**
2. Add custom domain Anda
3. Update DNS records sesuai instruksi

## Konfigurasi API Routing

Next.js app sudah dikonfigurasi untuk route API requests ke Worker:

- **Development**: `http://127.0.0.1:8787/api/*`
- **Production**: `https://chess-ai.rendoarsandi.workers.dev/api/*`

Lihat `next.config.ts` untuk detailnya.

## Local Development

### Jalankan Fullstack di Local

Terminal 1 - Worker:
```bash
npm run worker:dev
# atau
wrangler dev
```

Terminal 2 - Next.js:
```bash
npm run dev
```

Akses aplikasi di: `http://localhost:3000`

### Test dengan Pages Dev Server

```bash
# Build terlebih dahulu
npm run build

# Jalankan Pages dev server
npm run pages:dev
```

## Struktur URL Setelah Deploy

Setelah deployment berhasil:

- **Frontend**: `https://chess-llm.pages.dev` (atau custom domain Anda)
- **Worker API**: `https://chess-ai.rendoarsandi.workers.dev/api/*`
- **API Routes**: Frontend otomatis proxy ke Worker

## Troubleshooting

### Error: "Not Found" di Website

**Penyebab**: Anda mungkin mengakses URL Worker langsung, bukan Pages URL.

**Solusi**:
- Akses URL Cloudflare Pages (bukan Worker URL)
- Worker URL hanya untuk API endpoints
- Contoh benar: `https://chess-llm.pages.dev`
- Contoh salah: `https://chess-ai.rendoarsandi.workers.dev` (ini hanya API)

### Build Gagal di Cloudflare Pages

1. Pastikan Node version di environment variables = 20
2. Check build logs di Cloudflare Dashboard
3. Test build lokal: `npm run build`

### API Tidak Terhubung

1. Cek Worker sudah di-deploy: `wrangler deployments list`
2. Test Worker endpoint langsung:
   ```bash
   curl https://chess-ai.rendoarsandi.workers.dev/api/game/test-123/state
   ```
3. Cek environment variables di Pages

### CORS Issues

Jika ada CORS error, tambahkan headers di `worker/src/index.ts`:

```typescript
return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  },
});
```

## Monitoring & Logs

### View Worker Logs

```bash
wrangler tail
```

### View Pages Deployment

```bash
wrangler pages deployments list --project-name=chess-llm
```

### Check Database

```bash
wrangler d1 execute chess-llm-db --command "SELECT * FROM games LIMIT 10"
```

## CI/CD dengan GitHub Actions

File `.github/workflows/deploy.yml` sudah tersedia untuk auto-deployment.

Setup secrets di GitHub:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Setiap push ke branch main akan otomatis deploy ke production.

## Update Deployment

Untuk update aplikasi:

```bash
# Pull latest changes
git pull

# Deploy ulang
npm run deploy
```

## Performa & Best Practices

1. **Build Caching**: Next.js build sudah dikonfigurasi dengan caching
2. **Static Assets**: Otomatis di-cache oleh Cloudflare CDN
3. **API Caching**: Gunakan KV untuk cache response jika perlu
4. **Edge Functions**: Worker berjalan di edge untuk latency rendah

## Cost Estimation

Dengan Cloudflare Free Plan:
- **Pages**: Unlimited requests, 500 builds/month
- **Workers**: 100,000 requests/day
- **D1**: 5GB storage, 5M rows read/day
- **KV**: 100,000 reads/day

Cukup untuk small-medium traffic.

## Support

Jika ada masalah:
1. Check [Cloudflare Status](https://www.cloudflarestatus.com/)
2. Lihat deployment logs di Dashboard
3. Run `wrangler tail` untuk real-time logs

## Resources

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Next.js on Cloudflare](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
