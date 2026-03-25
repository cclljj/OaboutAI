# INSTALL.md

This guide provides two installation paths:
- Local installation (run and validate on your machine)
- Vercel installation (deploy and host online)

It also includes content update workflows, including OpenClaw ingestion.

## 1. Local Installation

### 1.1 Prerequisites

Install these tools:
- Git
- Python 3.10+
- Node.js 18+ (LTS recommended)
- Hugo Extended 0.152.2 (or use `npx --yes hugo-bin`)

### 1.2 Clone Repository

```bash
git clone https://github.com/cclljj/OaboutAI.git
cd OaboutAI
```

### 1.3 Set Up Python Environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install pyyaml
```

### 1.4 Verify Tooling

```bash
python3 --version
node --version
npx --yes hugo-bin version
```

### 1.5 Validate Metadata

```bash
python3 scripts/validate_content.py
```

Expected result:
- `Validated <N> item files successfully.`

### 1.6 Start Local Site

```bash
npx --yes hugo-bin server -D
```

Open:
- [http://localhost:1313/](http://localhost:1313/)

### 1.7 Local Production Build

Mirror CI/Vercel behavior:

```bash
rm -f data/keyword_proposals.jsonl
npx --yes hugo-bin --gc --minify
```

Expected result:
- `public/index.html` exists

## 2. Vercel Installation (Deploy Online)

There are 2 supported ways:
- Automatic deployment via GitHub Actions (recommended for this repo)
- Manual deployment from your machine (Vercel CLI)

### 2.1 Option A: Deploy via GitHub Actions (Recommended)

1. Fork or clone this repository into your GitHub account.
2. Create a Vercel project and connect the same GitHub repository.
3. In GitHub repo secrets, add:
   - `VERCEL_TOKEN`
4. Ensure workflow file exists:
   - `.github/workflows/docs-site-ci.yml`
5. Push to `main`.

Pipeline behavior:
1. Auto-resolve metadata issues
2. Validate content
3. Build Hugo output
4. Deploy to Vercel production

### 2.2 Option B: Manual Vercel Deploy (CLI)

Install Vercel CLI:

```bash
npm install -g vercel@latest
```

Login and link project:

```bash
vercel login
vercel link
```

Build and deploy:

```bash
rm -f data/keyword_proposals.jsonl
vercel build --prod
vercel deploy --prebuilt --prod
```

## 3. Updating Content (Including OpenClaw)

You can update data in this project in multiple ways.

### 3.1 Method A: OpenClaw Ingestion (Recommended)

Use this for URL / YouTube / PDF / DOC / DOCX / PPT / PPTX / MD / TXT.

Prepare draft:

```bash
python scripts/ingest_item.py prepare \
  --source-input "<url-or-local-path>" \
  --source-date "YYYY-MM-DD" \
  --output /tmp/oaboutai_draft.json
```

Fill bilingual fields in draft:
- `title.en` / `title.zh-tw`
- `executive_summary.en` / `executive_summary.zh-tw`
- `detailed_notes.en` / `detailed_notes.zh-tw`
- `keywords`, `topics`, `source_date`

Dry-run:

```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --dry-run
```

Write + checks:

```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --run-checks
```

Optional direct push:

```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --run-checks \
  --git-push
```

### 3.2 Method B: Manual Markdown Update

1. Add canonical entry at:
   - `content/en/items/<slug>/index.md`
2. Add paired zh-TW entry at:
   - `content/zh-tw/items/<slug>/index.md`
3. Use only controlled IDs from:
   - `data/topics.json`
   - `data/keywords.json`
4. Validate and build:

```bash
python3 scripts/validate_content.py
rm -f data/keyword_proposals.jsonl
npx --yes hugo-bin --gc --minify
```

## 4. CI Auto-Resolve Behavior

CI includes:

```bash
python scripts/auto_resolve_content_issues.py
```

This step auto-handles common blockers before strict validation:
- maps unknown keywords to fallback controlled keyword
- appends unknown keyword terms to `data/keyword_proposals.jsonl`
- removes non-existent attachment references

## 5. Troubleshooting

### 5.1 `unknown keywords [...]` in validation

- Use keyword IDs from `data/keywords.json`.
- If term is missing, add proposal to `data/keyword_proposals.jsonl`.

### 5.2 `attachment ... not found in bundle`

- Ensure file exists in `content/en/items/<slug>/`, or
- remove/fix `attachments` in front matter.

### 5.3 Hugo build fails on `data/keyword_proposals.jsonl`

Run build guard:

```bash
rm -f data/keyword_proposals.jsonl
npx --yes hugo-bin --gc --minify
```

### 5.4 `npx --yes hugo-bin` network errors

- Retry on stable network, or
- install Hugo Extended locally and use `hugo` directly.

## 6. First Successful Run Checklist

- `python3 scripts/validate_content.py` passes
- `npx --yes hugo-bin server -D` starts
- `rm -f data/keyword_proposals.jsonl && npx --yes hugo-bin --gc --minify` succeeds
- `public/index.html` exists
