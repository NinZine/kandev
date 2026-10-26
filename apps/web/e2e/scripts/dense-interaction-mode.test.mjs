import { test } from "node:test";
import assert from "node:assert/strict";
import { selectDenseInteractionMode } from "../helpers/dense-interaction-mode.mjs";

test("keeps the default quiet mode and explicit legacy inputs", () => {
  assert.equal(selectDenseInteractionMode({}), "quiet");
  assert.equal(
    selectDenseInteractionMode({ KANDEV_DENSE_INTERACTIONS: "1" }),
    "scripted-scroll-v1",
  );
  assert.equal(
    selectDenseInteractionMode({
      KANDEV_DENSE_INTERACTIONS: "1",
      KANDEV_DENSE_INTERACTION_PROTOCOL: "v1",
    }),
    "scripted-scroll-v1",
  );
});
test("labels explicitly selected observed inputs as a separate version", () => {
  assert.equal(
    selectDenseInteractionMode({
      KANDEV_DENSE_INTERACTIONS: "1",
      KANDEV_DENSE_INTERACTION_PROTOCOL: "v2",
    }),
    "scripted-scroll-v2",
  );
});
test("does not activate the observer when scripted input is disabled", () => {
  for (const flag of [undefined, "0", "true"])
    assert.equal(
      selectDenseInteractionMode({
        KANDEV_DENSE_INTERACTIONS: flag,
        KANDEV_DENSE_INTERACTION_PROTOCOL: "v2",
      }),
      "quiet",
    );
});
test("rejects an unknown protocol even when scripted input is disabled", () => {
  for (const flag of [undefined, "1"])
    assert.throws(
      () =>
        selectDenseInteractionMode({
          KANDEV_DENSE_INTERACTIONS: flag,
          KANDEV_DENSE_INTERACTION_PROTOCOL: "unknown",
        }),
      /Unknown dense interaction protocol/,
    );
});
