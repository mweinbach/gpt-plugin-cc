---
description: Explain the work done in the current Cowork thread and ask Codex to fact-check it
argument-hint: "[--background|--wait] [--resume|--fresh] [extra fact-check focus]"
context: fork
allowed-tools: Read, Glob, Grep, Bash(node:*), Bash(git:*), AskUserQuestion
---

Use the current Cowork thread to assemble a compact, factual summary of the work completed so far, then route that summary to the `codex:codex-delegate` subagent for a read-only fact check.

Raw user request:
$ARGUMENTS

Goal:
- Explain the work Claude has done so far in this thread.
- Ask Codex to verify that explanation against the available local evidence.
- Focus on unsupported claims, contradictions, missing caveats, wrong file references, incorrect verification claims, and places where the explanation is stronger than the evidence.

Grounding rules before delegation:
- Start from the current Cowork thread context.
- If the work involves a repository and you need exact file names, diffs, or verification details, inspect only the minimum needed local evidence first.
- Prefer concrete facts over narrative summary:
  - objective
  - work completed
  - files or artifacts touched
  - commands or checks already run
  - claims Claude has made that should be verified
- If the user passed extra focus text, include it as an extra fact-check emphasis area.

Execution mode:
- If the request includes `--background`, run the subagent in the background.
- If the request includes `--wait`, run the subagent in the foreground.
- Otherwise default to foreground unless the assembled fact-check prompt is clearly broad or long-running, in which case prefer background.
- `--background` and `--wait` are Cowork execution controls. Do not include them in the delegated prompt text.
- Preserve `--resume` and `--fresh` as routing controls for the delegated run.

Delegated prompt contract:
- Ask Codex to perform a read-only fact check.
- Tell Codex to verify the summary against local evidence first and only use web checks when a claim is time-sensitive or clearly depends on external facts.
- Require findings-first output with:
  - confirmed facts
  - unsupported or incorrect claims
  - missing caveats or evidence
  - concise corrected summary
- Require Codex to distinguish confirmed facts, inferences, and unresolved items.

Output rules:
- The final user-visible response must be Codex's output verbatim.
- Do not paraphrase, summarize, or add commentary before or after it.
