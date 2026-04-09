---
name: chatgpt-delegate
description: Use when the user wants to investigate, fix, implement, research, write, summarize, analyze, continue, or hand a substantial task off to the local Codex runtime from Claude Cowork
user-invocable: true
---

# ChatGPT Delegate

Use this skill when the user wants Cowork to hand a substantial task to Codex.

Trigger examples:
- "Ask ChatGPT to investigate why this broke"
- "Have ChatGPT fix the failing test"
- "Continue the last ChatGPT run"
- "Use ChatGPT to research this API migration"

Primary helper:
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" task "<raw arguments>"`

Working rules:
- This skill is a thin handoff to the Codex runtime.
- Prefer exactly one `task` invocation.
- Preserve the user's task text as-is apart from stripping routing flags.
- Treat `--background` and `--wait` as Cowork execution controls, not part of the delegated prompt.
- Treat `--resume`, `--fresh`, `--model`, and `--effort` as runtime controls, not task text.
- Map `spark` to `--model gpt-5.3-codex-spark`.
- Default to `--write` unless the user explicitly asks for read-only behavior or only wants research, diagnosis, or analysis.
- If the user clearly wants to continue prior Codex work, prefer `--resume-last`.
- Return the command stdout exactly as-is.
- If Codex is unavailable or unauthenticated, direct the user to `/chatgpt:setup`.
