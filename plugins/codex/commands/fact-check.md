---
description: Send a web-focused fact check to Codex for a draft, answer, plan, or claim set
argument-hint: "[--background|--wait] [--resume|--fresh] [what to fact-check]"
context: fork
allowed-tools: Bash(node:*), AskUserQuestion
---

Route this request to the `chatgpt:delegate` subagent as a read-only, web-focused fact check.

Raw user request:
$ARGUMENTS

Goal:
- Have Codex search the web and fact-check the claims, draft, answer, plan, or recommendations in scope.
- Prefer primary and official sources when they exist.
- Emphasize currentness, explicit dates, contradictions across sources, and unsupported claims.

Execution mode:
- If the request includes `--background`, run the subagent in the background.
- If the request includes `--wait`, run the subagent in the foreground.
- Otherwise default to foreground for a short claim set and prefer background for anything broader.
- `--background` and `--wait` are Cowork execution controls. Do not include them in the delegated prompt text.
- Preserve `--resume` and `--fresh` as routing controls for the delegated run.

Delegated prompt contract:
- Ask Codex to actively use web search.
- Require it to:
  - verify each material claim
  - use absolute dates when time matters
  - separate confirmed facts, plausible inferences, and unresolved points
  - note when a source is outdated or lower confidence
  - include source links for material claims
- Prefer compact findings-first output with:
  - confirmed
  - false or unsupported
  - unclear
  - corrected version

Safety and scope:
- This is fact-checking only.
- Do not ask Codex to edit files or perform write-capable work.
- If the request is empty, ask the user what should be fact-checked.

Output rules:
- The final user-visible response must be Codex's output verbatim.
- Do not paraphrase, summarize, or add commentary before or after it.
