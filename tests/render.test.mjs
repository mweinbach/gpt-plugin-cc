import test from "node:test";
import assert from "node:assert/strict";

import { renderStatusReport, renderStoredJobResult, renderTaskResult } from "../plugins/codex/scripts/lib/render.mjs";

test("renderTaskResult returns raw delegate output unchanged", () => {
  const output = renderTaskResult(
    {
      rawOutput: "Handled the requested task.\nTask prompt accepted.\n",
      failureMessage: ""
    },
    {
      title: "Codex Delegate",
      write: true
    }
  );

  assert.equal(output, "Handled the requested task.\nTask prompt accepted.\n");
});

test("renderStoredJobResult appends Codex resume information for delegate jobs", () => {
  const output = renderStoredJobResult(
    {
      id: "task-123",
      status: "completed",
      title: "Codex Delegate",
      jobClass: "task",
      threadId: "thr_123"
    },
    {
      threadId: "thr_123",
      result: {
        rawOutput: "Handled the requested task.\nTask prompt accepted.\n"
      }
    }
  );

  assert.match(output, /^Handled the requested task\./);
  assert.match(output, /Codex session ID: thr_123/);
  assert.match(output, /Resume in Codex: codex resume thr_123/);
});

test("renderStatusReport shows delegate jobs without review-gate text", () => {
  const output = renderStatusReport({
    sessionRuntime: { label: "direct startup" },
    running: [
      {
        id: "task-live",
        kindLabel: "delegate",
        status: "running",
        phase: "investigating",
        elapsed: "4s",
        threadId: "thr_live",
        summary: "Investigate the failing benchmark",
        progressPreview: ["Running tool: search_code."]
      }
    ],
    latestFinished: {
      id: "task-done",
      kindLabel: "delegate",
      status: "completed",
      title: "Codex Delegate",
      duration: "31s",
      threadId: "thr_done",
      summary: "Fix the flaky integration test",
      progressPreview: []
    },
    recent: []
  });

  assert.match(output, /# Codex Status/);
  assert.match(output, /\| task-live \| delegate \| running \| investigating \| 4s \| thr_live \| Investigate the failing benchmark \|/);
  assert.match(output, /Resume in Codex: codex resume thr_done/);
  assert.doesNotMatch(output, /Review gate/);
});
