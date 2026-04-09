---
name: chatgpt-review-work
description: Use when the user wants Claude's work summary, claimed verification, touched files, or reported outcomes checked against local evidence from the current thread
user-invocable: true
---

# ChatGPT Review Work

Use this skill when the user wants Cowork to summarize the work done so far and have Codex fact-check that summary.

Trigger examples:
- "Review the work you've done so far"
- "Double-check your implementation summary"
- "Fact-check the claimed verification"
- "Make sure your description of the changes is accurate"

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
