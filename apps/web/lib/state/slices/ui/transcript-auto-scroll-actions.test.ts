import { beforeEach, describe, it, expect, vi } from "vitest";
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import { createUISlice } from "./ui-slice";
import type { UISlice } from "./types";
import { getStoredAutoScrollTop } from "@/lib/local-storage";

function makeStore() {
  return create<UISlice>()(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    immer((...a) => ({ ...(createUISlice as any)(...a) })),
  );
}

type UIStore = UseBoundStore<StoreApi<UISlice>>;

describe("transcript auto-scroll actions", () => {
  let store: UIStore;

  beforeEach(() => {
    store = makeStore();
  });

  it("defaults every session to enabled", () => {
    expect(store.getState().transcriptAutoScroll.enabledBySessionId["session-a"]).toBeUndefined();
  });

  it("setTranscriptAutoScrollEnabled records a per-session preference", () => {
    store.getState().setTranscriptAutoScrollEnabled("session-a", false);
    expect(store.getState().transcriptAutoScroll.enabledBySessionId["session-a"]).toBe(false);

    store.getState().setTranscriptAutoScrollEnabled("session-a", true);
    expect(store.getState().transcriptAutoScroll.enabledBySessionId["session-a"]).toBe(true);
  });

  it("setTranscriptAutoScrollEnabled does not affect other sessions", () => {
    store.getState().setTranscriptAutoScrollEnabled("session-a", false);
    expect(store.getState().transcriptAutoScroll.enabledBySessionId["session-b"]).toBeUndefined();
  });

  it("setTranscriptScrollTop records the last known scrollTop per session", () => {
    store.getState().setTranscriptScrollTop("session-a", 250);
    expect(store.getState().transcriptAutoScroll.scrollTopBySessionId["session-a"]).toBe(250);

    store.getState().setTranscriptScrollTop("session-a", 400);
    expect(store.getState().transcriptAutoScroll.scrollTopBySessionId["session-a"]).toBe(400);
  });

  it("publishes all frame positions once and persists the last value for each session", () => {
    const published: Record<string, number>[] = [];
    store.subscribe((state) => {
      published.push({ ...state.transcriptAutoScroll.scrollTopBySessionId });
    });
    store.getState().setTranscriptScrollTops([
      { sessionId: "batch-session-a", scrollTop: 250 },
      { sessionId: "batch-session-b", scrollTop: 400 },
      { sessionId: "batch-session-a", scrollTop: 275 },
    ]);

    expect(published).toEqual([{ "batch-session-a": 275, "batch-session-b": 400 }]);
    expect(getStoredAutoScrollTop("batch-session-a")).toBe(275);
    expect(getStoredAutoScrollTop("batch-session-b")).toBe(400);
  });

  it("leaves state and subscribers unchanged for an empty frame", () => {
    const previous = store.getState();
    const changed = vi.fn();
    store.subscribe(changed);
    store.getState().setTranscriptScrollTops([]);
    expect(store.getState()).toBe(previous);
    expect(changed).not.toHaveBeenCalled();
  });
});
