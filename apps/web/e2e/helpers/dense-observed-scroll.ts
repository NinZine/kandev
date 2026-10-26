import type { JSHandle, Locator } from "@playwright/test";

type Geometry = { scrollTop: number; scrollHeight: number; clientHeight: number; gap: number };
type Origin = Geometry & { observedAt: number; source: "install" | "scroll" | "read" | "wheel" };
type WheelObservation = Geometry & {
  observedAt: number;
  isTrusted: boolean;
  withinTranscript: boolean;
  defaultPrevented: boolean;
  ctrlKey: boolean;
  deltaY: number;
  deltaMode: number;
};

export type DenseObservedScroll = {
  protocol: "native-observed-scroll-v2";
  direction: "up" | "bottom";
  command: { deltaX: number; deltaY: number };
  sessionId: string | null;
  live: boolean;
  disposed: boolean;
  wheelCount: number;
  scrollEvents: number;
  wheel: WheelObservation | null;
  origin: Origin | null;
  firstMovedAt: number | null;
  lowestTop: number | null;
  maximumAdvancePx: number;
  current: Geometry;
  bottomHit: (Geometry & { observedAt: number }) | null;
};

type Observer = { snapshot(): DenseObservedScroll; dispose(): void };
export type DenseScrollObserver = JSHandle<Observer>;

export async function observeDenseScroll(
  transcript: Locator,
  direction: "up" | "bottom",
): Promise<DenseScrollObserver> {
  return transcript.evaluateHandle((element, direction): Observer => {
    const el = element as HTMLElement;
    const tile = el.closest('[data-testid^="thread-column-"]');
    const session = el.closest('[data-testid="session-chat"]');
    const sessionId = session?.getAttribute("data-session-id") ?? null;
    let disposed = false;
    let wheelCount = 0;
    let scrollEvents = 0;
    let wheel: WheelObservation | null = null;
    let wheelEvent: WheelEvent | null = null;
    let origin: Origin | null = null;
    let firstMovedAt: number | null = null;
    let lowestTop: number | null = null;
    let maximumAdvancePx = 0;
    let bottomHit: DenseObservedScroll["bottomHit"] = null;
    const geometry = (): Geometry => {
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight;
      const clientHeight = el.clientHeight;
      return {
        scrollTop,
        scrollHeight,
        clientHeight,
        gap: scrollHeight - clientHeight - scrollTop,
      };
    };
    let current = geometry();
    let currentObservedAt = Date.now();
    let currentSource: Origin["source"] = "install";
    const live = () =>
      el.isConnected &&
      tile?.querySelector(".chat-message-list") === el &&
      el.closest('[data-testid="session-chat"]') === session &&
      session?.getAttribute("data-session-id") === sessionId;
    const validWheel = () =>
      wheel !== null &&
      wheel.isTrusted &&
      wheel.withinTranscript &&
      !wheel.ctrlKey &&
      !wheelEvent?.defaultPrevented &&
      (direction === "up" ? wheel.deltaY < 0 : wheel.deltaY > 0);
    const sample = (source: "scroll" | "read") => {
      if (disposed) return;
      current = geometry();
      currentObservedAt = Date.now();
      currentSource = source;
      if (!live() || !validWheel() || !wheel || !origin) return;
      if (direction === "up") {
        lowestTop = Math.min(lowestTop ?? origin.scrollTop, current.scrollTop);
        if (current.scrollTop < origin.scrollTop && firstMovedAt === null)
          firstMovedAt = Date.now();
        if (firstMovedAt !== null)
          maximumAdvancePx = Math.max(maximumAdvancePx, current.scrollTop - lowestTop);
      } else if (current.gap <= 3 && bottomHit === null) {
        bottomHit = { ...current, observedAt: Date.now() };
      }
    };
    const onWheel = (event: WheelEvent) => {
      wheelCount++;
      if (wheel) return;
      wheelEvent = event;
      const received = geometry();
      const observedAt = Date.now();
      // Passive input can reach the handler after the compositor has moved.
      origin =
        direction === "up" && current.scrollTop > received.scrollTop
          ? { ...current, observedAt: currentObservedAt, source: currentSource }
          : { ...received, observedAt, source: "wheel" };
      wheel = {
        ...received,
        observedAt,
        isTrusted: event.isTrusted,
        withinTranscript: event.composedPath().includes(el),
        defaultPrevented: event.defaultPrevented,
        ctrlKey: event.ctrlKey,
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
      };
    };
    const onScroll = () => {
      scrollEvents++;
      sample("scroll");
    };
    el.ownerDocument.addEventListener("wheel", onWheel, { capture: true, passive: true });
    el.addEventListener("scroll", onScroll, { passive: true });
    return {
      snapshot: () => {
        sample("read");
        return {
          protocol: "native-observed-scroll-v2",
          direction,
          command: { deltaX: 0, deltaY: direction === "up" ? -160 : 1_000_000 },
          sessionId,
          live: Boolean(live()),
          disposed,
          wheelCount,
          scrollEvents,
          wheel: wheel ? { ...wheel, defaultPrevented: wheelEvent!.defaultPrevented } : null,
          origin,
          firstMovedAt,
          lowestTop,
          maximumAdvancePx,
          current,
          bottomHit,
        };
      },
      dispose: () => {
        if (disposed) return;
        sample("read");
        disposed = true;
        el.ownerDocument.removeEventListener("wheel", onWheel, true);
        el.removeEventListener("scroll", onScroll);
      },
    };
  }, direction);
}

export function readDenseObservedScroll(observer: DenseScrollObserver) {
  return observer.evaluate((value) => value.snapshot());
}

export async function disposeDenseObservedScroll(observer: DenseScrollObserver) {
  try {
    await observer.evaluate((value) => value.dispose());
  } finally {
    await observer.dispose();
  }
}
