---
name: chatgpt-result
description: Use when the user wants the final output, stored result, resume information, or completion details from a finished Codex job
user-invocable: true
---

# ChatGPT Result

Use this skill when the user wants Cowork to fetch the stored final output from a finished Codex job.

Trigger examples:
- "Show the ChatGPT result"
- "Get the final output from that run"
- "What did the background job finish with?"
- "Give me the resume info for the completed run"

Primary helper:
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" result "$ARGUMENTS"`

Working rules:
- Present the full result exactly as returned.
- Preserve raw output, summaries, file references, errors, and resume information.
- If the job is still active, preserve that status instead of guessing the result.
