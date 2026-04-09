---
name: chatgpt-setup
description: User-invocable skill for checking whether the local Codex runtime is installed and authenticated
user-invocable: true
---

# ChatGPT Setup

Use this skill when the user wants Cowork to check whether the local Codex runtime is ready.

Primary helper:
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" setup --json`

Working rules:
- Run the setup helper first.
- If Codex is unavailable and npm is available, you may offer installation with `npm install -g @openai/codex`.
- If Codex is installed but not authenticated, preserve the guidance to run `!codex login`.
- Present the setup result clearly and do not invent alternate auth flows.
