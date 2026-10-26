import fs from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { runDenseObservedInteractions } from "../../helpers/dense-interactions-v2";

async function fixture(page: Page, fault?: "rearm" | "grow-after-bottom") {
  await page.setContent(`
    <style>
      #tile { margin:100px; width:400px; height:300px; }
      .chat-message-list { height:180px; overflow:auto; overflow-anchor:none; }
      .history { height:2000px; }
    </style>
    <div id="tile" data-testid="thread-column-observed">
      <div data-testid="session-chat" data-session-id="observed-session">
        <div class="chat-message-list"><div class="history">History</div></div>
      </div>
      <div class="thread-composer-disclosure" data-state="closed">Composer</div>
    </div>`);
  await page.evaluate(async (fault) => {
    const tile = document.querySelector("#tile")!;
    const disclosure = tile.querySelector(".thread-composer-disclosure")!;
    tile.addEventListener("mouseenter", () => disclosure.setAttribute("data-state", "open"));
    tile.addEventListener("mouseleave", () => disclosure.setAttribute("data-state", "closed"));
    const transcript = tile.querySelector<HTMLElement>(".chat-message-list")!;
    transcript.scrollTop = transcript.scrollHeight;
    if (fault === "rearm")
      transcript.addEventListener("wheel", (event) => {
        if (event.deltaY < 0)
          setTimeout(() => {
            transcript.scrollTop = transcript.scrollHeight;
          }, 50);
      });
    if (fault === "grow-after-bottom")
      transcript.addEventListener("wheel", (event) => {
        if (event.deltaY <= 0) return;
        const grow = () => {
          if (transcript.scrollHeight - transcript.clientHeight - transcript.scrollTop > 3) return;
          transcript.removeEventListener("scroll", grow);
          const top = transcript.scrollTop;
          transcript.querySelector<HTMLElement>(".history")!.style.height = "2200px";
          transcript.scrollTop = top;
        };
        transcript.addEventListener("scroll", grow);
      });
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  }, fault);
}

for (const fault of [undefined, "grow-after-bottom"] as const)
  test(`runs the original four inputs with native proof (${fault ?? "steady"})`, async ({
    page,
  }, info) => {
    await fixture(page, fault);
    const commands: number[][] = [];
    const wheel = page.mouse.wheel.bind(page.mouse);
    page.mouse.wheel = async (x, y) => {
      commands.push([x, y]);
      await wheel(x, y);
    };
    const result = await runDenseObservedInteractions({
      page,
      taskId: "observed",
      started: performance.now(),
      durationMs: 1000,
    });
    const filename = info.outputPath("observed-interactions.json");
    fs.writeFileSync(filename, JSON.stringify(result, null, 2));
    await info.attach("observed-interactions", { path: filename });
    expect(commands).toEqual([
      [0, -160],
      [0, 1_000_000],
    ]);
    expect(result.map((item) => item.action)).toEqual([
      "scroll-up",
      "return-bottom",
      "leave-tile",
      "hover-tile",
    ]);
    expect(result[0].nativeProof?.observation.firstMovedAt).not.toBeNull();
    expect(result[1].readingHold?.observation.maximumAdvancePx).toBeLessThanOrEqual(3);
    expect(result[1].nativeProof?.observation.bottomHit?.gap).toBeLessThanOrEqual(3);
    if (fault === "grow-after-bottom")
      expect(result[1].nativeProof!.observation.current.gap).toBeGreaterThan(3);
  });

test("rejects transient upward movement that loses the reading position", async ({
  page,
}, info) => {
  await fixture(page, "rearm");
  const checkpoints: Array<Record<string, unknown>> = [];
  const commands: number[] = [];
  const wheel = page.mouse.wheel.bind(page.mouse);
  page.mouse.wheel = async (x, y) => {
    commands.push(y);
    await wheel(x, y);
  };
  await expect(
    runDenseObservedInteractions({
      page,
      taskId: "observed",
      started: performance.now(),
      durationMs: 1000,
      failureArtifactPrefix: info.outputPath("reading-failure"),
      checkpoint: (value) => checkpoints.push(value),
    }),
  ).rejects.toThrow(/reading position/);
  expect(commands).toEqual([-160]);
  expect(checkpoints).toHaveLength(1);
  expect(checkpoints[0]).toMatchObject({
    interactionFailure: {
      action: "return-bottom",
      nativeObservation: { maximumAdvancePx: 160 },
      steps: expect.arrayContaining([
        expect.objectContaining({ name: "verify-held-reading", error: expect.any(String) }),
      ]),
    },
  });
  const filename = info.outputPath("rejected-reading.json");
  fs.writeFileSync(filename, JSON.stringify(checkpoints, null, 2));
  await info.attach("rejected-reading", { path: filename });
});
