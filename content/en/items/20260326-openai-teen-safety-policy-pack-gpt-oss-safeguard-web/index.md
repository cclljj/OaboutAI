---
title: "OpenAI Releases Teen Safety Policy Pack for gpt-oss-safeguard (OpenAI)"
date: 2026-03-26T00:00:00+08:00
source_url: "https://openai.com/index/teen-safety-policies-gpt-oss-safeguard/"
source_type: "webpage"
types: ["webpage"]
source_date: "2026-03-26"
submission_date: "2026-03-26"
doc_id: "DOC-20260326-005"
executive_summary: "OpenAI announced an open-source, prompt-based teen safety policy pack designed to work with gpt-oss-safeguard and related reasoning models, aiming to help developers operationalize age-appropriate protections with clearer, reusable policy definitions."
detailed_notes: "This release addresses a common implementation bottleneck in youth safety: developers often lack operational policy definitions that can be consistently enforced by classifiers in real systems. OpenAI’s approach packages teen-relevant safety requirements as prompt-structured policies, which can be directly integrated into gpt-oss-safeguard workflows for both online moderation and offline audits. The initial scope covers six risk domains—graphic violence, graphic sexual content, harmful body ideals/behaviors, dangerous activities/challenges, romantic or violent roleplay, and age-restricted goods/services—reflecting a practical baseline for product teams. OpenAI explicitly frames the pack as a starting floor rather than a complete guarantee, emphasizing layered safeguards (policy + product design + controls + monitoring + age-appropriate responses). The broader governance significance is ecosystem-level standardization: by open-sourcing policy artifacts and inviting adaptation through ROOST/RMC channels, the release seeks to reduce fragmented youth-safety practices and accelerate shared, iteratively improved policy infrastructure."
keywords: ["youth-safety", "content-moderation", "risk-management", "governance-framework", "open-source"]
topics: ["ai-safety", "ai-governance", "ai-policy"]
language: "en"
attachments: []
---

## Detailed Notes

- OpenAI released prompt-based teen safety policies as deployable building blocks for developers.
- The pack is designed for gpt-oss-safeguard but can be adapted to other reasoning-model workflows.
- Main value proposition: convert high-level youth-safety goals into operational classifier-ready rules.
- Initial policy coverage includes six areas: violence, sexual content, body-image harms, dangerous challenges, roleplay risk, and age-restricted goods/services.
- Policies support both real-time filtering and post-hoc/offline analysis pipelines.
- OpenAI emphasizes that policy artifacts alone are insufficient without layered product safeguards.
- External collaborators (e.g., Common Sense Media, everyone.ai) informed scope and edge-case framing.
- The release aligns with OpenAI’s broader U18 strategy (Model Spec principles, parental controls, age prediction).
- Open-source distribution via ROOST/RMC is intended to enable ecosystem iteration and localization.
- Governance impact depends on adoption quality, context-specific adaptation, and transparent evaluation.
