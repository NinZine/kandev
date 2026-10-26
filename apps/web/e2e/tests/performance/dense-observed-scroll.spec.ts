import fs from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import {
  observeDenseScroll,
  readDenseObservedScroll,
  disposeDenseObservedScroll,
  type DenseScrollObserver,
} from "../../helpers/dense-observed-scroll";
import { dwell } from "../../helpers/causal-waits";

async function finish(observer: DenseScrollObserver) {
  try {
    const filename = test.info().outputPath(`native-proof-${test.info().attachments.length}.json`);
    fs.writeFileSync(filename, JSON.stringify(await readDenseObservedScroll(observer), null, 2));
    await test.info().attach("native-proof", { path: filename });
  } finally {
    await disposeDenseObservedScroll(observer);
  }
}

async function fixture(page: Page) {
  await page.setContent(`
    <style>
      body { display:flex; gap:20px; }
      .chat-message-list, #foreign { width:320px; height:240px; overflow:auto; overflow-anchor:none; }
      .history { height:2000px; }
    </style>
    <div data-testid="thread-column-observed">
      <div data-testid="session-chat" data-session-id="observed-session">
        <div class="chat-message-list"><div class="history">History</div></div>
      </div>
    </div>
    <div id="foreign"><div class="history">Other history</div></div>`);
  const transcript = page.locator(".chat-message-list");
  await transcript.evaluate(async (el) => {
    el.scrollTop = el.scrollHeight;
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  });
  return transcript;
}

test("uses the trusted wheel origin after the controller position becomes stale", async ({
  page,
}, info) => {
  const transcript = await fixture(page);
  const controllerTop = await transcript.evaluate((el) => el.scrollTop);
  const observer = await observeDenseScroll(transcript, "up");
  try {
    await transcript.evaluate((el) => {
      el.querySelector<HTMLElement>(".history")!.style.height = "2400px";
      el.scrollTop = el.scrollHeight;
    });
    await transcript.hover();
    await page.mouse.wheel(0, -160);
    await expect
      .poll(async () => (await readDenseObservedScroll(observer)).firstMovedAt)
      .not.toBeNull();
    const result = await readDenseObservedScroll(observer);
    expect(result.wheel).toMatchObject({
      isTrusted: true,
      withinTranscript: true,
      defaultPrevented: false,
    });
    expect(result.origin!.scrollTop).toBeGreaterThan(controllerTop);
    expect(result.current.scrollTop).toBeGreaterThan(controllerTop);
    expect(result.current.scrollTop).toBeLessThan(result.origin!.scrollTop);
    expect(result.maximumAdvancePx).toBe(0);
    const filename = info.outputPath("stale-origin.json");
    fs.writeFileSync(filename, JSON.stringify({ controllerTop, result }, null, 2));
    await info.attach("stale-origin", { path: filename });
  } finally {
    await finish(observer);
  }
});

test("also recognizes movement delivered after the wheel handler", async ({ page }) => {
  const transcript = await fixture(page);
  await transcript.evaluate((el) => el.addEventListener("wheel", () => {}, { passive: false }));
  const observer = await observeDenseScroll(transcript, "up");
  try {
    await transcript.hover();
    await page.mouse.wheel(0, -160);
    await expect
      .poll(async () => (await readDenseObservedScroll(observer)).firstMovedAt)
      .not.toBeNull();
    const result = await readDenseObservedScroll(observer);
    expect(result.origin!.source).toBe("wheel");
    expect(result.origin!.scrollTop).toBe(result.wheel!.scrollTop);
    expect(result.current.scrollTop).toBeLessThan(result.origin!.scrollTop);
  } finally {
    await finish(observer);
  }
});

test("retains a bottom hit after later height growth moves the edge", async ({ page }, info) => {
  const transcript = await fixture(page);
  await transcript.evaluate((el) => (el.scrollTop -= 160));
  const observer = await observeDenseScroll(transcript, "bottom");
  try {
    await transcript.evaluate((el) => {
      const growAfterBottom = () => {
        if (el.scrollHeight - el.clientHeight - el.scrollTop > 3) return;
        el.removeEventListener("scroll", growAfterBottom);
        const top = el.scrollTop;
        el.querySelector<HTMLElement>(".history")!.style.height = "2200px";
        el.scrollTop = top;
        el.setAttribute("data-grew-after-hit", "true");
      };
      el.addEventListener("scroll", growAfterBottom);
    });
    await transcript.hover();
    await page.mouse.wheel(0, 1_000_000);
    await expect(transcript).toHaveAttribute("data-grew-after-hit", "true");
    const result = await readDenseObservedScroll(observer);
    expect(result.current.gap).toBeGreaterThan(3);
    expect(result.bottomHit?.gap).toBeLessThanOrEqual(3);
    expect(result.bottomHit!.observedAt).toBeGreaterThanOrEqual(result.wheel!.observedAt);
    const filename = info.outputPath("retained-bottom-hit.json");
    fs.writeFileSync(filename, JSON.stringify(result, null, 2));
    await info.attach("retained-bottom-hit", { path: filename });
  } finally {
    await finish(observer);
  }
});

