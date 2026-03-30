# OaboutAI Knowledge Archive

[![CI](https://img.shields.io/github/actions/workflow/status/cclljj/OaboutAI/docs-site-ci.yml?branch=main&label=CI)](https://github.com/cclljj/OaboutAI/actions/workflows/docs-site-ci.yml)
[![Demo Site](https://img.shields.io/badge/Demo-oaboutai.vercel.app-000?logo=vercel)](https://oaboutai.vercel.app/)
[![Hugo](https://img.shields.io/badge/Hugo-0.152.2-ff4088?logo=hugo)](https://gohugo.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/cclljj/OaboutAI/pulls)

OaboutAI 是一個雙語（EN / zh-TW）的 AI 文獻知識庫網站，重點在「可搜尋、可分類、可追蹤」，並透過登入保護內容。

Production site: [https://oaboutai.vercel.app/](https://oaboutai.vercel.app/)

## 3 分鐘快速理解

如果你是第一次接觸這個專案，可以先知道這 5 件事：
1. 這是一個 AI 文獻整理平台，不是一般部落格。
2. 使用者登入後，才能閱讀完整內容。
3. 文章資料存在資料庫（Supabase），不是放在 GitHub 公開 markdown。
4. 可以用 Topic / Keyword / Type 快速篩選，並把文章加入個人收藏。
5. 網站是雙語（英文 / 繁中），可直接切換語系閱讀。

## 專案目的

這個專案解決的問題：
- 把分散的 AI 政策/治理/安全文獻整理成可持續維護的知識庫
- 提供一致的分類方式（topics / keywords / types）
- 讓內容能被授權使用者安全瀏覽，不直接暴露在公開 repo 的 HTML/markdown

## 主要功能（使用者視角）

- Google 登入（OAuth）
- 文章列表與單篇閱讀
- 依 `Topic / Keyword / Type` 瀏覽與篩選
- 依 `source date / submission date` 排序、分頁
- 個人收藏（My Favorites）
- 中英切換

## 系統怎麼運作（簡版）

- 前端與版型：Hugo（負責 shell、導覽、頁面框架）
- 內容資料：Supabase `public.articles`
- 收藏資料：Supabase `public.favorites`
- 存取控制：Supabase Auth + RLS

重點：
- GitHub repo 不再作為受保護文章正文的 production source of truth
- 未登入僅看到網站框架，登入後才從 Supabase 載入內容

## 專案結構

- `core/`: 共用框架（layouts/assets/scripts）
- `apps/oaboutai/`: app 設定與內容殼層
- `docs/`: DB、流程、測試清單
- `scripts/`: compose/build/驗證與自動化腳本

## 快速開始（本機）

```bash
python3 scripts/compose_site.py --app-id "${APP_ID:-oaboutai}" --output /tmp/oaboutai-site --clean
cd /tmp/oaboutai-site
python3 scripts/sync_topics.py
npx --yes hugo-bin server -D
```

開啟：`http://localhost:1313/`

## 部署需求（Vercel）

需要設定這 3 個環境變數：
- `HUGO_SUPABASE_URL`
- `HUGO_SUPABASE_ANON_KEY`
- `HUGO_SUPABASE_REDIRECT_URL`

CI workflow：`.github/workflows/docs-site-ci.yml`  
主要流程：compose -> validate -> build -> deploy -> post-deploy smoke tests

## 文件導覽

- [INSTALL.md](INSTALL.md): 安裝、執行、部署、Supabase 設定
- [docs/supabase_schema.sql](docs/supabase_schema.sql): 資料表與 RLS
- [docs/supabase_operations.md](docs/supabase_operations.md): 日常資料操作與排錯
- [docs/system_test_checklist.md](docs/system_test_checklist.md): 回歸測試與 release checklist
- [AGENTS.md](AGENTS.md): AI/自動化代理的操作契約
- [docs/openclaw_ingestion_workflow.md](docs/openclaw_ingestion_workflow.md): OpenClaw（legacy/staging）流程

## 常見問答（FAQ）

Q1. 為什麼 GitHub 裡看不到文章完整內容？  
A: 目前採用受保護內容架構，文章內容以 Supabase 為準，避免公開 repo 直接外流。

Q2. 沒登入可以看什麼？  
A: 可以看到網站框架與導覽，但看不到受保護文章正文。

Q3. 為什麼要用 Google 登入？  
A: 用來做基礎授權控管，並支援每位使用者自己的收藏清單。

Q4. 這個專案是給誰用的？  
A: 給需要持續追蹤 AI 文獻、政策與治理資訊的研究者、PM、策略或治理團隊。
