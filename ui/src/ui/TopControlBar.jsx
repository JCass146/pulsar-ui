import React, { useMemo, useState } from "react";
import {
  getAllTags,
  getAllUniqueTags,
  filterDevicesByTag,
} from "../services/device-registry.js";

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

/**
 * Tag selector dropdown for broadcast targeting
 */
function TagBroadcastSelector({ tags, selectedTag, onSelectTag, deviceCount }) {
  return (
    <div className="tcbTagSelector">
      <select
        value={selectedTag}
        onChange={(e) => onSelectTag(e.target.value)}
        className="tcbTagSelect"
      >
        <option value="">All online ({deviceCount})</option>
        {tags.map((tag) => (
          <option key={tag} value={tag}>
            {tag}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function TopControlBar({
  deviceList,
  devicesRef,
  broadcastCommand,
  broadcastToDevices, // New: broadcast to specific device list
  defaultRelayKeys = ["1", "2", "3", "4"]
}) {
  const [broadcastTag, setBroadcastTag] = useState(""); // Empty = all online

  // Get all unique tags for the selector
  const allTags = useMemo(() => {
    return getAllUniqueTags(devicesRef.current);
  }, [devicesRef, deviceList]); // Re-compute when device list changes

  const onlineDeviceIds = useMemo(
    () => deviceList.filter((d) => d.online).map((d) => d.id),
    [deviceList]
  );

  // Get target devices based on tag filter
  const targetDeviceIds = useMemo(() => {
    if (!broadcastTag) {
      return onlineDeviceIds;
    }

    // Filter by tag
    const taggedDevices = filterDevicesByTag(devicesRef.current, broadcastTag);
    return taggedDevices
      .filter((d) => d.online)
      .map((d) => d.id);
  }, [onlineDeviceIds, broadcastTag, devicesRef]);

  const targetDevices = useMemo(
    () => targetDeviceIds.map((id) => devicesRef.current.get(id)).filter(Boolean),
    [targetDeviceIds, devicesRef]
  );

  const relayKeys = useMemo(() => {
    const u = unionRelayKeys(targetDevices);
    // if nothing retained yet, use defaults
    return (u.length ? u : defaultRelayKeys).map(String);
  }, [targetDevices, defaultRelayKeys]);

  function setRelayAll(relayKey, state01) {
    const deviceIdsWithRelay = targetDevices
      .filter(d => {
        const relays = d?.state?.get?.("relays");
        return relays && typeof relays === "object" && (relayKey in relays);
      })
      .map(d => d.id);

    if (broadcastToDevices && deviceIdsWithRelay.length > 0) {
      // Use targeted broadcast if available
      broadcastToDevices(deviceIdsWithRelay, "relay.set", { id: relayKey, state: state01 });
    } else {
      // Fall back to global broadcast - but this sends to all online, not filtered
      // TODO: Implement individual publishCommand calls for filtered devices
      broadcastCommand("relay.set", { id: relayKey, state: state01 });
    }
  }

  function toggleRelayAll(relayKey) {
    const agg = computeRelayAggregate(targetDevices, relayKey);
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
          Broadcast to <span className="mono">{targetDeviceIds.length}</span> device(s)
          {broadcastTag && <span className="tcbTagIndicator"> • tag: {broadcastTag}</span>}
        </div>
      </div>

      <div className="tcbMid">
        <div className="tcbGroupLabel muted mono">TARGET</div>
        <TagBroadcastSelector
          tags={allTags}
          selectedTag={broadcastTag}
          onSelectTag={setBroadcastTag}
          deviceCount={onlineDeviceIds.length}
        />

        <div className="tcbGroupLabel muted mono" style={{ marginTop: 8 }}>RELAYS</div>
        <div className="tcbRelays">
          {relayKeys.map((k) => {
            const agg = computeRelayAggregate(targetDevices, k);
            return (
              <button
                key={k}
                type="button"
                className={`tcbRelayBtn ${agg.tone}`}
                onClick={() => toggleRelayAll(k)}
                title={`Relay ${k} across ${broadcastTag || "fleet"}: ${agg.label}. Click to ${agg.anyOn ? "turn OFF" : "turn ON"} all.`}
                disabled={targetDeviceIds.length === 0}
              >
                <span className="mono">R{k}</span>
                <span className="tcbRelayState mono">{agg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="tcbRight">
        <button
          type="button"
          className="danger"
          onClick={allOff}
          title={`Turn ALL relays OFF on ${broadcastTag ? `"${broadcastTag}" devices` : "all online devices"}`}
          disabled={targetDeviceIds.length === 0}
        >
          ALL OFF
        </button>
      </div>
    </section>
  );
}
