import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { buildEnv, installFakeCodex } from "./fake-codex-fixture.mjs";
import { initGitRepo, makeTempDir, run } from "./helpers.mjs";
import { resolveStateDir } from "../plugins/codex/scripts/lib/state.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN_ROOT = path.join(ROOT, "plugins", "codex");
const SCRIPT = path.join(PLUGIN_ROOT, "scripts", "codex-companion.mjs");
const SESSION_HOOK = path.join(PLUGIN_ROOT, "scripts", "session-lifecycle-hook.mjs");

async function waitFor(predicate, { timeoutMs = 5000, intervalMs = 50 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = await predicate();
    if (value) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("Timed out waiting for condition.");
}

function writeState(cwd, state) {
  const stateDir = resolveStateDir(cwd);
  fs.mkdirSync(path.join(stateDir, "jobs"), { recursive: true });
  fs.writeFileSync(path.join(stateDir, "state.json"), `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return stateDir;
}

function writeStoredJob(cwd, jobId, payload) {
  const stateDir = resolveStateDir(cwd);
  const jobsDir = path.join(stateDir, "jobs");
  fs.mkdirSync(jobsDir, { recursive: true });
  fs.writeFileSync(path.join(jobsDir, `${jobId}.json`), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function baseState(jobs = []) {
  return {
    version: 1,
    config: {
      stopReviewGate: false
    },
    jobs
  };
}

test("setup reports ready when fake codex is installed and authenticated", () => {
  const binDir = makeTempDir();
  installFakeCodex(binDir);

  const result = run("node", [SCRIPT, "setup", "--json"], {
    cwd: ROOT,
    env: buildEnv(binDir)
  });

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ready, true);
  assert.match(payload.codex.detail, /advanced runtime available/);
  assert.equal(payload.sessionRuntime.mode, "direct");
});

test("setup can start and cancel a headless device-auth flow", () => {
  const repo = makeTempDir();
  const binDir = makeTempDir();
  installFakeCodex(binDir, "device-auth-pending");

  const started = run("node", [SCRIPT, "setup", "--json", "--start-device-auth"], {
    cwd: repo,
    env: buildEnv(binDir)
  });

  assert.equal(started.status, 0, started.stderr);
  const startedPayload = JSON.parse(started.stdout);
  assert.equal(startedPayload.ready, false);
  assert.equal(startedPayload.auth.loggedIn, false);
  assert.equal(startedPayload.deviceAuth.status, "pending");
  assert.equal(startedPayload.deviceAuth.url, "https://auth.openai.com/codex/device");
  assert.equal(startedPayload.deviceAuth.code, "ABCD-EFGH");

  const cancelled = run("node", [SCRIPT, "setup", "--json", "--cancel-device-auth"], {
    cwd: repo,
    env: buildEnv(binDir)
  });

  assert.equal(cancelled.status, 0, cancelled.stderr);
  const cancelledPayload = JSON.parse(cancelled.stdout);
  assert.equal(cancelledPayload.deviceAuth, null);
  assert.match(cancelledPayload.actionsTaken[0], /Cancelled the active device-auth flow/);
});

test("delegate runs when the active provider does not require OpenAI login", () => {
  const repo = makeTempDir();
  const binDir = makeTempDir();
  installFakeCodex(binDir, "provider-no-auth");
  initGitRepo(repo);
  fs.writeFileSync(path.join(repo, "README.md"), "hello\n");
  run("git", ["add", "README.md"], { cwd: repo });
  run("git", ["commit", "-m", "init"], { cwd: repo });

  const result = run("node", [SCRIPT, "delegate", "check auth preflight"], {
    cwd: repo,
    env: buildEnv(binDir)
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "Handled the requested task.\nTask prompt accepted.\n");
});

test("delegate reports the actual Codex auth error when the run is rejected", () => {
  const repo = makeTempDir();
  const binDir = makeTempDir();
  installFakeCodex(binDir, "auth-run-fails");
  initGitRepo(repo);
  fs.writeFileSync(path.join(repo, "README.md"), "hello\n");
  run("git", ["add", "README.md"], { cwd: repo });
  run("git", ["commit", "-m", "init"], { cwd: repo });

  const result = run("node", [SCRIPT, "delegate", "check failed auth"], {
    cwd: repo,
    env: buildEnv(binDir)
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /authentication expired; run codex login/);
});

test("delegate --resume-last resumes the latest persisted task thread", () => {
  const repo = makeTempDir();
  const binDir = makeTempDir();
  installFakeCodex(binDir);
  initGitRepo(repo);
  fs.writeFileSync(path.join(repo, "README.md"), "hello\n");
  run("git", ["add", "README.md"], { cwd: repo });
  run("git", ["commit", "-m", "init"], { cwd: repo });

  const firstRun = run("node", [SCRIPT, "delegate", "initial task"], {
    cwd: repo,
    env: buildEnv(binDir)
  });
  assert.equal(firstRun.status, 0, firstRun.stderr);

  const resumed = run("node", [SCRIPT, "delegate", "--resume-last", "follow up"], {
    cwd: repo,
    env: buildEnv(binDir)
  });

  assert.equal(resumed.status, 0, resumed.stderr);
  assert.equal(resumed.stdout, "Resumed the prior run.\nFollow-up prompt accepted.\n");
});

test("task-resume-candidate returns the latest delegate thread from the current session", () => {
  const repo = makeTempDir();
  const sessionId = "sess-current";
  writeState(
    repo,
    baseState([
      {
        id: "task-current",
        status: "completed",
        title: "Codex Delegate",
        jobClass: "task",
        sessionId,
        threadId: "thr_current",
        summary: "Current session delegate",
        updatedAt: "2026-04-09T12:00:03.000Z"
      },
      {
        id: "task-other-session",
        status: "completed",
        title: "Codex Delegate",
        jobClass: "task",
        sessionId: "sess-other",
        threadId: "thr_other",
        summary: "Old session delegate",
        updatedAt: "2026-04-09T12:00:02.000Z"
      },
      {
        id: "job-other-kind",
        status: "completed",
        title: "Other Job",
        jobClass: "job",
        sessionId,
        threadId: "thr_misc",
        summary: "Ignore me",
        updatedAt: "2026-04-09T12:00:04.000Z"
      }
    ])
  );

  const result = run("node", [SCRIPT, "task-resume-candidate", "--json"], {
    cwd: repo,
    env: {
      ...process.env,
      CODEX_COMPANION_SESSION_ID: sessionId
    }
  });

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.available, true);
  assert.equal(payload.candidate.id, "task-current");
  assert.equal(payload.candidate.threadId, "thr_current");
});

test("session start hook exports the Cowork session id and plugin data dir", () => {
  const envFile = path.join(makeTempDir(), "hook-env.sh");
  const pluginDataDir = makeTempDir();

  const result = run("node", [SESSION_HOOK, "SessionStart"], {
    cwd: ROOT,
    env: {
      ...process.env,
      CLAUDE_ENV_FILE: envFile,
      CLAUDE_PLUGIN_DATA: pluginDataDir
    },
    input: JSON.stringify({
      hook_event_name: "SessionStart",
      session_id: "sess-current"
    })
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    fs.readFileSync(envFile, "utf8"),
    `export CODEX_COMPANION_SESSION_ID='sess-current'\nexport CLAUDE_PLUGIN_DATA='${pluginDataDir}'\n`
  );
});

test("delegate strips resume and fresh routing flags from the forwarded prompt", () => {
  const repo = makeTempDir();
  const binDir = makeTempDir();
  installFakeCodex(binDir);
  initGitRepo(repo);
  fs.writeFileSync(path.join(repo, "README.md"), "hello\n");
  run("git", ["add", "README.md"], { cwd: repo });
  run("git", ["commit", "-m", "init"], { cwd: repo });

  const firstRun = run("node", [SCRIPT, "delegate", "initial task"], {
    cwd: repo,
    env: buildEnv(binDir)
  });
  assert.equal(firstRun.status, 0, firstRun.stderr);

  const resumed = run("node", [SCRIPT, "delegate", "--resume", "follow up"], {
    cwd: repo,
    env: buildEnv(binDir)
  });
  assert.equal(resumed.status, 0, resumed.stderr);

  const fresh = run("node", [SCRIPT, "delegate", "--fresh", "diagnose the flaky test"], {
    cwd: repo,
    env: buildEnv(binDir)
  });
  assert.equal(fresh.status, 0, fresh.stderr);

  const state = JSON.parse(fs.readFileSync(path.join(binDir, "fake-codex-state.json"), "utf8"));
  assert.equal(state.lastTurnStart.prompt, "diagnose the flaky test");
});

test("delegate forwards model selection and reasoning effort to app-server turn/start", () => {
  const repo = makeTempDir();
  const binDir = makeTempDir();
  installFakeCodex(binDir);
  initGitRepo(repo);
  fs.writeFileSync(path.join(repo, "README.md"), "hello\n");
  run("git", ["add", "README.md"], { cwd: repo });
  run("git", ["commit", "-m", "init"], { cwd: repo });

  const result = run("node", [SCRIPT, "delegate", "--model", "spark", "--effort", "low", "diagnose the failing test"], {
    cwd: repo,
    env: buildEnv(binDir)
  });

  assert.equal(result.status, 0, result.stderr);
  const fakeState = JSON.parse(fs.readFileSync(path.join(binDir, "fake-codex-state.json"), "utf8"));
  assert.equal(fakeState.lastTurnStart.model, "gpt-5.3-codex-spark");
  assert.equal(fakeState.lastTurnStart.effort, "low");
});

test("delegate logs reasoning summaries and subagent messages to the job log", () => {
  const repo = makeTempDir();
  const binDir = makeTempDir();
  installFakeCodex(binDir, "with-subagent");
  initGitRepo(repo);
  fs.writeFileSync(path.join(repo, "README.md"), "hello\n");
  run("git", ["add", "README.md"], { cwd: repo });
  run("git", ["commit", "-m", "init"], { cwd: repo });

  const result = run("node", [SCRIPT, "delegate", "challenge the current design"], {
    cwd: repo,
    env: buildEnv(binDir)
  });

  assert.equal(result.status, 0, result.stderr);

  const jobsDir = path.join(resolveStateDir(repo), "jobs");
  const logFile = fs.readdirSync(jobsDir).find((entry) => entry.endsWith(".log"));
  const log = fs.readFileSync(path.join(jobsDir, logFile), "utf8");
  assert.match(log, /Starting subagent design-challenger via collaboration tool: wait\./);
  assert.match(log, /Questioned the retry strategy and the cache invalidation boundaries\./);
  assert.match(log, /Handled the requested task\./);
});

test("delegate --background enqueues a detached worker and exposes status and result", async () => {
  const repo = makeTempDir();
  const binDir = makeTempDir();
  installFakeCodex(binDir, "slow-task");
  initGitRepo(repo);
  fs.writeFileSync(path.join(repo, "README.md"), "hello\n");
  run("git", ["add", "README.md"], { cwd: repo });
  run("git", ["commit", "-m", "init"], { cwd: repo });

  const launched = run("node", [SCRIPT, "delegate", "--background", "--json", "investigate the failing test"], {
    cwd: repo,
    env: buildEnv(binDir)
  });

  assert.equal(launched.status, 0, launched.stderr);
  const launchPayload = JSON.parse(launched.stdout);
  assert.equal(launchPayload.status, "queued");
  assert.match(launchPayload.jobId, /^task-/);

  const waitedStatus = run("node", [SCRIPT, "status", launchPayload.jobId, "--wait", "--timeout-ms", "15000", "--json"], {
    cwd: repo,
    env: buildEnv(binDir)
  });

  assert.equal(waitedStatus.status, 0, waitedStatus.stderr);
  const waitedPayload = JSON.parse(waitedStatus.stdout);
  assert.equal(waitedPayload.job.status, "completed");
  assert.equal(waitedPayload.job.kindLabel, "delegate");

  const resultPayload = await waitFor(() => {
    const result = run("node", [SCRIPT, "result", launchPayload.jobId, "--json"], {
      cwd: repo,
      env: buildEnv(binDir)
    });
    if (result.status !== 0) {
      return null;
    }
    return JSON.parse(result.stdout);
  });

  assert.equal(resultPayload.job.id, launchPayload.jobId);
  assert.equal(resultPayload.job.status, "completed");
  assert.match(resultPayload.storedJob.rendered, /Handled the requested task/);
});

test("status shows delegate labels and only includes jobs from the current session by default", () => {
  const repo = makeTempDir();
  const sessionId = "sess-current";
  const stateDir = writeState(
    repo,
    baseState([
      {
        id: "task-current",
        kind: "delegate",
        kindLabel: "delegate",
        status: "running",
        title: "Codex Delegate",
        jobClass: "task",
        phase: "investigating",
        createdAt: "2026-04-09T12:00:00.000Z",
        updatedAt: "2026-04-09T12:00:05.000Z",
        sessionId,
        threadId: "thr_current",
        summary: "Current session delegate",
        logFile: path.join(resolveStateDir(repo), "jobs", "task-current.log")
      },
      {
        id: "task-other",
        kind: "delegate",
        kindLabel: "delegate",
        status: "completed",
        title: "Codex Delegate",
        jobClass: "task",
        createdAt: "2026-04-09T12:00:00.000Z",
        updatedAt: "2026-04-09T12:00:04.000Z",
        completedAt: "2026-04-09T12:00:04.000Z",
        sessionId: "sess-other",
        threadId: "thr_other",
        summary: "Other session delegate"
      }
    ])
  );
  fs.writeFileSync(path.join(stateDir, "jobs", "task-current.log"), "[2026-04-09T12:00:05.000Z] Running tool: search_code.\n", "utf8");

  const result = run("node", [SCRIPT, "status"], {
    cwd: repo,
    env: {
      ...process.env,
      CODEX_COMPANION_SESSION_ID: sessionId
    }
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\| task-current \| delegate \| running \| investigating \|/);
  assert.doesNotMatch(result.stdout, /task-other/);
  assert.doesNotMatch(result.stdout, /Review gate/);
});

test("result without a job id prefers the latest finished delegate job from the current session", () => {
  const repo = makeTempDir();
  const sessionId = "sess-current";
  writeState(
    repo,
    baseState([
      {
        id: "task-current",
        kind: "delegate",
        status: "completed",
        title: "Codex Delegate",
        jobClass: "task",
        sessionId,
        threadId: "thr_current",
        summary: "Current session delegate",
        updatedAt: "2026-04-09T12:00:05.000Z",
        completedAt: "2026-04-09T12:00:05.000Z"
      },
      {
        id: "task-other",
        kind: "delegate",
        status: "completed",
        title: "Codex Delegate",
        jobClass: "task",
        sessionId: "sess-other",
        threadId: "thr_other",
        summary: "Other session delegate",
        updatedAt: "2026-04-09T12:00:04.000Z",
        completedAt: "2026-04-09T12:00:04.000Z"
      }
    ])
  );
  writeStoredJob(repo, "task-current", {
    threadId: "thr_current",
    result: {
      rawOutput: "Handled the requested task.\nTask prompt accepted.\n"
    }
  });
  writeStoredJob(repo, "task-other", {
    threadId: "thr_other",
    result: {
      rawOutput: "Old output.\n"
    }
  });

  const result = run("node", [SCRIPT, "result"], {
    cwd: repo,
    env: {
      ...process.env,
      CODEX_COMPANION_SESSION_ID: sessionId
    }
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^Handled the requested task\./);
  assert.match(result.stdout, /Codex session ID: thr_current/);
  assert.doesNotMatch(result.stdout, /Old output/);
});

test("cancel stops an active delegate job and marks it cancelled", () => {
  const repo = makeTempDir();
  const sleeper = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    stdio: "ignore"
  });
  sleeper.unref();

  const logFile = path.join(resolveStateDir(repo), "jobs", "task-live.log");
  writeState(
    repo,
    baseState([
      {
        id: "task-live",
        kind: "delegate",
        kindLabel: "delegate",
        status: "running",
        title: "Codex Delegate",
        jobClass: "task",
        phase: "running",
        sessionId: "sess-current",
        pid: sleeper.pid,
        logFile,
        summary: "Running delegate",
        createdAt: "2026-04-09T12:00:00.000Z",
        updatedAt: "2026-04-09T12:00:05.000Z"
      }
    ])
  );
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.writeFileSync(logFile, "[2026-04-09T12:00:05.000Z] Starting Codex Delegate.\n", "utf8");
  writeStoredJob(repo, "task-live", {
    id: "task-live",
    status: "running",
    title: "Codex Delegate"
  });

  const cancelResult = run("node", [SCRIPT, "cancel", "task-live", "--json"], {
    cwd: repo,
    env: {
      ...process.env,
      CODEX_COMPANION_SESSION_ID: "sess-current"
    }
  });

  assert.equal(cancelResult.status, 0, cancelResult.stderr);
  const payload = JSON.parse(cancelResult.stdout);
  assert.equal(payload.status, "cancelled");

  const state = JSON.parse(fs.readFileSync(path.join(resolveStateDir(repo), "state.json"), "utf8"));
  assert.equal(state.jobs[0].status, "cancelled");
  assert.equal(state.jobs[0].pid, null);

  const stored = JSON.parse(fs.readFileSync(path.join(resolveStateDir(repo), "jobs", "task-live.json"), "utf8"));
  assert.equal(stored.status, "cancelled");
  assert.match(fs.readFileSync(logFile, "utf8"), /Cancelled by user/);
});

test("session end cleanup removes jobs from the current session and keeps other sessions", () => {
  const repo = makeTempDir();
  const stateDir = writeState(
    repo,
    baseState([
      {
        id: "task-current",
        status: "completed",
        title: "Codex Delegate",
        jobClass: "task",
        sessionId: "sess-current",
        updatedAt: "2026-04-09T12:00:05.000Z"
      },
      {
        id: "task-other",
        status: "completed",
        title: "Codex Delegate",
        jobClass: "task",
        sessionId: "sess-other",
        updatedAt: "2026-04-09T12:00:04.000Z"
      }
    ])
  );
  writeStoredJob(repo, "task-current", { id: "task-current" });
  writeStoredJob(repo, "task-other", { id: "task-other" });

  const result = run("node", [SESSION_HOOK, "SessionEnd"], {
    cwd: repo,
    input: JSON.stringify({
      hook_event_name: "SessionEnd",
      session_id: "sess-current",
      cwd: repo
    })
  });

  assert.equal(result.status, 0, result.stderr);
  const state = JSON.parse(fs.readFileSync(path.join(stateDir, "state.json"), "utf8"));
  assert.deepEqual(state.jobs.map((job) => job.id), ["task-other"]);
  assert.equal(fs.existsSync(path.join(stateDir, "jobs", "task-current.json")), false);
  assert.equal(fs.existsSync(path.join(stateDir, "jobs", "task-other.json")), true);
});
