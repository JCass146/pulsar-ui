/**
 * Example topic patterns you might use:
 *   pulsar/<device>/telemetry/<sensor>
 *   pulsar/<device>/telemetry
 *   pulsar/<device>/status
 *
 * This tries to be helpful without being too strict.
 */
export function parsePulsarTopic(topic) {
  const parts = String(topic || "").split("/").filter(Boolean);

  // Expected: ["pulsar", "<device>", ...]
  const isPulsar = parts[0] === "pulsar";
  const device = isPulsar ? parts[1] : undefined;

  let kind;
  let pathRemainder = [];

  if (isPulsar && parts.length >= 3) {
    kind = parts[2]; // e.g. "telemetry", "status", "sensors"
    pathRemainder = parts.slice(3);
  }

  return {
    raw: topic,
    isPulsar,
    device,
    kind,
    path: pathRemainder.join("/")
  };
}

export function formatBytes(len) {
  if (len == null) return "";
  if (len < 1024) return `${len} B`;
  if (len < 1024 * 1024) return `${(len / 1024).toFixed(1)} KB`;
  return `${(len / (1024 * 1024)).toFixed(1)} MB`;
}
