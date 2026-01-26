function defaultWsUrl() {
  const { protocol, hostname } = window.location;
  const wsProto = protocol === "https:" ? "wss:" : "ws:";
  return `${wsProto}//${hostname}:9001`;
}

export async function loadRuntimeConfig() {
  // Hard defaults if config fetch fails
  const defaults = {
    mqttWsUrl: defaultWsUrl(),

    // Pulsar Topic Contract v1 — UI listens broadly
    subscribeTopics: [
      "pulsar/+/telemetry",
      "pulsar/+/status",
      "pulsar/+/state/#",
      "pulsar/+/meta/#",
      "pulsar/+/ack/#",
      "pulsar/+/event/#"
    ],

    staleAfterMs: 5000,
    commandTimeoutMs: 2000
  };

  try {
    const res = await fetch("/config.json", { cache: "no-store" });
    if (!res.ok) return defaults;

    const cfg = await res.json();

    const mqttWsUrl =
      (cfg?.mqttWsUrl && String(cfg.mqttWsUrl).trim()) || defaults.mqttWsUrl;

    // Optional overrides
    const subscribeTopics = Array.isArray(cfg?.subscribeTopics)
      ? cfg.subscribeTopics.map(String).filter(Boolean)
      : defaults.subscribeTopics;

    const staleAfterMs =
      Number.isFinite(cfg?.staleAfterMs) && cfg.staleAfterMs > 0
        ? cfg.staleAfterMs
        : defaults.staleAfterMs;

    const commandTimeoutMs =
      Number.isFinite(cfg?.commandTimeoutMs) && cfg.commandTimeoutMs > 0
        ? cfg.commandTimeoutMs
        : defaults.commandTimeoutMs;

    return {
      mqttWsUrl,
      subscribeTopics,
      staleAfterMs,
      commandTimeoutMs
    };
  } catch {
    return defaults;
  }
}
