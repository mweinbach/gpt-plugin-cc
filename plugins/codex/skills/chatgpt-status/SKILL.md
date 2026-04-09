---
name: chatgpt-status
description: User-invocable skill for checking active and recent Codex jobs from Claude Cowork
user-invocable: true
---

# ChatGPT Status

Use this skill when the user wants Cowork to inspect current or recent Codex jobs.

Primary helper:
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" status "$ARGUMENTS"`

Working rules:
- If the user gives a job id, show the full status output for that job.
- If the user does not give a job id, prefer the compact session status view.
- Preserve job ids, statuses, phases, summaries, and follow-up actions exactly as reported.
