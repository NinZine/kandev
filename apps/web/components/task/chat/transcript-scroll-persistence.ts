import type { TranscriptScrollPosition, UISliceActions } from "@/lib/state/slices/ui/types";

type ScrollPositionStore = {
  getState(): Pick<UISliceActions, "setTranscriptScrollTop" | "setTranscriptScrollTops">;
};

type CapturePosition = () => TranscriptScrollPosition | null;
type PendingPosition = { capture: CapturePosition };
type PositionQueue = {
  frameId: number | null;
  pending: Map<symbol, PendingPosition>;
};

const positionQueues = new WeakMap<ScrollPositionStore, PositionQueue>();

function releaseIdleQueue(store: ScrollPositionStore, queue: PositionQueue) {
  if (queue.pending.size) return;
  if (queue.frameId !== null) cancelAnimationFrame(queue.frameId);
  queue.frameId = null;
  if (positionQueues.get(store) === queue) positionQueues.delete(store);
}

function publishFramePositions(store: ScrollPositionStore, queue: PositionQueue) {
  queue.frameId = null;
  const positions = new Map<string, number>();
  const errors: unknown[] = [];
  for (const [owner, entry] of [...queue.pending]) {
    if (queue.pending.get(owner) !== entry) continue;
    queue.pending.delete(owner);
    try {
      const position = entry.capture();
      if (position) positions.set(position.sessionId, position.scrollTop);
    } catch (error) {
      errors.push(error);
    }
  }
  releaseIdleQueue(store, queue);
  if (positions.size) {
    store
      .getState()
      .setTranscriptScrollTops(
        [...positions].map(([sessionId, scrollTop]) => ({ sessionId, scrollTop })),
      );
  }
  if (errors.length) throw new AggregateError(errors);
}

function getPositionQueue(store: ScrollPositionStore): PositionQueue {
  const previous = positionQueues.get(store);
  if (previous) return previous;
  const queue: PositionQueue = { frameId: null, pending: new Map() };
  positionQueues.set(store, queue);
  return queue;
}

export function createTranscriptScrollCoalescer(
  store: ScrollPositionStore,
  capture: CapturePosition,
) {
  const owner = Symbol();
  const cancel = () => {
    const queue = positionQueues.get(store);
    if (!queue) return;
    queue.pending.delete(owner);
    releaseIdleQueue(store, queue);
  };
  return {
    schedule: () => {
      const queue = getPositionQueue(store);
      if (!queue.pending.has(owner)) queue.pending.set(owner, { capture });
      if (queue.frameId === null) {
        queue.frameId = requestAnimationFrame(() => publishFramePositions(store, queue));
      }
    },
    flush: () => {
      cancel();
      const position = capture();
      if (position) store.getState().setTranscriptScrollTop(position.sessionId, position.scrollTop);
    },
    cancel,
  };
}
