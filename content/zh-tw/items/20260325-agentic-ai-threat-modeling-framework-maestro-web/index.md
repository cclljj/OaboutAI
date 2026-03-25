---
title: "CSA 提出 MAESTRO：面向 Agentic AI 的七層威脅建模框架"
date: 2026-03-25
source_url: "https://cloudsecurityalliance.org/blog/2025/02/06/agentic-ai-threat-modeling-framework-maestro"
source_type: "webpage"
types: ["webpage"]
source_date: "2025-02-06"
submission_date: "2026-03-25"
doc_id: "DOC-20260325-001"
executive_summary: "Cloud Security Alliance 提出的 MAESTRO 以七層代理式 AI 架構為核心，補上傳統威脅建模在自主性、跨層攻擊鏈與 AI 特有風險上的缺口，並強調持續監控與風險優先治理。"
detailed_notes: "文章比較 STRIDE、PASTA、LINDDUN、OCTAVE、Trike、VAST 後指出其對對抗式機器學習、多代理互動、供應鏈與目標偏移等風險覆蓋不足。MAESTRO 提供分層威脅清單、跨層威脅分析與落地流程，協助團隊在設計到運維全生命週期中進行可稽核的安全治理。"
keywords: ["risk-management", "red-teaming", "governance-framework", "standards"]
topics: ["ai-safety", "ai-governance", "ai-policy"]
language: "zh-tw"
attachments: []
---

## 詳細筆記

- 文中指出傳統框架對 Agentic AI 的主要盲點：自主決策不可預測、目標錯位、模型/資料攻擊，以及多代理互動風險。
- MAESTRO 以七層參考架構拆解威脅面，並將「跨層攻擊鏈」納入核心分析對象。
- 方法論不只列出威脅，還提供實作流程：系統拆解、威脅辨識、風險評分、緩解規劃、持續監控。
- 建議的 AI 特有防護包含：對抗訓練、紅隊演練、可解釋性、形式化驗證與執行期安全監測。
- 對企業落地而言，框架強調防禦縱深、治理機制與可觀測性，以支援稽核與合規要求。
