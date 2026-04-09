---
name: chatgpt-setup
description: Use when the user wants to install, verify, authenticate, or troubleshoot the local Codex runtime used by this plugin
user-invocable: true
---

# ChatGPT Setup

Use this skill when the user wants Cowork to check whether the local Codex runtime is ready.

Trigger examples:
- "Set up ChatGPT"
- "Check whether ChatGPT is installed"
- "Why isn't the local ChatGPT runtime working?"
- "Verify login/auth for ChatGPT"

Primary helper:
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" setup --json`

Working rules:
- Run the setup helper first.
- If Codex is unavailable and npm is available, you may offer installation with `npm install -g @openai/codex`.
- If Codex is installed but not authenticated, prefer `node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" setup --json --start-device-auth` so Cowork can surface the device-auth link and code.
- If the user prefers manual auth, preserve the guidance to run `!codex login --device-auth` or `!codex login --with-api-key`.
- Present the setup result clearly and do not invent alternate auth flows.
