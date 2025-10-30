# Setting Up Your Existing KV Namespace

You already have a KV namespace called `CHESS_AI_KV`. Here's how to connect it:

## Step 1: Get Your KV Namespace ID

Run this command to list all your KV namespaces:

```bash
wrangler kv:namespace list
```

You'll see output like:
```json
[
  {
    "id": "a1b2c3d4e5f6...",
    "title": "CHESS_AI_KV"
  }
]
```

**Copy the `id` value** - you'll need it in the next step.

## Step 2: Update wrangler.toml

Open `wrangler.toml` and **uncomment** the KV section, then update it:

### Current (commented out):
```toml
# [[kv_namespaces]]
# binding = "OPENINGS_KV"
# id = "YOUR_KV_NAMESPACE_ID"
# preview_id = "YOUR_PREVIEW_KV_NAMESPACE_ID"
```

### Updated (with your actual ID):
```toml
[[kv_namespaces]]
binding = "OPENINGS_KV"  # ← Variable name used in code
id = "YOUR_ACTUAL_ID_FROM_STEP_1"  # ← Replace with actual ID
```

**Important Notes:**
- `binding = "OPENINGS_KV"` - This is the variable name in your code (keep it as is)
- `id = "..."` - Replace with the actual ID from Step 1
- You can remove `preview_id` if you don't need it for local development

## Step 3: Understanding the Binding Name

The `binding` is what you use in your **TypeScript code**:

```typescript
// In worker/src/index.ts
export interface Env {
  OPENINGS_KV?: KVNamespace;  // ← This matches the binding name
  // ...
}

// To use it in code:
const value = await env.OPENINGS_KV.get("key");
```

## Can You Change the Binding Name?

**Yes!** You can name it whatever you want, but then you need to update the code too:

### Option 1: Keep Current Binding (Recommended - No Code Changes)
```toml
binding = "OPENINGS_KV"  # Code already uses this name
id = "your-actual-id"
```

### Option 2: Change to Match Your KV Name (Requires Code Changes)
```toml
binding = "CHESS_AI_KV"  # Match your KV namespace name
id = "your-actual-id"
```

Then update the code:
```typescript
// worker/src/index.ts
export interface Env {
  CHESS_AI_KV?: KVNamespace;  // Changed from OPENINGS_KV
  // ...
}
```

## Recommended: Keep It Simple

Just use `OPENINGS_KV` as the binding name - it's already in the code:

```toml
[[kv_namespaces]]
binding = "OPENINGS_KV"  # ← Code uses this
id = "YOUR_ACTUAL_ID_HERE"  # ← Get from wrangler kv:namespace list
```

## Summary

| What | Example | Where |
|------|---------|-------|
| **KV Name** | `CHESS_AI_KV` | Cloudflare Dashboard |
| **Binding** | `OPENINGS_KV` | wrangler.toml |
| **ID** | `a1b2c3d4...` | wrangler.toml |

The **binding** connects your code to your actual KV namespace using the ID.
