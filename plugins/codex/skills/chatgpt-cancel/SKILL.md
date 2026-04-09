---
name: chatgpt-cancel
description: Use when the user wants to stop, cancel, abort, or kill an active background Codex job from Claude Cowork
user-invocable: true
---

# ChatGPT Cancel

Use this skill when the user wants Cowork to stop an active background Codex job.

Trigger examples:
- "Cancel the ChatGPT run"
- "Stop the background job"
- "Abort that task"
- "Kill the active ChatGPT job"

Primary helper:
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" cancel "$ARGUMENTS"`

Working rules:
- Preserve the helper output exactly as returned.
- If multiple jobs are active and no id was provided, preserve the helper's guidance to specify one.
- Do not guess which job to cancel when the helper says the reference is ambiguous.
