---
name: chatgpt-fact-check
description: User-invocable skill for sending a web-focused fact check to Codex from Claude Cowork
user-invocable: true
---

# ChatGPT Fact Check

Use this skill when the user wants Cowork to ask Codex to verify a claim set, draft, answer, recommendation, or plan against current public sources.

Codex task requirements:
- Actively use web search.
- Prefer primary and official sources.
- Use absolute dates when time matters.
- Separate confirmed facts, false or unsupported claims, and unresolved points.
- Include source links for material claims.
- Keep the output findings-first and compact.

Primary helper:
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" task "<prompt>"`

Working rules:
- This is read-only fact checking.
- Do not ask Codex to edit files.
- If the request is broad, tell Codex to prioritize the highest-impact claims first.
- Return Codex's stdout exactly as-is.
- If Codex is unavailable or unauthenticated, direct the user to `/chatgpt:setup`.
