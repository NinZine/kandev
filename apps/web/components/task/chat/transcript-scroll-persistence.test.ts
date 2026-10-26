import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore } from "zustand/vanilla";
import { immer } from "zustand/middleware/immer";
import { createUISlice } from "@/lib/state/slices/ui/ui-slice";
import type { UISlice } from "@/lib/state/slices/ui/types";
import { createTranscriptScrollCoalescer } from "./transcript-scroll-persistence";

const frames = new Map<number, FrameRequestCallback>();
let frameId = 0;

function makeStore() {
  return createStore<UISlice>()(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    immer((...args) => ({ ...(createUISlice as any)(...args) })),
  );
}

function flushFrame() {
  const callbacks = [...frames.values()];
  frames.clear();
  for (const callback of callbacks) callback(16);
}

beforeEach(() => {
  frames.clear();
  frameId = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback);
    return frameId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
});

afterEach(() => vi.unstubAllGlobals());

describe("frame position publication", () => {
  it("publishes six same-store captures in one publication", () => {
    const store = makeStore();
    const changed = vi.fn();
    store.subscribe(changed);
    const producers = Array.from({ length: 6 }, (_, index) =>
      createTranscriptScrollCoalescer(store, () => ({
        sessionId: `session-${index}`,
        scrollTop: index * 10,
      })),
    );
    producers.forEach((producer) => producer.schedule());
    const scheduledFrames = frames.size;
    expect(changed).not.toHaveBeenCalled();
    flushFrame();
    expect(changed).toHaveBeenCalledTimes(1);
    expect(scheduledFrames).toBe(1);
    expect(store.getState().transcriptAutoScroll.scrollTopBySessionId).toEqual({
      "session-0": 0,
      "session-1": 10,
      "session-2": 20,
      "session-3": 30,
      "session-4": 40,
      "session-5": 50,
    });
  });

  it("coalesces repeated schedules and reads the position when the frame runs", () => {
    const store = makeStore();
    let top = 10;
    const capture = vi.fn(() => ({ sessionId: "latest", scrollTop: top }));
    const producer = createTranscriptScrollCoalescer(store, capture);
    producer.schedule();
    producer.schedule();
    top = 25;
    expect(capture).not.toHaveBeenCalled();
    flushFrame();
    expect(capture).toHaveBeenCalledTimes(1);
    expect(store.getState().transcriptAutoScroll.scrollTopBySessionId.latest).toBe(25);
  });

  it("keeps the final producer's value when a session has two viewports", () => {
    const store = makeStore();
    const first = createTranscriptScrollCoalescer(store, () => ({
      sessionId: "shared",
      scrollTop: 10,
    }));
    const last = createTranscriptScrollCoalescer(store, () => ({
      sessionId: "shared",
      scrollTop: 30,
    }));
    first.schedule();
    last.schedule();
    first.schedule();
    flushFrame();
    expect(store.getState().transcriptAutoScroll.scrollTopBySessionId.shared).toBe(30);
  });
});

describe("position producer boundaries", () => {
  it("flushes an unscheduled final position synchronously", () => {
    const store = makeStore();
    const producer = createTranscriptScrollCoalescer(store, () => ({
      sessionId: "final",
      scrollTop: 184,
    }));
    producer.flush();
    expect(store.getState().transcriptAutoScroll.scrollTopBySessionId.final).toBe(184);
    expect(frames.size).toBe(0);
  });

  it("flushes one producer without dropping another producer's frame", () => {
    const store = makeStore();
    const first = createTranscriptScrollCoalescer(store, () => ({
      sessionId: "first",
      scrollTop: 10,
    }));
    const next = createTranscriptScrollCoalescer(store, () => ({
      sessionId: "next",
      scrollTop: 20,
    }));
    first.schedule();
    next.schedule();
    first.flush();
    expect(store.getState().transcriptAutoScroll.scrollTopBySessionId).toEqual({ first: 10 });
    flushFrame();
    expect(store.getState().transcriptAutoScroll.scrollTopBySessionId).toEqual({
      first: 10,
      next: 20,
    });
  });

  it("cancels only its own capture", () => {
    const store = makeStore();
    const capture = vi.fn(() => ({ sessionId: "cancelled", scrollTop: 10 }));
    const cancelled = createTranscriptScrollCoalescer(store, capture);
    const retained = createTranscriptScrollCoalescer(store, () => ({
      sessionId: "retained",
      scrollTop: 20,
    }));
    cancelled.schedule();
    retained.schedule();
    cancelled.cancel();
    flushFrame();
    expect(capture).not.toHaveBeenCalled();
    expect(store.getState().transcriptAutoScroll.scrollTopBySessionId).toEqual({ retained: 20 });
  });
});

