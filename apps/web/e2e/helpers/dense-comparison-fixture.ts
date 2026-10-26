import path from "node:path";
import type { Page } from "@playwright/test";
import type { ApiClient } from "./api-client";
import type { SeedData } from "../fixtures/test-base";
import type { BackendContext } from "../fixtures/backend";
import { DENSE_WORKLOAD } from "./dense-workbench-fixture";
import { seedDenseThreadsFixture } from "./dense-threads-fixture";
import { loadDenseFixtureReplay } from "./dense-fixture-replay";
import { snapshotDatabase } from "./dense-snapshot";

export async function prepareDenseComparisonFixture(
  api: ApiClient,
  seed: SeedData,
  backend: BackendContext,
  testPage: Page,
) {
  const replayFile = process.env.KANDEV_DENSE_FIXTURE_REPLAY;
  const replay = replayFile ? loadDenseFixtureReplay(replayFile, DENSE_WORKLOAD) : null;
  const fixture = replay
    ? { ...replay.fixture, workload: { ...DENSE_WORKLOAD } }
    : await seedDenseThreadsFixture(api, seed, backend);
  await testPage.close();
  const snapshot = replay?.snapshot ?? path.join(backend.tmpDir, "dense-base.db");
  if (!replay) snapshotDatabase(path.join(backend.tmpDir, "kandev.db"), snapshot);
  const sampleNamespace = replay ? `replay-${Date.now()}-` : "";
  const restartEnv: Record<string, string> = replay ? { HOME: replay.root } : {};
  return {
    fixture,
    snapshot,
    backend: replay ? { ...backend, tmpDir: replay.root } : backend,
    seed: replay?.seed ?? seed,
    sampleNamespace,
    restartEnv,
    provenance: replay ? { ...replay.provenance, sampleNamespace } : undefined,
  };
}
