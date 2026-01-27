import React, { useMemo } from "react";

function toBoolish(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.toLowerCase().trim();
    if (["1", "true", "on", "yes", "armed"].includes(s)) return true;
    if (["0", "false", "off", "no", "disarmed"].includes(s)) return false;
  }
  return null;
}

// Aggregate relay state across all online devices
function computeRelayAggregate(onlineDevices, relayKey) {
  let seen = 0;
  let onCount = 0;

  for (const d of onlineDevices) {
    const relays = d?.state?.get?.("relays");
    if (!relays || typeof relays !== "object") continue;

    if (!(relayKey in relays)) continue;
    const b = toBoolish(relays[relayKey]);
    if (b === null) continue;

    seen++;
    if (b) onCount++;
  }

  if (seen === 0) return { tone: "neutral", label: "unknown", anyOn: false };
  if (onCount === 0) return { tone: "bad", label: "off", anyOn: false };
  if (onCount === seen) return { tone: "ok", label: "on", anyOn: true };
  return { tone: "warn", label: "mixed", anyOn: true };
}

function unionRelayKeys(onlineDevices) {
  const keys = new Set();
  for (const d of onlineDevices) {
    const relays = d?.state?.get?.("relays");
    if (relays && typeof relays === "object") {
      for (const k of Object.keys(relays)) keys.add(String(k));
    }
  }
  return Array.from(keys);
}

export default function TopControlBar({
  deviceList,
  devicesRef,
  broadcastCommand,
  defaultRelayKeys = ["1", "2", "3", "4"]
}) {
  const onlineDeviceIds = useMemo(
    () => deviceList.filter((d) => d.online).map((d) => d.id),
    [deviceList]
  );

  const onlineDevices = useMemo(
    () => onlineDeviceIds.map((id) => devicesRef.current.get(id)).filter(Boolean),
    [onlineDeviceIds, devicesRef]
  );

  const relayKeys = useMemo(() => {
    const u = unionRelayKeys(onlineDevices);
    // if nothing retained yet, use defaults
    return (u.length ? u : defaultRelayKeys).map(String);
  }, [onlineDevices, defaultRelayKeys]);

  function setRelayAll(relayKey, state01) {
    broadcastCommand("relay.set", { relay: relayKey, state: state01 });
  }

  function toggleRelayAll(relayKey) {
    const agg = computeRelayAggregate(onlineDevices, relayKey);
    // If ANY on (including mixed), turn all OFF. Else turn all ON.
    const next = agg.anyOn ? 0 : 1;
    setRelayAll(relayKey, next);
  }

  function allOff() {
    for (const k of relayKeys) setRelayAll(k, 0);
  }

  return (
    <section className="card controls topControlBar">
      <div className="tcbLeft">
        <div className="tcbTitle">Controls</div>
        <div className="muted" style={{ fontSize: 12 }}>
          Broadcast to <span className="mono">{onlineDeviceIds.length}</span> online device(s)
        </div>
      </div>

      <div className="tcbMid">
        <div className="tcbGroupLabel muted mono">RELAYS</div>
        <div className="tcbRelays">
          {relayKeys.map((k) => {
            const agg = computeRelayAggregate(onlineDevices, k);
            return (
              <button
                key={k}
                type="button"
                className={`tcbRelayBtn ${agg.tone}`}
                onClick={() => toggleRelayAll(k)}
                title={`Relay ${k} across fleet: ${agg.label}. Click to ${agg.anyOn ? "turn OFF" : "turn ON"} all.`}
              >
                <span className="mono">R{k}</span>
                <span className="tcbRelayState mono">{agg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="tcbRight">
        <button type="button" className="danger" onClick={allOff} title="Turn ALL relays OFF on all online devices">
          ALL OFF
        </button>
      </div>
    </section>
  );
}
