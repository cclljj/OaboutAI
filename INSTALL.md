# INSTALL.md

Operational guide for local development, deployment, and Supabase-backed runtime.

## 0. Read Order

- High-level overview: `README.md`
- Agent operating contract: `AGENTS.md`
- DB schema: `docs/supabase_schema.sql`
- Day-2 data ops: `docs/supabase_operations.md`

## 1. Prerequisites

Required:
- Git
- Python `>=3.10`
- Node.js `>=18`

Optional:
- Hugo Extended binary (or use `npx --yes hugo-bin`)

## 2. Bootstrap

```bash
git clone https://github.com/cclljj/OaboutAI.git
cd OaboutAI
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip pyyaml
```

## 3. Validate Local Toolchain

```bash
python3 --version
node --version
npx --yes hugo-bin version
python3 scripts/compose_site.py --app-id "${APP_ID:-oaboutai}" --output /tmp/oaboutai-site --clean
cd /tmp/oaboutai-site
python3 scripts/sync_topics.py
python3 scripts/auto_resolve_content_issues.py
python3 scripts/validate_content.py
```

Notes:
- `validate_content.py` may report a warning when `content/**/items/**/index.md` is empty; this is acceptable in the current Supabase-first model.

## 4. Run Locally

```bash
python3 scripts/compose_site.py --app-id "${APP_ID:-oaboutai}" --output /tmp/oaboutai-site --clean
cd /tmp/oaboutai-site
python3 scripts/sync_topics.py
npx --yes hugo-bin server -D
```

Open:
- `http://localhost:1313/`

## 5. Production-Equivalent Local Build

```bash
python3 scripts/compose_site.py --app-id "${APP_ID:-oaboutai}" --output /tmp/oaboutai-site --clean
cd /tmp/oaboutai-site
python3 scripts/sync_topics.py
python3 scripts/auto_resolve_content_issues.py
python3 scripts/validate_content.py
rm -f data/keyword_proposals.jsonl
npx --yes hugo-bin --gc --minify
test -f public/index.html
```

## 6. Supabase Setup (Required for Protected Content)

### 6.1 Create DB objects

Run in Supabase SQL editor:
- `docs/supabase_schema.sql`

This creates:
- `public.articles` (protected content)
- `public.favorites` (per-user favorites)
- RLS policies for authenticated read and owner-only favorites CRUD

### 6.2 Configure Google OAuth

Supabase:
1. `Authentication -> Providers -> Google` enable provider.
2. Fill Google Client ID / Client Secret.
3. Add redirect URL(s), for example:
   - `https://oaboutai.vercel.app`
   - `http://localhost:1313`

Google Cloud:
1. Configure OAuth consent screen.
2. Create OAuth Client (Web application).
3. Add Supabase callback URL from provider settings.

### 6.3 Configure Hugo runtime env vars

Set these variables in Vercel project settings:
- `HUGO_SUPABASE_URL=https://<project-ref>.supabase.co`
- `HUGO_SUPABASE_ANON_KEY=<anon-public-key>`
- `HUGO_SUPABASE_REDIRECT_URL=https://oaboutai.vercel.app`

For local shell testing, you can export them before running Hugo:

```bash
export HUGO_SUPABASE_URL="https://<project-ref>.supabase.co"
export HUGO_SUPABASE_ANON_KEY="<anon-public-key>"
export HUGO_SUPABASE_REDIRECT_URL="http://localhost:1313"
```

## 7. Load / Refresh Article Data

Current production model reads article bodies from Supabase, not from GitHub `items/` markdown bundles.

Use either approach:
1. Supabase dashboard import (`articles` table; CSV/JSON import)
2. SQL upsert pipelines maintained by your data process

Reference operations and checklist:
- `docs/supabase_operations.md`

## 8. Deployment (Vercel)

### 8.1 Recommended: GitHub Actions

1. Push to GitHub.
2. Add `VERCEL_TOKEN` secret.
3. Ensure workflow `.github/workflows/docs-site-ci.yml` is active.
4. Push to `main`.

Pipeline behavior:
- compose site
- sync topics
- validate shell content
- Hugo build
- deploy composed output to Vercel

### 8.2 Optional: Manual Vercel CLI

```bash
python3 scripts/compose_site.py --app-id "${APP_ID:-oaboutai}" --output /tmp/oaboutai-site --clean
cd /tmp/oaboutai-site
python3 scripts/sync_topics.py
npm install -g vercel@latest
vercel pull --yes --environment=production
rm -f data/keyword_proposals.jsonl
vercel build --prod
vercel deploy --prebuilt --prod
```

## 9. Legacy Notes

- Legacy markdown ingestion scripts still exist (`scripts/ingest_item.py`, OpenClaw docs), but they are no longer the production source-of-truth for published article body content.
- Keep public repo free of protected article markdown if your deployment model depends on strict gate behavior.
