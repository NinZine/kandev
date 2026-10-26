import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import type { SeedData } from "../fixtures/test-base";
import type { seedDenseThreadsFixture } from "./dense-threads-fixture";

export type DenseReplaySeed = Pick<SeedData, "workspaceId" | "agentProfileId">;
type DenseFixture = Awaited<ReturnType<typeof seedDenseThreadsFixture>>;
type Dataset = Pick<
  DenseFixture["workload"],
  "layout" | "extraBusyHeaders" | "tasks" | "columns" | "messages"
>;

type ReplayDescriptor = {
  protocol: string;
  fixtureRoot: string;
  sourceReport: string;
  sourceReportSha256: string;
  seed: DenseReplaySeed;
};

function sha256(filename: string) {
  return createHash("sha256").update(fs.readFileSync(filename)).digest("hex");
}

function verifyReplayRoot(descriptor: ReplayDescriptor) {
  if (descriptor.protocol !== "dense-fixture-replay-v1") throw new Error("Invalid replay protocol");
  const root = fs.realpathSync(descriptor.fixtureRoot);
  if (
    path.dirname(root) !== fs.realpathSync(os.tmpdir()) ||
    !path.basename(root).startsWith("kandev-e2e-")
  )
    throw new Error("Replay requires a disposable root");
  if (!descriptor.seed?.workspaceId || !descriptor.seed.agentProfileId) {
    throw new Error("Replay requires seed identity");
  }
  return root;
}

function verifyReplayDataset(fixture: DenseFixture, expected: Dataset, root: string) {
  for (const key of ["layout", "extraBusyHeaders", "tasks", "columns", "messages"] as const) {
    if (fixture.workload[key] !== expected[key]) throw new Error("Replay dataset mismatch");
  }
  if (
    fixture.taskCount !== expected.tasks ||
    fixture.threads.length !== expected.columns ||
    fixture.manifest.length !== expected.columns ||
    fixture.files.length !== Math.min(6, expected.columns)
  )
    throw new Error("Replay dataset dimensions are incomplete");
  for (const entry of fixture.manifest) {
    if (
      entry.messages !== expected.messages ||
      entry.siblingMessages.length !== 2 ||
      entry.siblingMessages.some((count) => count !== Math.min(100, expected.messages))
    ) {
      throw new Error("Replay history counts do not match");
    }
  }
  for (const file of fixture.files) {
    if (file.profileFiles !== 630 || file.changedFiles !== 73) {
      throw new Error("Replay file counts do not match");
    }
    if (!fs.realpathSync(file.repoPath).startsWith(root + path.sep)) {
      throw new Error("Replay repository root is outside its fixture");
    }
  }
}

export function loadDenseFixtureReplay(filename: string, expected: Dataset) {
  const descriptor = JSON.parse(fs.readFileSync(filename, "utf8")) as ReplayDescriptor;
  const root = verifyReplayRoot(descriptor);
  if (sha256(descriptor.sourceReport) !== descriptor.sourceReportSha256) {
    throw new Error("Replay source report hash mismatch");
  }
  const report = JSON.parse(fs.readFileSync(descriptor.sourceReport, "utf8")) as {
    fixtureProtocol: string;
    databaseSha256: string;
    fixture: DenseFixture;
  };
  if (report.fixtureProtocol !== "threads-files-v1")
    throw new Error("Invalid file-fixture protocol");
  const snapshot = path.join(root, "dense-base.db");
  if (fs.realpathSync(snapshot) !== snapshot) throw new Error("Replay snapshot root is invalid");
  if (sha256(snapshot) !== report.databaseSha256) throw new Error("Replay snapshot hash mismatch");
  verifyReplayDataset(report.fixture, expected, root);
  return {
    fixture: report.fixture,
    root,
    snapshot,
    seed: descriptor.seed,
    provenance: {
      protocol: descriptor.protocol,
      sourceReport: descriptor.sourceReport,
      sourceReportSha256: descriptor.sourceReportSha256,
      databaseSha256: report.databaseSha256,
      fixtureRoot: root,
    },
  };
}
