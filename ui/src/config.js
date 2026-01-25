function defaultWsUrl() {
  const { protocol, hostname } = window.location;
  const wsProto = protocol === "https:" ? "wss:" : "ws:";
  return `${wsProto}//${hostname}:9001`;
}

export async function loadRuntimeConfig() {
  // Hard defaults if config fetch fails
  const defaults = {
    mqttWsUrl: "",
    mqttTopic: "pulsar/+/telemetry/#"
  };

  try {
    const res = await fetch("/config.json", { cache: "no-store" });
    if (!res.ok) return { ...defaults, mqttWsUrl: defaultWsUrl() };

    const cfg = await res.json();

    const mqttWsUrl =
      (cfg?.mqttWsUrl && String(cfg.mqttWsUrl).trim()) || defaultWsUrl();

    const mqttTopic =
      (cfg?.mqttTopic && String(cfg.mqttTopic).trim()) || defaults.mqttTopic;

    return { mqttWsUrl, mqttTopic };
  } catch {
    return { ...defaults, mqttWsUrl: defaultWsUrl() };
  }
}
