# INSTALL.md

This guide helps you install, run, and validate the OaboutAI Knowledge Archive locally.

## 1. Prerequisites

Install these tools first:
- Git
- Python 3.10+
- Node.js 18+ (LTS recommended)
- Hugo Extended 0.152.2 (or use `npx --yes hugo-bin`)

Optional but recommended:
- `pip` and a Python virtual environment

## 2. Clone the Repository

```bash
git clone https://github.com/cclljj/OaboutAI.git
cd OaboutAI
```

## 3. Set Up Python Environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install pyyaml
```

If you do not use `venv`, install `pyyaml` in your active Python environment.

## 4. Verify Core Tooling

```bash
python3 --version
node --version
npx --yes hugo-bin version
```

## 5. Validate Content Metadata

```bash
python3 scripts/validate_content.py
```

Expected result:
- `Validated <N> item files successfully.`

## 6. Run Local Site

```bash
npx --yes hugo-bin server -D
```

Open browser:
- http://localhost:1313/

## 7. Run Production Build Locally

To mirror CI/Vercel behavior, remove transient keyword proposal queue before build:

```bash
rm -f data/keyword_proposals.jsonl
npx --yes hugo-bin --gc --minify
```

Expected result:
- `public/index.html` exists

## 8. Ingest New Content (Optional)

Prepare draft:

```bash
python scripts/ingest_item.py prepare \
  --source-input "<url-or-local-path>" \
  --source-date "YYYY-MM-DD" \
  --output /tmp/oaboutai_draft.json
```

Dry-run ingest:

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

## 9. CI/Deployment Notes

GitHub Actions workflow:
- `.github/workflows/docs-site-ci.yml`

CI now includes an auto-resolve step:
- `python scripts/auto_resolve_content_issues.py`

This step auto-handles common blockers before strict validation:
- maps unknown keywords to fallback controlled keyword
- appends unknown keyword terms to `data/keyword_proposals.jsonl`
- removes non-existent attachment references

Vercel deployment requires repository secret:
- `VERCEL_TOKEN`

## 10. Troubleshooting

### A) `unknown keywords [...]` in validation

Cause:
- Item front matter uses keyword IDs not in `data/keywords.json`.

What to do:
- Prefer controlled IDs from `data/keywords.json`.
- Add candidate terms into `data/keyword_proposals.jsonl`.
- Re-run validation.

### B) `attachment ... not found in bundle`

Cause:
- `attachments` lists a file that does not exist in the item bundle.

What to do:
- Put the file under `content/en/items/<slug>/`, or
- remove/fix the attachment path in front matter.

### C) Hugo build fails on `data/keyword_proposals.jsonl`

Cause:
- Hugo data loader does not consume JSONL directly as structured data.

What to do:
- Use build guard before Hugo build:

```bash
rm -f data/keyword_proposals.jsonl
npx --yes hugo-bin --gc --minify
```

### D) `npx --yes hugo-bin` network errors

Cause:
- npm registry unreachable from current environment.

What to do:
- retry with stable network, or
- install Hugo Extended locally and use `hugo` binary directly.

## 11. First Successful Run Checklist

- `python3 scripts/validate_content.py` passes
- `npx --yes hugo-bin server -D` starts and site loads
- `rm -f data/keyword_proposals.jsonl && npx --yes hugo-bin --gc --minify` succeeds
- `public/index.html` exists
