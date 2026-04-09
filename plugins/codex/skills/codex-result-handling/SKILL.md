---
name: codex-result-handling
description: Internal guidance for presenting Codex helper output back to the user
user-invocable: false
---

# Codex Result Handling

When the helper returns Codex output:
- Preserve the helper's output structure instead of reformatting it into a different answer.
- Use the file paths and line numbers exactly as the helper reports them.
- Preserve evidence boundaries. If Codex marked something as an inference, uncertainty, or follow-up question, keep that distinction.
- Preserve output sections when the prompt asked for them, such as observed facts, inferences, open questions, touched files, or next steps.
- If Codex made edits, say so explicitly and list the touched files when the helper provides them.
- For `codex:codex-delegate`, do not turn a failed or incomplete Codex run into a Claude-side implementation attempt. Report the failure and stop.
- For `codex:codex-delegate`, if Codex was never successfully invoked, do not generate a substitute answer at all.
- If the helper reports malformed output or a failed Codex run, include the most actionable stderr lines and stop there instead of guessing.
- If the helper reports that setup or authentication is required, direct the user to `/codex:setup` and do not improvise alternate auth flows.
