function invalid() {
  throw new Error("Invalid or missing native interaction proof");
}

function geometry(value) {
  return (
    value &&
    [value.scrollTop, value.scrollHeight, value.clientHeight, value.gap].every(Number.isFinite) &&
    Math.abs(value.scrollHeight - value.clientHeight - value.scrollTop - value.gap) < 0.00001
  );
}

function identity(value, direction) {
  if (!value || value.protocol !== "native-observed-scroll-v2" || value.direction !== direction)
    invalid();
  if (!value.live || value.disposed || value.wheelCount !== 1) invalid();
  if (typeof value.sessionId !== "string" || !value.sessionId) invalid();
  if (!Number.isInteger(value.scrollEvents) || value.scrollEvents < 0) invalid();
  if (!geometry(value.current) || !Number.isFinite(value.maximumAdvancePx)) invalid();
}

function command(value, direction) {
  const expected = direction === "up" ? -160 : 1_000_000;
  if (!value.command || value.command.deltaX !== 0 || value.command.deltaY !== expected) invalid();
}

function wheel(value, direction) {
  const w = value.wheel;
  if (!w || !w.isTrusted || !w.withinTranscript || w.defaultPrevented || w.ctrlKey) invalid();
  if (!geometry(w) || !Number.isFinite(w.observedAt) || !Number.isFinite(w.deltaY)) invalid();
  if (direction === "up" ? w.deltaY >= 0 : w.deltaY <= 0) invalid();
  command(value, direction);
}

function upward(value) {
  const origin = value.origin;
  if (!geometry(origin) || !Number.isFinite(origin.observedAt)) invalid();
  if (!["wheel", "scroll", "read", "install"].includes(origin.source)) invalid();
  if (origin.observedAt > value.wheel.observedAt) invalid();
  if (!Number.isFinite(value.firstMovedAt) || !Number.isFinite(value.lowestTop)) invalid();
  if (value.lowestTop >= origin.scrollTop || value.current.scrollTop < value.lowestTop) invalid();
  if (value.maximumAdvancePx < 0 || value.maximumAdvancePx > 3) invalid();
  if (value.current.scrollTop - value.lowestTop > value.maximumAdvancePx + 0.00001) invalid();
}

function proof(value, direction) {
  if (!value || ![value.waitStartedAt, value.deadlineAt, value.checkedAt].every(Number.isFinite))
    invalid();
  if (value.deadlineAt - value.waitStartedAt !== 5000 || value.checkedAt < value.waitStartedAt)
    invalid();
  const observation = value.observation;
  identity(observation, direction);
  wheel(observation, direction);
  let observedAt;
  if (direction === "up") {
    upward(observation);
    observedAt = observation.firstMovedAt;
  } else {
    if (!geometry(observation.bottomHit) || observation.bottomHit.gap > 3) invalid();
    observedAt = observation.bottomHit.observedAt;
  }
  if (
    !Number.isFinite(observedAt) ||
    observedAt < observation.wheel.observedAt ||
    observedAt > value.deadlineAt
  )
    invalid();
  return observation;
}

export function validateObservedInteractions(entries) {
  const first = entries[0].nativeProof;
  const second = entries[1].nativeProof;
  const initial = proof(first, "up");
  const bottom = proof(second, "bottom");
  const hold = entries[1].readingHold;
  if (!hold || !Number.isFinite(hold.checkedAt)) invalid();
  const held = hold.observation;
  identity(held, "up");
  wheel(held, "up");
  upward(held);
  if (held.sessionId !== initial.sessionId || bottom.sessionId !== initial.sessionId) invalid();
  if (hold.checkedAt < first.checkedAt || hold.checkedAt > bottom.wheel.observedAt) invalid();
  if (
    held.wheel.observedAt !== initial.wheel.observedAt ||
    held.firstMovedAt !== initial.firstMovedAt
  )
    invalid();
  if (
    held.origin.scrollTop !== initial.origin.scrollTop ||
    held.origin.observedAt !== initial.origin.observedAt
  )
    invalid();
  if (held.maximumAdvancePx < initial.maximumAdvancePx) invalid();
}
