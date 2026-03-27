---
title: OpenAI 發布青少年安全政策包：支援 gpt-oss-safeguard（OpenAI）
date: 2026-03-26 00:00:00+08:00
source_url: https://openai.com/index/teen-safety-policies-gpt-oss-safeguard/
source_type: webpage
types:
- webpage
source_date: '2026-03-26'
submission_date: '2026-03-26'
doc_id: DOC-20260326-005
executive_summary: OpenAI 宣布開源「青少年安全政策包」，以 prompt 形式提供可操作規則，搭配 gpt-oss-safeguard 與其他推理模型，協助開發者更一致地落實符合年齡分級的保護機制。
detailed_notes: 此發布聚焦於青少年安全落地的核心痛點：許多團隊知道要保護未成年使用者，但缺少可直接部署、可重複執行的政策定義，導致規則不一致或防護空窗。OpenAI
  將政策做成可直接餵入模型/分類器的 prompt 結構，讓開發者可在即時內容過濾與離線審核流程中快速套用。首波涵蓋六類風險：暴力、性內容、身體意象與有害行為、危險挑戰、戀愛或暴力角色扮演、年齡限制商品與服務。OpenAI
  同時強調此政策包只是起點，不是完整保證，必須與產品設計、使用者控制、監測與年齡適配回應等防護層共同運作。其治理意義在於把青少年安全由單點內規推向生態系共用基礎：透過
  ROOST/RMC 開源協作，促進跨團隊、跨語言、可迭代的政策標準化能力。
keywords:
- governance-framework
- risk-management
topics:
- ai-safety
- ai-policy
language: zh-tw
attachments: []
primary_topic: ai-governance
---

## 詳細筆記

- OpenAI 以 prompt 形式釋出可直接採用的青少年安全政策模板。
- 政策包可搭配 gpt-oss-safeguard，也可延伸到其他推理模型流程。
- 核心價值是把抽象安全原則轉成可執行、可稽核的實務規則。
- 首波風險範圍含六類：暴力、性內容、身體意象、危險挑戰、角色扮演風險、年齡限制品。
- 可同時支援即時攔截與離線內容分析兩種治理場景。
- OpenAI 明確指出單靠政策包不足，需搭配多層防護機制。
- 外部專家組織參與，提升了範圍設計與邊界情境處理品質。
- 本次發布與其 U18 方針（Model Spec、家長控制、年齡推估）相互銜接。
- 透過 ROOST/RMC 開源渠道，政策可被在地化、擴充與持續改良。
- 長期成效取決於採用品質、情境化調整與透明評估機制。
