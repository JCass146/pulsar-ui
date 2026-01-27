import React, { useMemo, useState, useEffect } from "react";

function formatAgo(ms) {
  if (!ms) return "—";
  const d = Date.now() - ms;
  if (d < 0) return "—";
  if (d < 1000) return `${d}ms ago`;
  const s = d / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)}s ago`;
  const m = s / 60;
  if (m < 60) return `${m.toFixed(m < 10 ? 1 : 0)}m ago`;
  const h = m / 60;
  if (h < 24) return `${h.toFixed(h < 10 ? 1 : 0)}h ago`;
  const days = h / 24;
  return `${days.toFixed(days < 10 ? 1 : 0)}d ago`;
}

function statusClass(d) {
  if (!d.online) return "offline";
  if (d.stale) return "stale";
  return "online";
}

const FAV_KEY = "pulsarui:favDevices:v1";

function loadFavs() {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveFavs(set) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(set)));
  } catch (err) {
    // Handle storage quota exceeded or other localStorage errors
    if (err.name === "QuotaExceededError") {
      console.warn("localStorage quota exceeded: cannot save favorite devices");
    } else {
      console.error("localStorage error when saving favorite devices:", err);
    }
  }
}

export default function DeviceList({
  devices,
  selectedDevice,
  onSelect,
  title = "Devices",
  compact = false,
  showSearch = true,
  groupByRole = true
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // all | online | stale | offline | pending
  const [favs, setFavs] = useState(() => loadFavs());
  const [collapsed, setCollapsed] = useState(() => new Set()); // role strings

  useEffect(() => {
    saveFavs(favs);
  }, [favs]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    let list = devices;

    // filter chips
    if (filter === "online") list = list.filter((d) => d.online && !d.stale);
    else if (filter === "stale") list = list.filter((d) => d.online && d.stale);
    else if (filter === "offline") list = list.filter((d) => !d.online);
    else if (filter === "pending") list = list.filter((d) => (d.pending || 0) > 0);

    // search
    if (query) {
      list = list.filter((d) => {
        const hay = `${d.id} ${d.role}`.toLowerCase();
        return hay.includes(query);
      });
    }

    // sort favorites first, then existing sort semantics
    const arr = [...list];
    arr.sort((a, b) => {
      const af = favs.has(a.id);
      const bf = favs.has(b.id);
      if (af !== bf) return af ? -1 : 1;

      if (a.online !== b.online) return a.online ? -1 : 1;
      if (a.stale !== b.stale) return a.stale ? 1 : -1;
      return a.id.localeCompare(b.id);
    });
    return arr;
  }, [devices, q, filter, favs]);

  const groups = useMemo(() => {
    if (!groupByRole) return null;
    const m = new Map();
    for (const d of filtered) {
      const r = d.role || "unknown";
      if (!m.has(r)) m.set(r, []);
      m.get(r).push(d);
    }
    // stable group order: favored roles first if they contain favs, then alpha
    const entries = Array.from(m.entries());
    entries.sort(([ra, a], [rb, b]) => {
      const aFavCount = a.reduce((n, d) => n + (favs.has(d.id) ? 1 : 0), 0);
      const bFavCount = b.reduce((n, d) => n + (favs.has(d.id) ? 1 : 0), 0);
      if (aFavCount !== bFavCount) return bFavCount - aFavCount;
      return ra.localeCompare(rb);
    });
    return entries;
  }, [filtered, groupByRole, favs]);

  function toggleFav(id) {
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveFavs(next);
      return next;
    });
  }

  function toggleCollapse(role) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  }

  const listClass = compact ? "deviceList compact" : "deviceList";

  function renderRow(d) {
    const s = statusClass(d);
    const active = d.id === selectedDevice;
    const fav = favs.has(d.id);

    return (
      <button
        key={d.id}
        className={active ? "deviceRow active" : "deviceRow"}
        onClick={() => onSelect?.(d.id)}
        title={`${d.role} • ${s} • pending=${d.pending}`}
        type="button"
      >
        <span className={`dot ${s}`} />
        <span className="deviceMain">
          <span className="mono deviceId">{d.id}</span>
          <span className="muted deviceRole">{d.role}</span>
        </span>

        <span className="deviceRight">
          {d.pending ? <span className="pillTag">{d.pending} pending</span> : null}
          <span className="muted mono deviceSeen">{formatAgo(d.lastSeenMs)}</span>

          <button
            type="button"
            className={fav ? "favBtn fav" : "favBtn"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFav(d.id);
            }}
            title="Favorite"
          >
            {fav ? "★" : "☆"}
          </button>
        </span>
      </button>
    );
  }

  return (
    <div className="devicePanel">
      <div className="devicePanelTop">
        <div>
          <div className="devicePanelTitle">{title}</div>
          <div className="devicePanelSub muted">
            {filtered.length} shown • {devices.length} total
          </div>
        </div>

        {showSearch ? (
          <input
            className="deviceSearch"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search device or role…"
            spellCheck={false}
          />
        ) : null}
      </div>

      <div className="filterRow">
        {[
          ["all", "All"],
          ["online", "Online"],
          ["stale", "Stale"],
          ["offline", "Offline"],
          ["pending", "Pending"]
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={filter === k ? "chipBtn active" : "chipBtn"}
            onClick={() => setFilter(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {!groupByRole ? (
        <div className={listClass}>
          {filtered.map(renderRow)}
          {filtered.length === 0 ? (
            <div className="muted" style={{ padding: 10 }}>
              No devices match “{q}”.
            </div>
          ) : null}
        </div>
      ) : (
        <div className={listClass}>
          {groups.map(([role, arr]) => {
            const isCollapsed = collapsed.has(role);
            return (
              <div key={role} className="deviceGroup">
                <button type="button" className="groupHdr" onClick={() => toggleCollapse(role)}>
                  <span className="mono">{role}</span>
                  <span className="muted">{arr.length}</span>
                  <span className="muted">{isCollapsed ? "▸" : "▾"}</span>
                </button>
                {!isCollapsed ? <div className="groupBody">{arr.map(renderRow)}</div> : null}
              </div>
            );
          })}

          {filtered.length === 0 ? (
            <div className="muted" style={{ padding: 10 }}>
              No devices match “{q}”.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
