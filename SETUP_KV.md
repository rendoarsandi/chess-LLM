# Setting Up KV Namespace (Optional)

The KV namespace is used to cache chess opening names from Lichess API. This is **optional** - the application works fine without it.

## Current Status

The KV namespace is **commented out** in `wrangler.toml` to allow deployment without it.

## If You Want to Enable KV Caching

### Step 1: Create KV Namespaces

```bash
# Create production KV namespace
wrangler kv:namespace create "OPENINGS_KV"

# Create preview KV namespace (for development)
wrangler kv:namespace create "OPENINGS_KV" --preview
```

### Step 2: Update wrangler.toml

The commands above will output something like:

```
✨ Success!
Add the following to your wrangler.toml:
[[kv_namespaces]]
binding = "OPENINGS_KV"
id = "abc123..."

Preview:
id = "xyz789..."
```

### Step 3: Uncomment and Update

In `wrangler.toml`, uncomment the KV section and replace with your actual IDs:

```toml
[[kv_namespaces]]
binding = "OPENINGS_KV"
id = "YOUR_ACTUAL_KV_ID_HERE"
preview_id = "YOUR_ACTUAL_PREVIEW_KV_ID_HERE"
```

### Step 4: Redeploy

```bash
wrangler deploy
```

## What KV Does

When enabled, the KV namespace caches chess opening names fetched from the Lichess API. This:
- Reduces API calls to Lichess
- Speeds up opening name lookups
- Provides offline fallback for common openings

Without KV, the app still fetches opening names from Lichess on every request - it just doesn't cache them.
