import { expect, type Locator } from "@playwright/test";
import type { runDenseInteractions } from "./dense-interactions";
import { dwell } from "./causal-waits";
import { captureDenseFailureImage } from "./dense-evidence";
import {
  observeDenseScroll,
  readDenseObservedScroll,
  disposeDenseObservedScroll,
  type DenseScrollObserver,
  type DenseObservedScroll,
} from "./dense-observed-scroll";

type Options = Parameters<typeof runDenseInteractions>[0];
type Owners = { up?: DenseScrollObserver; bottom?: DenseScrollObserver };
type NativeProof = {
  waitStartedAt: number;
  deadlineAt: number;
  checkedAt: number;
  observation: DenseObservedScroll;
};
type ReadingHold = { checkedAt: number; observation: DenseObservedScroll };
type Result = { nativeProof?: NativeProof; readingHold?: ReadingHold };
type Step = {
  name: string;
  startedMs: number;
  finishedMs?: number;
  error?: string;
  value?: unknown;
};

async function state(tile: Locator) {
  return tile.evaluate((element) => {
    const transcript = element.querySelector<HTMLElement>(".chat-message-list")!;
    return {
      observedAt: Date.now(),
      scrollTop: transcript.scrollTop,
      scrollHeight: transcript.scrollHeight,
      clientHeight: transcript.clientHeight,
      composer: element.querySelector(".thread-composer-disclosure")?.getAttribute("data-state"),
      sessionId: element
        .querySelector('[data-testid="session-chat"]')
        ?.getAttribute("data-session-id"),
    };
  });
}

function recorder(started: number) {
  const steps: Step[] = [];
  return {
    steps,
    async run<T>(name: string, action: () => Promise<T>) {
      const step: Step = { name, startedMs: performance.now() - started };
      steps.push(step);
      try {
        const value = await action();
        if (value !== undefined) step.value = value;
        return value;
      } catch (error) {
        step.error = String(error);
        throw error;
      } finally {
        step.finishedMs = performance.now() - started;
      }
    },
  };
}

function validNative(value: DenseObservedScroll) {
  const wheel = value.wheel;
  return (
    value.live &&
    !value.disposed &&
    value.wheelCount === 1 &&
    wheel?.isTrusted &&
    wheel.withinTranscript &&
    !wheel.defaultPrevented &&
    !wheel.ctrlKey &&
    (value.direction === "up" ? wheel.deltaY < 0 : wheel.deltaY > 0)
  );
}

async function waitForNative(observer: DenseScrollObserver): Promise<NativeProof> {
  const waitStartedAt = Date.now();
  const deadlineAt = waitStartedAt + 5000;
  await expect
    .poll(
      async () => {
        const value = await readDenseObservedScroll(observer);
        const observedAt =
          value.direction === "up" ? value.firstMovedAt : value.bottomHit?.observedAt;
        return Boolean(
          validNative(value) &&
          observedAt !== null &&
          observedAt !== undefined &&
          observedAt >= value.wheel!.observedAt &&
          observedAt <= deadlineAt,
        );
      },
      { timeout: 5000 },
    )
    .toBe(true);
  return {
    waitStartedAt,
    deadlineAt,
    checkedAt: Date.now(),
    observation: await readDenseObservedScroll(observer),
  };
}

async function verifyHeldReading(observer: DenseScrollObserver): Promise<ReadingHold> {
  const observation = await readDenseObservedScroll(observer);
  const message = "native reading position must stay paused until return input";
  expect(Boolean(validNative(observation) && observation.firstMovedAt !== null), message).toBe(
    true,
  );
  expect(observation.maximumAdvancePx, message).toBeLessThanOrEqual(3);
  return { checkedAt: Date.now(), observation };
}

