# OpenSpec Instructions For AI Agents

This `openspec/` tree is the behavior source of truth for OaboutAI. Read `openspec/project.md` first, then the capability specs under `openspec/specs/`.

When changing the application:

- Update the relevant `spec.md` whenever deployed behavior changes.
- Put implementation details, file paths, commands, schemas, and operational notes in `design.md`.
- Keep `spec.md` behavior-first and verifiable.
- Use `### Requirement: ...` headings and `#### Scenario: ...` sections.
- Use `**GIVEN**`, `**WHEN**`, `**THEN**`, and `**AND**` bullets in scenarios.
- Do not document protected article body content in examples.
- Preserve the security constraints in `openspec/project.md` and root `AGENTS.md`.
- For Supabase schema changes, ensure the SQL includes same-file `REVOKE`, explicit `GRANT`, RLS enablement, and policies.

If code and specs disagree, treat the mismatch as a project risk. Do not silently change security behavior just to make the documents look tidy.

