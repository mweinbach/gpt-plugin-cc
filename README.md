# Codex plugin for Claude Cowork

Use Codex from inside Claude Cowork to hand off substantial tasks and manage them as tracked background jobs.

This version is Cowork-first and general-purpose. It is built around one main flow: delegate work to your local Codex CLI, then check status, inspect the result, or cancel the run without leaving Cowork.

## What You Get

- `/codex:delegate` for general Codex handoff
- `/codex:review-work` to have Codex fact-check Claude's explanation of the work done so far
- `/codex:fact-check` for web-focused fact checking of claims, drafts, answers, and plans
- `/codex:setup` to verify local Codex install and auth
- `/codex:status` to inspect running and recent jobs
- `/codex:result` to fetch the stored final output for a finished job
- `/codex:cancel` to stop a running background job
- the `codex:codex-delegate` subagent in `/agents`

## Requirements

- ChatGPT subscription or OpenAI API key for Codex
- Node.js 18.18 or later
- A local `codex` CLI installation on the same machine as Cowork

## Install In Cowork

Cowork plugins use the same file-based plugin packaging model as Claude plugins. Install this plugin through Cowork's plugin customization flow.

Typical local install flow:

1. Package this repository so the `.claude-plugin/` folder and `plugins/codex/` contents are included.
2. In Cowork, open the plugin customization UI.
3. Import the packaged plugin or connect the source repository.
4. Reload plugins if Cowork prompts for it.

Then run:

```bash
/codex:setup
```

If Codex is missing and npm is available, `/codex:setup` can offer to install it for you. If Codex is installed but not authenticated, use:

```bash
!codex login
```

## Usage

### `/codex:delegate`

Delegate a task to Codex. This is the primary command.

It supports:

- `--background`
- `--wait`
- `--resume`
- `--fresh`
- `--model <model|spark>`
- `--effort <none|minimal|low|medium|high|xhigh>`

Examples:

```bash
/codex:delegate investigate why the tests started failing
/codex:delegate write release notes from the latest merged changes
/codex:delegate research the best migration path for this API
/codex:delegate --background fix the failing integration test with the smallest safe patch
/codex:delegate --resume apply the top fix from the last run
/codex:delegate --model gpt-5.4-mini --effort medium analyze the flaky benchmark results
/codex:delegate --model spark summarize the issue and propose the fastest next step
```

Behavior notes:

- If you omit `--model` and `--effort`, Codex uses its normal defaults.
- `spark` maps to `gpt-5.3-codex-spark`.
- If you omit `--resume` and `--fresh`, the plugin can offer to continue the latest delegate thread for the current Cowork session.
- By default the delegate subagent prefers write-capable Codex runs unless your request is clearly read-only.

### `/codex:review-work`

Ask Claude to summarize the work done in the current Cowork thread and have Codex fact-check that explanation.

Use it when you want:

- a second pass on whether Claude described the work accurately
- verification that claimed files, checks, or outcomes match the evidence
- a tighter corrected summary before you send or publish something

Examples:

```bash
/codex:review-work
/codex:review-work focus on whether the claimed verification actually happened
/codex:review-work --background double-check the implementation summary before I send it
```

This command is read-only. It uses local evidence first and only falls back to web checks when a claim is time-sensitive or external.

### `/codex:fact-check`

Run a web-focused fact check through Codex.

Use it when you want:

- a draft or answer verified against current public sources
- claims checked for stale information, wrong dates, or unsupported assertions
- a corrected version with explicit source-backed changes

Examples:

```bash
/codex:fact-check verify this launch summary before I send it
/codex:fact-check check whether these pricing and feature claims are still current
/codex:fact-check --background fact-check this recommendation memo against current vendor docs
```

This command is read-only and asks Codex to use web search actively.

### `/codex:setup`

Checks whether Codex is installed and authenticated on the local machine Cowork is using.

If Codex is missing and npm is available, Cowork can offer to install it automatically.

### `/codex:status`

Shows running and recent Codex jobs for the current repository.

Examples:

```bash
/codex:status
/codex:status task-abc123
/codex:status task-abc123 --wait
```

### `/codex:result`

Shows the stored final Codex output for a finished job.

Examples:

```bash
/codex:result
/codex:result task-abc123
```

When available, the output also includes the Codex session ID so you can reopen that run directly in Codex with `codex resume <session-id>`.

### `/codex:cancel`

Cancels an active background Codex job.

Examples:

```bash
/codex:cancel
/codex:cancel task-abc123
```

## Typical Flows

### Hand a problem to Codex

```bash
/codex:delegate investigate why the build is failing in CI
```

### Start something long-running

```bash
/codex:delegate --background migrate this script to TypeScript and verify it still works
```

Then check in with:

```bash
/codex:status
/codex:result
```

### Continue an earlier Codex run

```bash
/codex:delegate --resume keep going and land the smallest safe fix
```

## Codex Integration

The plugin wraps the [Codex app server](https://developers.openai.com/codex/app-server). It uses the local `codex` binary installed in your environment and applies the same Codex configuration you would use directly.

### Common Configurations

If you want to change the default reasoning effort or model used by delegated runs, define that in your user-level or project-level Codex config.

For example, to default a project to `gpt-5.4-mini` with `high` effort:

```toml
model = "gpt-5.4-mini"
model_reasoning_effort = "high"
```

Config lookup follows normal Codex behavior:

- `~/.codex/config.toml`
- `.codex/config.toml`

See the Codex docs for more:

- [Configuration basics](https://developers.openai.com/codex/config-basic)
- [Configuration reference](https://developers.openai.com/codex/config-reference)

## FAQ

### Does this use a separate Codex runtime?

No. It delegates through your local [Codex CLI](https://developers.openai.com/codex/cli/) and [Codex app server](https://developers.openai.com/codex/app-server/).

### Does it use the same local auth and config as Codex?

Yes. The plugin uses the same machine-local Codex install, auth state, and config files you would use directly.

### Can I move the work into Codex later?

Yes. Finished delegate jobs include the Codex session ID when available, so you can continue them directly with `codex resume <session-id>`.
