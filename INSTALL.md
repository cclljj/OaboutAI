# INSTALL.md

This document is written for both humans and AI agents.
Goal: install and run OaboutAI reliably in a fresh environment.

## 1. Installation Modes

- Mode A: Local (run on your machine)
- Mode B: Vercel (host online)

## 2. Mode A - Local Installation

### 2.1 Prerequisites

Required:
- Git
- Python `>=3.10`
- Node.js `>=18`

Optional:
- Hugo Extended binary (if absent, use `npx --yes hugo-bin`)

### 2.2 Bootstrap Commands (Copy/Paste)

```bash
git clone https://github.com/cclljj/OaboutAI.git
cd OaboutAI
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip pyyaml
```

### 2.3 Verification Commands

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
- message like `Validated <N> item files successfully.`

### 2.4 Run Local Site

```bash
python3 scripts/compose_site.py --app-id "${APP_ID:-oaboutai}" --output /tmp/oaboutai-site --clean
cd /tmp/oaboutai-site
python3 scripts/sync_topics.py
npx --yes hugo-bin server -D
```

Open:
- `http://localhost:1313/`

### 2.5 Production-Equivalent Local Build

```bash
python3 scripts/compose_site.py --app-id "${APP_ID:-oaboutai}" --output /tmp/oaboutai-site --clean
cd /tmp/oaboutai-site
python3 scripts/sync_topics.py
rm -f data/keyword_proposals.jsonl
npx --yes hugo-bin --gc --minify
test -f public/index.html
```

Expected:
- all commands exit `0`

## 3. Mode B - Vercel Installation

Two supported paths.

### 3.1 Path 1 - GitHub Actions Auto Deploy (Recommended)

1. Fork/push repository to GitHub.
2. Create or link Vercel project to this repo.
3. Add GitHub Actions secret:
- `VERCEL_TOKEN`
4. Ensure workflow exists:
- `.github/workflows/docs-site-ci.yml`
5. Push to `main`.

Pipeline will:
- auto-resolve common content issues
- validate metadata
- build Hugo site
- deploy to Vercel production

### 3.2 Path 2 - Manual Vercel CLI Deploy

```bash
npm install -g vercel@latest
vercel login
vercel link
rm -f data/keyword_proposals.jsonl
vercel build --prod
vercel deploy --prebuilt --prod
```

Expected:
- deploy command returns production URL

## 4. Updating Knowledge Content

Use either OpenClaw ingestion or manual editing.

### 4.1 Method A - OpenClaw Ingestion (Preferred)

Step 1: Prepare draft

```bash
python scripts/ingest_item.py prepare \
  --source-input "<url-or-local-path>" \
  --source-date "YYYY-MM-DD" \
  --output /tmp/oaboutai_draft.json
```

Step 2: Complete required bilingual fields in draft JSON
- `title.en`, `title.zh-tw`
- `executive_summary.en`, `executive_summary.zh-tw`
- `detailed_notes.en`, `detailed_notes.zh-tw`
- `keywords`, `topics`, `source_date`

Step 3: Dry run

```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --dry-run
```

Step 4: Write + checks

```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --run-checks
```

Step 5 (optional): Write + checks + push

```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --run-checks \
  --git-push
```

### 4.2 Method B - Manual Markdown Editing

1. Create canonical EN entry:
- `content/en/items/<slug>/index.md`
2. Create zh-TW paired entry:
- `content/zh-tw/items/<slug>/index.md`
3. Use only IDs from app-level registries:
- `apps/<app-id>/data/topics.json`
- `apps/<app-id>/data/keywords.json`
4. Run checks:

```bash
python3 scripts/compose_site.py --app-id "${APP_ID:-oaboutai}" --output /tmp/oaboutai-site --clean
cd /tmp/oaboutai-site
python3 scripts/sync_topics.py
python3 scripts/auto_resolve_content_issues.py
python3 scripts/validate_content.py
rm -f data/keyword_proposals.jsonl
npx --yes hugo-bin --gc --minify
```

## 5. Agent-Safe Operational Rules

For AI agents working in this repo:
- Always run `python3 scripts/auto_resolve_content_issues.py` before validation.
- Always run `python3 scripts/validate_content.py` before build/push.
- Always run `python3 scripts/sync_topics.py` after compose to reflect topic config changes.
- Always remove `data/keyword_proposals.jsonl` before Hugo build.
- Never publish zh-TW-only items without EN canonical pair.
- Never invent keyword/topic IDs not present in data registries.

## 6. Common Failure Cases

### 6.1 `unknown keywords [...]`

Action:
- run `python3 scripts/auto_resolve_content_issues.py`
- re-run validator

### 6.2 `attachment ... not found in bundle`

Action:
- place file under `content/en/items/<slug>/`, or
- remove/fix front matter `attachments`

### 6.3 Hugo fails due to `keyword_proposals.jsonl`

Action:

```bash
rm -f data/keyword_proposals.jsonl
npx --yes hugo-bin --gc --minify
```

### 6.4 `npx --yes hugo-bin` network failure

Action:
- retry with stable network, or
- install Hugo Extended locally and use `hugo` directly

## 7. Final Ready Checklist

A fresh environment is considered ready when all are true:
- `python3 scripts/auto_resolve_content_issues.py` exits `0`
- `python3 scripts/validate_content.py` exits `0`
- `npx --yes hugo-bin server -D` runs successfully
- `rm -f data/keyword_proposals.jsonl && npx --yes hugo-bin --gc --minify` exits `0`
- `public/index.html` exists
