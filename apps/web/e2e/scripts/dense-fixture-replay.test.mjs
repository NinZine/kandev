import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { loadDenseFixtureReplay } from "../helpers/dense-fixture-replay.ts";

const roots = [];
const digest = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const expected = { layout: "grid", extraBusyHeaders: 0, tasks: 1000, columns: 30, messages: 1000 };

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kandev-e2e-0-replay-"));
  roots.push(root);
  const snapshot = path.join(root, "dense-base.db");
  const sourceReport = path.join(root, "source.json");
  const descriptor = path.join(root, "replay.json");
  fs.writeFileSync(snapshot, "immutable fixture bytes");
  const report = {
    fixtureProtocol: "threads-files-v1",
    databaseSha256: digest(snapshot),
    fixture: {
      workload: { ...expected, durationMs: 60000 },
      taskCount: 1000,
      threads: Array.from({ length: 30 }, (_, index) => ({
        taskId: `task-${index}`,
        sessionId: `session-${index}`,
      })),
      manifest: Array.from({ length: 30 }, () => ({ messages: 1000, siblingMessages: [100, 100] })),
      files: Array.from({ length: 6 }, (_, index) => ({
        repoPath: path.join(root, `repo-${index}`),
        profileFiles: 630,
        changedFiles: 73,
      })),
    },
  };
  for (const file of report.fixture.files) fs.mkdirSync(file.repoPath);
  fs.writeFileSync(sourceReport, JSON.stringify(report));
  const data = {
    protocol: "dense-fixture-replay-v1",
    fixtureRoot: root,
    sourceReport,
    sourceReportSha256: digest(sourceReport),
    seed: { workspaceId: "workspace-a", agentProfileId: "agent-a" },
  };
  fs.writeFileSync(descriptor, JSON.stringify(data));
  return {
    root,
    snapshot,
    sourceReport,
    descriptor,
    report,
    data,
    saveReport() {
      fs.writeFileSync(sourceReport, JSON.stringify(report));
      data.sourceReportSha256 = digest(sourceReport);
      this.saveDescriptor();
    },
    saveDescriptor() {
      fs.writeFileSync(descriptor, JSON.stringify(data));
    },
  };
}

test("rejects modified snapshot bytes before the fixture is reused", () => {
  const f = fixture();
  fs.appendFileSync(f.snapshot, "modified");
  assert.throws(() => loadDenseFixtureReplay(f.descriptor, expected), /snapshot hash/i);
});

test("loads a verified fixture without modifying its source", () => {
  const f = fixture();
  const before = digest(f.sourceReport);
  const loaded = loadDenseFixtureReplay(f.descriptor, expected);
  assert.equal(loaded.root, f.root);
  assert.equal(loaded.snapshot, f.snapshot);
  assert.deepEqual(loaded.seed, f.data.seed);
  assert.equal(digest(f.sourceReport), before);
  assert.equal(loaded.provenance.sourceReportSha256, before);
});

test("rejects modified source report bytes", () => {
  const f = fixture();
  fs.appendFileSync(f.sourceReport, " ");
  assert.throws(() => loadDenseFixtureReplay(f.descriptor, expected), /source report hash/i);
});

test("rejects a different dataset size", () => {
  const f = fixture();
  assert.throws(
    () => loadDenseFixtureReplay(f.descriptor, { ...expected, messages: 1001 }),
    /dataset/i,
  );
});

test("rejects an unrecognized replay protocol", () => {
  const f = fixture();
  f.data.protocol = "unknown";
  f.saveDescriptor();
  assert.throws(() => loadDenseFixtureReplay(f.descriptor, expected), /protocol/i);
});

test("rejects a fixture root outside the disposable prefix", () => {
  const f = fixture();
  f.data.fixtureRoot = os.tmpdir();
  f.saveDescriptor();
  assert.throws(() => loadDenseFixtureReplay(f.descriptor, expected), /disposable root/i);
});

test("rejects profile repositories outside the fixture root", () => {
  const f = fixture();
  f.report.fixture.files[0].repoPath = os.tmpdir();
  f.saveReport();
  assert.throws(() => loadDenseFixtureReplay(f.descriptor, expected), /repository root/i);
});

test("rejects a missing seed identity", () => {
  const f = fixture();
  delete f.data.seed.agentProfileId;
  f.saveDescriptor();
  assert.throws(() => loadDenseFixtureReplay(f.descriptor, expected), /seed identity/i);
});

test("rejects an incompatible file-fixture protocol", () => {
  const f = fixture();
  f.report.fixtureProtocol = "legacy";
  f.saveReport();
  assert.throws(() => loadDenseFixtureReplay(f.descriptor, expected), /file.fixture protocol/i);
});

test("rejects missing stored history in the fixture manifest", () => {
  const f = fixture();
  f.report.fixture.manifest[0].messages = 0;
  f.saveReport();
  assert.throws(() => loadDenseFixtureReplay(f.descriptor, expected), /history counts/i);
});

test("rejects a fixture without its required profile files", () => {
  const f = fixture();
  f.report.fixture.files[0].profileFiles = 0;
  f.saveReport();
  assert.throws(() => loadDenseFixtureReplay(f.descriptor, expected), /file counts/i);
});

test("rejects a snapshot symlink outside the disposable fixture", () => {
  const f = fixture();
  const other = fixture();
  fs.unlinkSync(f.snapshot);
  fs.symlinkSync(other.snapshot, f.snapshot);
  assert.throws(() => loadDenseFixtureReplay(f.descriptor, expected), /snapshot root/i);
});

test("accepts a small dataset with the seeder's bounded sibling histories", () => {
  const f = fixture();
  f.report.fixture.workload.messages = 20;
  for (const entry of f.report.fixture.manifest) {
    entry.messages = 20;
    entry.siblingMessages = [20, 20];
  }
  f.saveReport();
  assert.doesNotThrow(() => loadDenseFixtureReplay(f.descriptor, { ...expected, messages: 20 }));
});

test("rejects a missing sibling history", () => {
  const f = fixture();
  f.report.fixture.manifest[0].siblingMessages = [];
  f.saveReport();
  assert.throws(() => loadDenseFixtureReplay(f.descriptor, expected), /history counts/i);
});