describe("position store and frame ownership", () => {
  it("never merges different app stores", () => {
    const firstStore = makeStore();
    const nextStore = makeStore();
    createTranscriptScrollCoalescer(firstStore, () => ({
      sessionId: "same",
      scrollTop: 10,
    })).schedule();
    createTranscriptScrollCoalescer(nextStore, () => ({
      sessionId: "same",
      scrollTop: 20,
    })).schedule();
    expect(frames.size).toBe(2);
    flushFrame();
    expect(firstStore.getState().transcriptAutoScroll.scrollTopBySessionId.same).toBe(10);
    expect(nextStore.getState().transcriptAutoScroll.scrollTopBySessionId.same).toBe(20);
  });

  it("keeps a new queue when a cancelled callback arrives late", () => {
    const store = makeStore();
    const previous = createTranscriptScrollCoalescer(store, () => ({
      sessionId: "previous",
      scrollTop: 10,
    }));
    previous.schedule();
    const late = [...frames.values()][0];
    previous.cancel();
    const next = createTranscriptScrollCoalescer(store, () => ({
      sessionId: "next",
      scrollTop: 20,
    }));
    next.schedule();
    late(16);
    expect(store.getState().transcriptAutoScroll.scrollTopBySessionId).toEqual({});
    expect(frames.size).toBe(1);
    flushFrame();
    expect(store.getState().transcriptAutoScroll.scrollTopBySessionId).toEqual({ next: 20 });
  });

  it("leaves a cancelled and rescheduled peer for its new frame", () => {
    const store = makeStore();
    const peer = createTranscriptScrollCoalescer(store, () => ({
      sessionId: "peer",
      scrollTop: 20,
    }));
    const first = createTranscriptScrollCoalescer(store, () => {
      peer.cancel();
      peer.schedule();
      return { sessionId: "first", scrollTop: 10 };
    });
    const retained = createTranscriptScrollCoalescer(store, () => ({
      sessionId: "retained",
      scrollTop: 30,
    }));
    first.schedule();
    peer.schedule();
    retained.schedule();
    flushFrame();
    expect(store.getState().transcriptAutoScroll.scrollTopBySessionId).toEqual({
      first: 10,
      retained: 30,
    });
    flushFrame();
    expect(store.getState().transcriptAutoScroll.scrollTopBySessionId).toEqual({
      first: 10,
      retained: 30,
      peer: 20,
    });
  });
});

describe("empty and failed position captures", () => {
  it("skips an unavailable position without losing its peer", () => {
    const store = makeStore();
    createTranscriptScrollCoalescer(store, () => null).schedule();
    createTranscriptScrollCoalescer(store, () => ({
      sessionId: "available",
      scrollTop: 20,
    })).schedule();
    flushFrame();
    expect(store.getState().transcriptAutoScroll.scrollTopBySessionId).toEqual({ available: 20 });
  });

  it("publishes healthy peers and preserves capture errors", () => {
    const store = makeStore();
    const failure = new Error("capture failed");
    createTranscriptScrollCoalescer(store, () => {
      throw failure;
    }).schedule();
    createTranscriptScrollCoalescer(store, () => ({
      sessionId: "healthy",
      scrollTop: 20,
    })).schedule();
    let caught: AggregateError | undefined;
    try {
      flushFrame();
    } catch (error) {
      caught = error as AggregateError;
    }
    expect(caught?.errors).toEqual([failure]);
    expect(store.getState().transcriptAutoScroll.scrollTopBySessionId).toEqual({ healthy: 20 });
    expect(frames.size).toBe(0);
  });
});
