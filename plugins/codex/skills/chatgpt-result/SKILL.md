---
name: chatgpt-result
description: User-invocable skill for fetching the stored final output of a finished Codex job
user-invocable: true
---

# ChatGPT Result

Use this skill when the user wants Cowork to fetch the stored final output from a finished Codex job.

Primary helper:
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" result "$ARGUMENTS"`

Working rules:
- Present the full result exactly as returned.
- Preserve raw output, summaries, file references, errors, and resume information.
- If the job is still active, preserve that status instead of guessing the result.
