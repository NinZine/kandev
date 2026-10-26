import { test } from "node:test";
import assert from "node:assert/strict";
import { interactionPrefix } from "./dense-interaction-summary.mjs";

const MODE = "scripted-scroll-v2";
const geometry = (top, height = 1400) => ({
  scrollTop: top,
  scrollHeight: height,
  clientHeight: 400,
  gap: height - 400 - top,
});
function observation(direction, wheelAt) {
  const up = direction === "up";
  return {
    protocol: "native-observed-scroll-v2",
    direction,
    command: { deltaX: 0, deltaY: up ? -160 : 1_000_000 },
    sessionId: "session",
    live: true,
    disposed: false,
    wheelCount: 1,
    scrollEvents: 1,
    wheel: {
      ...geometry(up ? 1000 : 840),
      observedAt: wheelAt,
      isTrusted: true,
      withinTranscript: true,
      defaultPrevented: false,
      ctrlKey: false,
      deltaY: up ? -80 : 500_000,
      deltaMode: 0,
    },
    origin: { ...geometry(up ? 1000 : 840), observedAt: wheelAt, source: "wheel" },
    firstMovedAt: up ? wheelAt + 50 : null,
    lowestTop: up ? 840 : null,
    maximumAdvancePx: 0,
    current: geometry(up ? 840 : 1000, up ? 1400 : 1600),
    bottomHit: up ? null : { ...geometry(1000), observedAt: wheelAt + 50 },
  };
}
function proof(direction, wheelAt) {
  return {
    waitStartedAt: wheelAt + 10,
    deadlineAt: wheelAt + 5010,
    checkedAt: wheelAt + 100,
    observation: observation(direction, wheelAt),
  };
}
function fixture() {
  const interactions = ["scroll-up", "return-bottom", "leave-tile", "hover-tile"].map(
    (action, index) => ({
      action,
      taskId: "task",
      scheduledMs: (index + 1) * 200,
      startedMs: (index + 1) * 200,
      finishedMs: (index + 1) * 200 + 10,
    }),
  );
  interactions[0].nativeProof = proof("up", 10_000);
  interactions[1].readingHold = { checkedAt: 20_000, observation: observation("up", 10_000) };
  interactions[1].nativeProof = proof("bottom", 20_100);
  return {
    report: { interactionMode: MODE },
    sample: { interactionMode: MODE, cold: { visibleTaskIds: ["task"] } },
    run: { scenario: "streaming", interactions },
  };
}
const summarize = ({ report, sample, run }) => interactionPrefix(report, sample, run);

test("labels observed inputs separately and retains a bottom hit after later growth", () => {
  const value = fixture();
  assert.ok(value.run.interactions[1].nativeProof.observation.current.gap > 3);
  assert.equal(summarize(value), `${MODE}-`);
  assert.equal(
    interactionPrefix(value.report, value.sample, {
      scenario: "reduced-motion-idle",
      interactions: [],
    }),
    `${MODE}-`,
  );
});

test("rejects mixed legacy and observed input samples", () => {
  const value = fixture();
  value.sample.interactionMode = "scripted-scroll-v1";
  assert.throws(() => summarize(value), /interaction/);
});

test("requires both native input proofs and the held-reading proof", () => {
  for (const mutate of [
    (v) => delete v.run.interactions[0].nativeProof,
    (v) => delete v.run.interactions[1].nativeProof,
    (v) => delete v.run.interactions[1].readingHold,
  ]) {
    const value = fixture();
    mutate(value);
    assert.throws(() => summarize(value), /native/);
  }
});

test("rejects untrusted, prevented, missed, wrong-direction, and changed native commands", () => {
  for (const mutate of [
    (o) => (o.wheel.isTrusted = false),
    (o) => (o.wheel.defaultPrevented = true),
    (o) => (o.wheel.withinTranscript = false),
    (o) => (o.wheel.ctrlKey = true),
    (o) => (o.wheel.deltaY = 80),
    (o) => (o.command.deltaY = -80),
    (o) => (o.wheelCount = 2),
    (o) => (o.live = false),
    (o) => (o.disposed = true),
  ]) {
    const value = fixture();
    mutate(value.run.interactions[0].nativeProof.observation);
    assert.throws(() => summarize(value), /native/);
  }
});

test("rejects a transient upward move followed by an unrequested advance", () => {
  for (const mutate of [
    (o) => (o.maximumAdvancePx = 4),
    (o) => (o.current = geometry(1000)),
    (o) => (o.firstMovedAt = null),
    (o) => (o.origin.scrollTop = 840),
    (o) => (o.sessionId = "other-session"),
  ]) {
    const value = fixture();
    mutate(value.run.interactions[1].readingHold.observation);
    assert.throws(() => summarize(value), /native/);
  }
});

test("keeps the five-second deadline and rejects missing or late bottom observations", () => {
  for (const mutate of [
    (v) => (v.run.interactions[0].nativeProof.deadlineAt += 1),
    (v) => (v.run.interactions[0].nativeProof.observation.firstMovedAt = 15_011),
    (v) => (v.run.interactions[1].nativeProof.observation.bottomHit = null),
    (v) => (v.run.interactions[1].nativeProof.observation.bottomHit.gap = 4),
    (v) => (v.run.interactions[1].nativeProof.observation.bottomHit.observedAt = 25_111),
    (v) => (v.run.interactions[1].nativeProof.observation.bottomHit.observedAt = 20_099),
    (v) => (v.run.interactions[1].readingHold.checkedAt = 20_101),
    (v) => (v.run.interactions[1].nativeProof.observation.sessionId = "other-session"),
    (v) => (v.run.interactions[0].nativeProof.observation.current.scrollTop = NaN),
  ]) {
    const value = fixture();
    mutate(value);
    assert.throws(() => summarize(value), /native/);
  }
});
