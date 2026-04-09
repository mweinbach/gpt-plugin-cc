import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN_ROOT = path.join(ROOT, "plugins", "codex");

function read(relativePath) {
  return fs.readFileSync(path.join(PLUGIN_ROOT, relativePath), "utf8");
}

function readSkill(relativePath) {
  return fs.readFileSync(path.join(PLUGIN_ROOT, "skills", relativePath, "SKILL.md"), "utf8");
}

test("only the Cowork-first command set is exposed", () => {
  const commandFiles = fs.readdirSync(path.join(PLUGIN_ROOT, "commands")).sort();
  assert.deepEqual(commandFiles, ["cancel.md", "delegate.md", "fact-check.md", "result.md", "review-work.md", "setup.md", "status.md"]);
});

test("delegate command routes through the codex-delegate subagent and preserves task controls", () => {
  const delegate = read("commands/delegate.md");
  const agent = read("agents/delegate.md");
  const runtimeSkill = read("skills/codex-cli-runtime/SKILL.md");
  const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");

  assert.match(delegate, /allowed-tools:\s*Bash\(node:\*\),\s*AskUserQuestion/);
  assert.match(delegate, /chatgpt:delegate/);
  assert.match(delegate, /task-resume-candidate --json/);
  assert.match(delegate, /Continue current Codex thread/);
  assert.match(delegate, /Start a new Codex thread/);
  assert.match(delegate, /--background\|--wait/);
  assert.match(delegate, /--resume\|--fresh/);
  assert.match(delegate, /--model <model\|spark>/);
  assert.match(delegate, /--effort <none\|minimal\|low\|medium\|high\|xhigh>/);
  assert.match(delegate, /Return the Codex companion stdout verbatim to the user/i);
  assert.match(delegate, /If the helper reports that Codex is missing or unauthenticated, stop and tell the user to run `\/chatgpt:setup`/i);

  assert.match(agent, /thin forwarding wrapper/i);
  assert.match(agent, /Claude Cowork/i);
  assert.match(agent, /Use exactly one `Bash` call/i);
  assert.match(agent, /Do not call `setup`, `status`, `result`, or `cancel`/i);
  assert.match(agent, /Default to a write-capable Codex run/i);
  assert.match(agent, /If the user asks for `spark`, map that to `--model gpt-5\.3-codex-spark`/i);

  assert.match(runtimeSkill, /Use this skill only inside the `chatgpt:delegate` subagent\./);
  assert.match(runtimeSkill, /Use `task` for every delegate request/i);
  assert.match(runtimeSkill, /Do not call `setup`, `status`, `result`, or `cancel`/i);
  assert.match(runtimeSkill, /Default to write-capable Codex work in `chatgpt:delegate`/i);

  assert.match(readme, /# Codex plugin for Claude Cowork/);
  assert.match(readme, /`chatgpt:delegate` subagent/);
  assert.match(readme, /### `\/chatgpt:delegate`/);
  assert.match(readme, /### `\/chatgpt:review-work`/);
  assert.match(readme, /### `\/chatgpt:fact-check`/);
  assert.doesNotMatch(readme, /### `\/codex:review`/);
  assert.doesNotMatch(readme, /\/codex:adversarial-review/);
  assert.doesNotMatch(readme, /\/codex:rescue/);
});

test("review-work and fact-check commands add specialized general-purpose fact-check flows", () => {
  const reviewWork = read("commands/review-work.md");
  const factCheck = read("commands/fact-check.md");

  assert.match(reviewWork, /current Cowork thread/i);
  assert.match(reviewWork, /chatgpt:delegate/);
  assert.match(reviewWork, /read-only fact check/i);
  assert.match(reviewWork, /local evidence first/i);
  assert.match(reviewWork, /confirmed facts/i);
  assert.match(reviewWork, /corrected summary/i);

  assert.match(factCheck, /web-focused fact check/i);
  assert.match(factCheck, /chatgpt:delegate/);
  assert.match(factCheck, /actively use web search/i);
  assert.match(factCheck, /Prefer primary and official sources/i);
  assert.match(factCheck, /use absolute dates when time matters/i);
  assert.match(factCheck, /include source links for material claims/i);
});

test("user-invocable chatgpt skills are packaged for manual Cowork use", () => {
  const skillDirs = fs.readdirSync(path.join(PLUGIN_ROOT, "skills")).sort();
  for (const skillName of [
    "chatgpt-cancel",
    "chatgpt-delegate",
    "chatgpt-fact-check",
    "chatgpt-result",
    "chatgpt-review-work",
    "chatgpt-setup",
    "chatgpt-status"
  ]) {
    assert.equal(skillDirs.includes(skillName), true, `missing ${skillName}`);
    assert.match(readSkill(skillName), /user-invocable:\s*true/);
  }

  assert.match(readSkill("chatgpt-delegate"), /codex-companion\.mjs" task|codex-companion\.mjs" task "<raw arguments>"/);
  assert.match(readSkill("chatgpt-setup"), /codex-companion\.mjs" setup --json|codex-companion\.mjs setup --json/);
  assert.match(readSkill("chatgpt-status"), /codex-companion\.mjs" status|codex-companion\.mjs" status "\$ARGUMENTS"/);
  assert.match(readSkill("chatgpt-result"), /codex-companion\.mjs" result|codex-companion\.mjs" result "\$ARGUMENTS"/);
  assert.match(readSkill("chatgpt-cancel"), /codex-companion\.mjs" cancel|codex-companion\.mjs" cancel "\$ARGUMENTS"/);
  assert.match(readSkill("chatgpt-delegate"), /investigate, fix, implement, research, write, summarize, analyze, continue/i);
  assert.match(readSkill("chatgpt-fact-check"), /claims, drafts, plans, recommendations, dates, pricing, features, or current facts/i);
  assert.match(readSkill("chatgpt-setup"), /install, verify, authenticate, or troubleshoot/i);
  assert.match(readSkill("chatgpt-status"), /check progress, inspect running jobs, wait for completion/i);
  assert.match(readSkill("chatgpt-result"), /final output, stored result, resume information/i);
  assert.match(readSkill("chatgpt-cancel"), /stop, cancel, abort, or kill/i);
});

test("result and cancel commands stay deterministic runtime entrypoints", () => {
  const result = read("commands/result.md");
  const cancel = read("commands/cancel.md");

  assert.match(result, /disable-model-invocation:\s*true/);
  assert.match(result, /codex-companion\.mjs" result "\$ARGUMENTS"/);
  assert.match(cancel, /disable-model-invocation:\s*true/);
  assert.match(cancel, /codex-companion\.mjs" cancel "\$ARGUMENTS"/);
});

test("hooks only keep session lifecycle cleanup", () => {
  const source = read("hooks/hooks.json");
  assert.match(source, /SessionStart/);
  assert.match(source, /SessionEnd/);
  assert.doesNotMatch(source, /Stop/);
  assert.doesNotMatch(source, /stop-review-gate-hook\.mjs/);
});

test("setup can still offer Codex install and preserves codex login guidance", () => {
  const setup = read("commands/setup.md");
  const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");

  assert.match(setup, /argument-hint:\s*'\[--start-device-auth\|--device-auth-status\|--cancel-device-auth\]'/);
  assert.match(setup, /AskUserQuestion/);
  assert.match(setup, /npm install -g @openai\/codex/);
  assert.match(setup, /codex-companion\.mjs" setup --json \$ARGUMENTS/);
  assert.match(setup, /Start device sign-in \(Recommended\)/);
  assert.match(setup, /--start-device-auth/);
  assert.match(setup, /--device-auth-status/);
  assert.match(setup, /--cancel-device-auth/);
  assert.match(readme, /\/chatgpt:setup --start-device-auth/);
  assert.match(readme, /!codex login --device-auth/);
  assert.match(readme, /Codex is missing and npm is available, `\/chatgpt:setup` can offer to install it for you/i);
});