async function apply(
  options: Options & {
    tile: Locator;
    action: string;
    steps: ReturnType<typeof recorder>;
    owners: Owners;
  },
): Promise<Result> {
  const { page, tile, action, steps, owners } = options;
  const transcript = tile.locator(".chat-message-list");
  const region = tile.locator(".thread-composer-disclosure");
  if (action === "leave-tile") {
    await steps.run("move-outside-tile", () => page.mouse.move(0, 0));
    await steps.run("wait-composer-closed", () =>
      expect.poll(() => region.getAttribute("data-state")).toBe("closed"),
    );
    return {};
  }
  await steps.run("hover-before-disclosure", () => transcript.hover());
  await steps.run("wait-composer-open", () =>
    expect.poll(() => region.getAttribute("data-state")).toBe("open"),
  );
  await steps.run("hover-after-disclosure", () => transcript.hover());
  if (action === "scroll-up") {
    await steps.run("read-scroll-position", async () => {
      const before = await state(tile);
      expect(before.scrollTop).toBeGreaterThan(0);
      return before;
    });
    owners.up = await observeDenseScroll(transcript, "up");
    await steps.run("wheel-up", () => page.mouse.wheel(0, -160));
    return { nativeProof: await steps.run("wait-scroll-up", () => waitForNative(owners.up!)) };
  }
  if (action === "return-bottom") {
    const readingHold = await steps.run("verify-held-reading", () => verifyHeldReading(owners.up!));
    await disposeDenseObservedScroll(owners.up!);
    owners.up = undefined;
    owners.bottom = await observeDenseScroll(transcript, "bottom");
    await steps.run("wheel-bottom", () => page.mouse.wheel(0, 1_000_000));
    const nativeProof = await steps.run("wait-bottom", () => waitForNative(owners.bottom!));
    await disposeDenseObservedScroll(owners.bottom);
    owners.bottom = undefined;
    return { readingHold, nativeProof };
  }
  return {};
}

type Observation = Result & {
  action: string;
  taskId: string;
  scheduledMs: number;
  startedMs: number;
  finishedMs: number;
  before: Awaited<ReturnType<typeof state>>;
  after: Awaited<ReturnType<typeof state>>;
  steps: Step[];
};

async function captureFailure(
  options: Options & {
    tile: Locator;
    owners: Owners;
    detail: Record<string, unknown>;
  },
) {
  const { page, tile, owners, failureArtifactPrefix, detail } = options;
  let inspection;
  try {
    inspection = await state(tile);
  } catch (error) {
    inspection = { inspectionError: String(error) };
  }
  const owner = owners.up ?? owners.bottom;
  const nativeObservation = owner
    ? await readDenseObservedScroll(owner).catch((error) => ({ captureError: String(error) }))
    : null;
  return {
    ...detail,
    state: inspection,
    nativeObservation,
    image: await captureDenseFailureImage(
      page,
      failureArtifactPrefix ? `${failureArtifactPrefix}.interaction.png` : undefined,
    ),
    capturedAt: Date.now(),
  };
}

export async function runDenseObservedInteractions(options: Options) {
  const { page, taskId, started, durationMs, checkpoint } = options;
  const tile = page.getByTestId(`thread-column-${taskId}`);
  const owners: Owners = {};
  const observations: Observation[] = [];
  let failed = false;
  try {
    for (const [index, action] of [
      "scroll-up",
      "return-bottom",
      "leave-tile",
      "hover-tile",
    ].entries()) {
      const scheduledMs = (durationMs * (index + 1)) / 5;
      await dwell(
        Math.max(0, started + scheduledMs - performance.now()),
        "clock-separation",
        "fixed scripted transcript and tile interaction schedule",
      );
      const startedMs = performance.now() - started;
      const steps = recorder(started);
      try {
        const before = await steps.run("read-before", () => state(tile));
        const result = await apply({ ...options, tile, action, steps, owners });
        const finishedMs = performance.now() - started;
        const after = await steps.run("read-after", () => state(tile));
        observations.push({
          action,
          taskId,
          scheduledMs,
          startedMs,
          finishedMs,
          before,
          after,
          steps: steps.steps,
          ...result,
        });
      } catch (error) {
        try {
          checkpoint?.({
            interactionFailure: await captureFailure({
              ...options,
              tile,
              owners,
              detail: {
                action,
                taskId,
                scheduledMs,
                startedMs,
                observations,
                steps: steps.steps,
                error: String(error),
              },
            }),
          });
        } catch (captureError) {
          console.error("Dense observed interaction evidence failed", String(captureError));
        }
        throw error;
      }
    }
    return observations;
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    const results = await Promise.allSettled(
      [owners.up, owners.bottom]
        .filter((owner) => owner !== undefined)
        .map(disposeDenseObservedScroll),
    );
    for (const result of results)
      if (result.status === "rejected") {
        if (failed)
          console.error("Dense observed interaction cleanup failed", String(result.reason));
        else throw result.reason;
      }
  }
}
