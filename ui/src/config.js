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
    if (!res.ok) {
      console.warn(`[Config] Failed to fetch config.json (${res.status}), using defaults`);
      return defaults;
    }

    const cfg = await res.json();
    console.log("[Config] Loaded config.json:", cfg);
    
    // If mqttWsUrl is empty or not provided, use default
    if (!cfg.mqttWsUrl || cfg.mqttWsUrl.trim() === "") {
      console.log("[Config] mqttWsUrl empty, using default:", defaults.mqttWsUrl);
      cfg.mqttWsUrl = defaults.mqttWsUrl;
    }

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
  } catch {    console.error("[Config] Error loading config.json:", err);
    console.log("[Config] Using defaults:", defaults);    return defaults;
  }
}
