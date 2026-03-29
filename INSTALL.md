# INSTALL.md

Installation and operation guide for humans and AI agents.
This repo uses a composable layout:
- `core/` shared framework
- `apps/<app-id>/` app-specific content

Default app is `oaboutai`.

## 0. Document Target

- Use this file when you need executable setup/run/deploy steps.
- If you only need high-level repo orientation, read `README.md`.
- If you are an automation/agent enforcing policy, read `AGENTS.md`.

## 1. Prerequisites

Required:
- Git
- Python `>=3.10`
- Node.js `>=18`

Optional:
- Hugo Extended binary (if absent, use `npx --yes hugo-bin`)

## 2. Bootstrap

```bash
git clone https://github.com/cclljj/OaboutAI.git
cd OaboutAI
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip pyyaml
```

## 3. Validate Setup (Default App)

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

Expected:
- validator exits `0`
- output contains `Validated <N> item files successfully.`

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

## 6. Deployment (Vercel)

### 6.1 Recommended: GitHub Actions Auto Deploy

1. Push repository to GitHub.
2. Link Vercel project to this repository.
3. Add GitHub secret `VERCEL_TOKEN`.
4. Ensure workflow exists: `.github/workflows/docs-site-ci.yml`.
5. Push to `main`.

Pipeline behavior:
- compose (`core + app`)
- sync topics
- auto-resolve + validate
- build Hugo
- deploy to Vercel

### 6.2 Optional: Manual Vercel CLI

```bash
python3 scripts/compose_site.py --app-id "${APP_ID:-oaboutai}" --output /tmp/oaboutai-site --clean
cd /tmp/oaboutai-site
python3 scripts/sync_topics.py
npm install -g vercel@latest
vercel login
vercel link
rm -f data/keyword_proposals.jsonl
vercel build --prod
vercel deploy --prebuilt --prod
```

## 7. Update Content

### 7.1 Preferred: OpenClaw Ingestion

```bash
python3 scripts/ingest_item.py prepare --source-input "<url-or-local-path>" --source-date "YYYY-MM-DD" --output /tmp/oaboutai_draft.json
python3 scripts/ingest_item.py ingest --spec-file /tmp/oaboutai_draft.json --dry-run
python3 scripts/ingest_item.py ingest --spec-file /tmp/oaboutai_draft.json --run-checks
# optional
python3 scripts/ingest_item.py ingest --spec-file /tmp/oaboutai_draft.json --run-checks --git-push
```

### 7.2 Manual Editing

Canonical app paths:
- `apps/<app-id>/content/en/items/<slug>/index.md`
- `apps/<app-id>/content/zh-tw/items/<slug>/index.md`
- `apps/<app-id>/data/topics.json`
- `apps/<app-id>/data/keywords.json`

Then run section 5 build guard.

## 8. AI Agent Rules

- Always run `compose_site.py` before build/serve.
- Always run `sync_topics.py` after compose.
- Always run `auto_resolve_content_issues.py` before `validate_content.py`.
- Always remove `data/keyword_proposals.jsonl` before Hugo build.
- Never create zh-TW-only entries without EN canonical pair.
- Never invent keyword/topic IDs not in app registries.

## 9. Common Failures

### 9.1 `unknown keywords [...]`
- Run `python3 scripts/auto_resolve_content_issues.py`
- Re-run validator

### 9.2 `attachment ... not found in bundle`
- Place file under `apps/<app-id>/content/en/items/<slug>/`
- Or fix/remove `attachments` front matter

### 9.3 Build fails due to proposal queue
```bash
rm -f data/keyword_proposals.jsonl
npx --yes hugo-bin --gc --minify
```

### 9.4 `npx --yes hugo-bin` network failure
- Retry with stable network
- Or install Hugo Extended and run `hugo --gc --minify`

## 10. Supabase Auth + Favorites Setup

1. Create a Supabase project.
2. In Supabase SQL editor, run `docs/supabase_schema.sql`.
3. Configure Google provider under `Authentication -> Providers -> Google`.
4. Set redirect URL to your site URL (e.g. `https://oaboutai.vercel.app`).
5. Export article rows from Hugo content:

```bash
python3 scripts/export_articles_for_supabase.py --app-id "${APP_ID:-oaboutai}" --output /tmp/oaboutai_articles.jsonl
```

6. Import `/tmp/oaboutai_articles.jsonl` into Supabase `articles` table.
7. Set Supabase values in `apps/oaboutai/hugo.toml`:

```bash
[params.supabase]
url = "https://<project-ref>.supabase.co"
anonKey = "<anon-public-key>"
redirectUrl = "https://oaboutai.vercel.app"
```

8. Deploy. Users must sign in with Google to view protected article content.
