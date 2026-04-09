---
name: chatgpt-cancel
description: User-invocable skill for cancelling an active Codex job from Claude Cowork
user-invocable: true
---

# ChatGPT Cancel

Use this skill when the user wants Cowork to stop an active background Codex job.

Primary helper:
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" cancel "$ARGUMENTS"`

Working rules:
- Preserve the helper output exactly as returned.
- If multiple jobs are active and no id was provided, preserve the helper's guidance to specify one.
- Do not guess which job to cancel when the helper says the reference is ambiguous.
