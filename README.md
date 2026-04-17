# OaboutAI Knowledge Archive

[![CI](https://img.shields.io/github/actions/workflow/status/cclljj/OaboutAI/docs-site-ci.yml?branch=main&label=CI)](https://github.com/cclljj/OaboutAI/actions/workflows/docs-site-ci.yml)
[![Production](https://img.shields.io/badge/Production-oaboutai.vercel.app-000?logo=vercel)](https://oaboutai.vercel.app/)
[![Hugo](https://img.shields.io/badge/Hugo-0.152.2-ff4088?logo=hugo)](https://gohugo.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

OaboutAI 是一個雙語（EN / zh-TW）的 AI 治理與安全知識庫。系統採用「公開程式碼 + 私有內容資料」架構，兼顧可維護性與內容保密需求。

Production: [https://oaboutai.vercel.app/](https://oaboutai.vercel.app/)

## Overview

- 目的：將 AI 政策、治理、安全文獻標準化，提供可檢索、可追蹤、可擴充的知識系統。
- 使用者能力：登入、列表/單篇瀏覽、Topic/Keyword/Type 篩選、收藏、中英切換。
- 內容策略：主 repo 不追蹤受保護原文；文章來源由 private repo 在 build 階段注入。

## Architecture

- Frontend shell: Hugo（頁面框架、導覽、版型）
- Auth, access control, favorites: Supabase Auth + RLS tables
- Content source: private repo `cclljj/OaboutAI_data`（Obsidian markdown）
- Pipeline: private Obsidian markdown -> validate/parse -> upsert `public.articles` -> frontend query

關鍵原則：
- 未登入不應直接暴露受保護內容流程。
- production deploy 必須成功讀取 private data repo 才可發布。
- `/items/:slug` 既有連結需持續 rewrite 到 `/item/?slug=:slug`。

## Repository Layout

- `core/`: 共用框架（layouts/assets/scripts）
- `apps/oaboutai/`: app 組態與內容殼層
- `scripts/`: monorepo 入口腳本（compose / validate / build）
- `docs/`: schema、操作手冊、系統測試清單
- `.github/workflows/docs-site-ci.yml`: CI/CD 主流程

## Current Top-level Topics

Current count: `5`

- AI Policy（AI 政策）
- AI Governance（AI 治理）
- AI Safety（AI 安全）
- Agentic AI（代理式 AI）
- Physical AI（物理 AI）

## Local Development

```bash
python3 scripts/compose_site.py --app-id "${APP_ID:-oaboutai}" --output /tmp/oaboutai-site --clean
cd /tmp/oaboutai-site
python3 scripts/sync_topics.py
python3 scripts/auto_resolve_content_issues.py
python3 scripts/validate_content.py
npx --yes hugo-bin server -D
```

Open: `http://localhost:1313/`

## CI/CD Pipeline

Workflow: `.github/workflows/docs-site-ci.yml`

`validate-and-build`:
1. Compose site（不依賴 private data）
2. Sync topics / metadata checks
4. Hugo build + output verification

`deploy-vercel`（`main` push 或 `workflow_dispatch`）:
1. 檢查 `VERCEL_TOKEN`、`OABOUTAI_DATA_REPO_TOKEN`
2. 驗證可讀取 `cclljj/OaboutAI_data`
3. Compose with private data injection
4. Sync topics + auto resolve + validate content metadata
5. Upsert Obsidian content to Supabase `public.articles`
6. Build + deploy to Vercel production
7. Post-deploy smoke tests

## Supabase Tables In Current Runtime

Required:
- `public.articles`（runtime content）
- `public.favorites`
- `public.app_users`
- `public.user_roles`
- `public.access_allowlist`
- `public.access_requests`

Obsidian section contract (required for each EN/zh-TW file):
- `## Executive Summary`
- `## Detailed Notes`
- `## Take-away`

Compatibility note:
- DB column keeps `takeaway_html` name for backward compatibility, while value is markdown parsed from `## Take-away`.

## Taxonomy Rules (Data Ingest)

Topic IDs must be exact and only from:
- `ai-policy`
- `ai-governance`
- `ai-safety`
- `agentic-ai`
- `physical-ai`

Keyword IDs source of truth:
- `apps/oaboutai/data/keywords.json`

Preferred official keyword IDs:
- `regulation`, `risk-management`, `model-evaluation`, `red-teaming`, `incident-reporting`
- `audit`, `standards`, `safety-cases`, `governance-framework`, `public-consultation`, `sovereign-ai`

Validation rules:
- `primary_topic` must not appear in `topics`.
- keyword IDs are never valid topic values.
- keyword aliases should map to canonical IDs defined in `keywords.json`.

## Required Secrets / Env

GitHub Actions secrets:
- `VERCEL_TOKEN`
- `OABOUTAI_DATA_REPO_TOKEN`（GitHub PAT，需可讀 `cclljj/OaboutAI_data`）

Runtime/build env (Vercel or CI):
- `HUGO_SUPABASE_URL`
- `HUGO_SUPABASE_ANON_KEY`
- `HUGO_SUPABASE_REDIRECT_URL`
- `RESEND_API_KEY`
- `OABOUTAI_ADMIN_NOTIFY_EMAIL`（default: `cclljj@gmail.com`）
- `OABOUTAI_RESEND_FROM`（建議必填；需使用 Resend 已驗證網域，例如 `OaboutAI <notify@your-verified-domain.com>`）
- `HUGO_VERCEL_ANALYTICS_ENABLED`（optional；default: `true`）
- `HUGO_VERCEL_SPEED_INSIGHTS_ENABLED`（optional；default: `true`）
- `OABOUTAI_DATA_REPO_URL`（default: `https://github.com/cclljj/OaboutAI_data`）
- `OABOUTAI_DATA_REPO_REF`（default: `main`）
- `OABOUTAI_DATA_REPO_SUBDIR`（default: `obsidian`）

## Operations & Docs

- Setup/Deploy: [INSTALL.md](INSTALL.md)
- Supabase schema: [docs/supabase_schema.sql](docs/supabase_schema.sql)
- Supabase ops: [docs/supabase_operations.md](docs/supabase_operations.md)
- Regression checklist: [docs/system_test_checklist.md](docs/system_test_checklist.md)
- Agent contract: [AGENTS.md](AGENTS.md)

## Data-side setup (AI-agent friendly)

When maintainers only update `cclljj/OaboutAI_data`, they must trigger OaboutAI CI/CD via dispatch.

Required in `OaboutAI_data`:
- Workflow file: `.github/workflows/trigger-oaboutai-cicd.yml`
- Secret: `OABOUTAI_REPO_TRIGGER_TOKEN`
- Token type: Fine-grained PAT (recommended)
- Token target repo: `cclljj/OaboutAI`
- Token minimum permissions:
  - Actions: Read and write
  - Contents: Read

Quick verification steps:
1. Push any change under `OaboutAI_data/obsidian/**`
2. Confirm `trigger-oaboutai-cicd` run is successful (dispatch API should return HTTP 204)
3. Confirm `cclljj/OaboutAI` receives `docs-site-ci` with event `workflow_dispatch`
4. Confirm `deploy-vercel` job runs (not skipped)

## Security Notes

- 不要將 `OABOUTAI_DATA_REPO_TOKEN` 設成 SSH key；必須是單行 PAT。
- 不要將 `OABOUTAI_REPO_TRIGGER_TOKEN` 設成 SSH key；必須是可呼叫 Actions API 的 PAT。
- 若 dispatch 回傳 `Resource not accessible by personal access token`（403），表示 trigger token 權限不足。
