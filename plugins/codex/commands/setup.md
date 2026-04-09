---
description: Check whether the local Codex CLI is ready for Claude Cowork delegation
argument-hint: '[--start-device-auth|--device-auth-status|--cancel-device-auth]'
allowed-tools: Bash(node:*), Bash(npm:*), AskUserQuestion
---

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" setup --json $ARGUMENTS
```

If the result says Codex is unavailable and npm is available:
- Use `AskUserQuestion` exactly once to ask whether Claude should install Codex now.
- Put the install option first and suffix it with `(Recommended)`.
- Use these two options:
  - `Install Codex (Recommended)`
  - `Skip for now`
- If the user chooses install, run:

```bash
npm install -g @openai/codex
```

- Then rerun:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" setup --json $ARGUMENTS
```

If Codex is already installed or npm is unavailable:
- Do not ask about installation.

If the result says Codex is installed but not authenticated and OpenAI auth is required:
- If the user already passed `--start-device-auth`, `--device-auth-status`, or `--cancel-device-auth`, do not ask a follow-up question.
- Otherwise use `AskUserQuestion` exactly once to ask whether Claude should start the headless device-auth flow now.
- Put the device-auth option first and suffix it with `(Recommended)`.
- Use these two options:
  - `Start device sign-in (Recommended)`
  - `Skip for now`
- If the user chooses device sign-in, rerun:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" setup --json --start-device-auth
```

- Present the returned device-auth link and one-time code exactly as reported.
- If a device-auth flow is already active, preserve the guidance to complete it in the browser and rerun `/chatgpt:setup` or `/chatgpt:setup --device-auth-status`.

Output rules:
- Present the final setup output to the user.
- If installation was skipped, present the original setup output.
- If Codex is installed but not authenticated, preserve the guidance to use `/chatgpt:setup --start-device-auth` or run `!codex login --device-auth`.