test("retains an unrequested advance after an actual upward movement", async ({ page }) => {
  const transcript = await fixture(page);
  const observer = await observeDenseScroll(transcript, "up");
  try {
    await transcript.hover();
    await page.mouse.wheel(0, -160);
    await expect
      .poll(async () => (await readDenseObservedScroll(observer)).firstMovedAt)
      .not.toBeNull();
    await transcript.evaluate((el) => (el.scrollTop = el.scrollHeight));
    const result = await readDenseObservedScroll(observer);
    expect(result.maximumAdvancePx).toBeGreaterThan(3);
    expect(result.firstMovedAt).not.toBeNull();
  } finally {
    await finish(observer);
  }
});

test("a synthetic wheel cannot satisfy native movement", async ({ page }) => {
  const transcript = await fixture(page);
  const observer = await observeDenseScroll(transcript, "up");
  try {
    await transcript.evaluate((el) => {
      el.dispatchEvent(new WheelEvent("wheel", { deltaY: -160, bubbles: true }));
      el.scrollTop -= 160;
      el.dispatchEvent(new Event("scroll"));
    });
    const result = await readDenseObservedScroll(observer);
    expect(result.wheel?.isTrusted).toBe(false);
    expect(result.firstMovedAt).toBeNull();
  } finally {
    await finish(observer);
  }
});

test("a prevented trusted wheel cannot satisfy native movement", async ({ page }) => {
  const transcript = await fixture(page);
  const observer = await observeDenseScroll(transcript, "up");
  try {
    await transcript.evaluate((el) =>
      el.addEventListener("wheel", (event) => event.preventDefault(), { passive: false }),
    );
    await transcript.hover();
    await page.mouse.wheel(0, -160);
    await expect
      .poll(async () => (await readDenseObservedScroll(observer)).wheel?.defaultPrevented)
      .toBe(true);
    await dwell(page, 50, "negative-assertion", "prevented native wheel must not move the reader");
    const result = await readDenseObservedScroll(observer);
    expect(result.firstMovedAt).toBeNull();
    expect(result.current.scrollTop).toBe(result.wheel!.scrollTop);
  } finally {
    await finish(observer);
  }
});

test("a wheel sent to another target cannot satisfy movement", async ({ page }) => {
  const transcript = await fixture(page);
  const observer = await observeDenseScroll(transcript, "up");
  try {
    await page.locator("#foreign").hover();
    await page.mouse.wheel(0, -160);
    await expect
      .poll(async () => (await readDenseObservedScroll(observer)).wheel?.isTrusted)
      .toBe(true);
    const result = await readDenseObservedScroll(observer);
    expect(result.wheel?.withinTranscript).toBe(false);
    expect(result.firstMovedAt).toBeNull();
  } finally {
    await finish(observer);
  }
});

test("invalidates the observation when its transcript or session is replaced", async ({ page }) => {
  const transcript = await fixture(page);
  const observer = await observeDenseScroll(transcript, "up");
  try {
    await transcript.evaluate((el) => el.replaceWith(el.cloneNode(true)));
    expect((await readDenseObservedScroll(observer)).live).toBe(false);
  } finally {
    await finish(observer);
  }
  const next = await observeDenseScroll(page.locator(".chat-message-list"), "up");
  try {
    await page.locator('[data-testid="session-chat"]').evaluate((el) => {
      el.setAttribute("data-session-id", "different-session");
    });
    expect((await readDenseObservedScroll(next)).live).toBe(false);
  } finally {
    await finish(next);
  }
});

test("stops collecting after disposal", async ({ page }) => {
  const transcript = await fixture(page);
  const observer = await observeDenseScroll(transcript, "up");
  try {
    await observer.evaluate((value) => value.dispose());
    await transcript.hover();
    await page.mouse.wheel(0, -160);
    await expect.poll(() => transcript.evaluate((el) => el.scrollTop)).toBeLessThan(1760);
    const result = await readDenseObservedScroll(observer);
    expect(result.disposed).toBe(true);
    expect(result.wheelCount).toBe(0);
    expect(result.scrollEvents).toBe(0);
  } finally {
    await finish(observer);
  }
});
