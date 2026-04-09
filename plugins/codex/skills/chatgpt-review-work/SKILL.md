---
name: chatgpt-review-work
description: User-invocable skill for asking Codex to fact-check Claude's explanation of work completed in the current thread
user-invocable: true
---

# ChatGPT Review Work

Use this skill when the user wants Cowork to summarize the work done so far and have Codex fact-check that summary.

Workflow:
- Start from the current Cowork thread context.
- If exact files, diffs, or verification details matter, inspect the minimum local evidence needed first.
- Build a compact factual summary covering:
  - objective
  - work completed
  - files or artifacts touched
  - checks or verification already run
  - claims that should be verified
- Then send a read-only Codex task asking for a findings-first fact check of that summary.

Codex task requirements:
- Verify against local evidence first.
- Only use web checks when a claim is external or time-sensitive.
- Separate confirmed facts, unsupported claims, missing caveats, and a corrected summary.

Primary helper:
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" task "<prompt>"`

Output rules:
- Return Codex's stdout exactly as-is.
- If Codex is unavailable or unauthenticated, direct the user to `/chatgpt:setup`.
