export function selectDenseInteractionMode(env = process.env) {
  const protocol = env.KANDEV_DENSE_INTERACTION_PROTOCOL ?? "v1";
  if (protocol !== "v1" && protocol !== "v2")
    throw new Error(`Unknown dense interaction protocol: ${protocol}`);
  if (env.KANDEV_DENSE_INTERACTIONS !== "1") return "quiet";
  return protocol === "v2" ? "scripted-scroll-v2" : "scripted-scroll-v1";
}
