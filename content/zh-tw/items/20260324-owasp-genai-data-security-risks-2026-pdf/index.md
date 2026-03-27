---
title: "OWASP GenAI 資料安全風險與緩解（2026 v1.0）"
date: 2026-03-24
source_url: "https://genai.owasp.org/download/53429/?tmstv=1773811493"
source_type: "pdf"
types: ["pdf"]
source_date: "2026-03-01"
submission_date: "2026-03-24"
doc_id: "DOC-20260324-009"
executive_summary: "OWASP 2026 指南以資料生命週期視角盤點 GenAI 風險，提出 DSGAI01–21 風險地圖與對應治理/防護方向。"
detailed_notes: "文件將資料層視為 GenAI 安全主戰場，涵蓋敏感資料洩漏、憑證暴露、Shadow AI、投毒、向量庫安全、跨上下文污染、遙測洩漏與模型外流等場景。落地重點包括 AI-DSPM、最小權限、資料分級治理與持續監測。Google Drive 連結：https://drive.google.com/file/d/1WXuaPq9S_WuXnJzfRd0zY729KbMYuLCv/view?usp=drivesdk"
keywords: ["risk-management", "governance-framework", "standards"]
topics: ["ai-safety", "ai-governance", "ai-policy"]
language: "zh-tw"
attachments: []
---

## 詳細筆記

- 報告聚焦生成式 AI 特有的資料風險面。
- 提示與上下文通道被視為高風險資料路徑。
- 資料外洩同時包含誤曝與惡意攻擊情境。
- 檢索與記憶元件是重點防護介面。
- 緩解策略以最小資料與最小權限為核心。
- 預設安全的資料管線是首要預防手段。
- 執行期監測可補足靜態防護不足。
- 建議針對資料外流向量進行紅隊演練。
- 政策規則需對應技術護欄與稽核證據。
- 此文件有助於把風險分類轉為工程控制。
