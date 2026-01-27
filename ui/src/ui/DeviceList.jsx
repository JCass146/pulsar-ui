import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  getAllTags,
  addDeviceTag,
  removeDeviceTag,
} from "../services/device-registry.js";

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

/**
 * Tag chip component for filtering
 */
function TagChip({ tag, active, onClick, count, removable, onRemove }) {
  const isAutoTag = tag.includes(":");

  return (
    <button
      type="button"
      className={`tagChip ${active ? "active" : ""} ${isAutoTag ? "auto" : "manual"}`}
      onClick={onClick}
      title={`Filter by tag: ${tag}${count !== undefined ? ` (${count} devices)` : ""}`}
    >
      <span className="tagChipText">{tag}</span>
      {count !== undefined && <span className="tagChipCount">{count}</span>}
      {removable && onRemove && (
        <span
          className="tagChipRemove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(tag);
          }}
          title="Remove tag"
        >
          ✕
        </span>
      )}
    </button>
  );
}

/**
 * Inline tag editor for adding tags to a device
 */
function TagEditor({ device, devicesRef, onTagsChanged }) {
  const [editing, setEditing] = useState(false);
  const [newTag, setNewTag] = useState("");

  const dev = devicesRef?.current?.get(device.id);
  const tags = dev ? getAllTags(dev) : [];
  const manualTags = dev?.tags || [];

  const handleAddTag = useCallback(() => {
    if (!newTag.trim() || !dev) return;
    addDeviceTag(dev, newTag.trim());
    setNewTag("");
    onTagsChanged?.();
  }, [newTag, dev, onTagsChanged]);

  const handleRemoveTag = useCallback((tag) => {
    if (!dev) return;
    removeDeviceTag(dev, tag);
    onTagsChanged?.();
  }, [dev, onTagsChanged]);

  if (!editing) {
    return (
      <div className="deviceTagsRow">
        {tags.slice(0, 4).map((t) => (
          <span key={t} className={`deviceTag ${t.includes(":") ? "auto" : "manual"}`}>
            {t}
          </span>
        ))}
        {tags.length > 4 && <span className="deviceTagMore">+{tags.length - 4}</span>}
        <button
          type="button"
          className="deviceTagEditBtn"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
          title="Edit tags"
        >
          +
        </button>
      </div>
    );
  }

  return (
    <div className="deviceTagEditor" onClick={(e) => e.stopPropagation()}>
      <div className="deviceTagEditorTags">
        {manualTags.map((t) => (
          <span key={t} className="deviceTag manual editable">
            {t}
            <button
              type="button"
              className="deviceTagRemoveBtn"
              onClick={() => handleRemoveTag(t)}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="deviceTagEditorInput">
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddTag();
            if (e.key === "Escape") setEditing(false);
          }}
          placeholder="Add tag…"
          autoFocus
        />
        <button type="button" onClick={handleAddTag}>Add</button>
        <button type="button" onClick={() => setEditing(false)}>Done</button>
      </div>
    </div>
  );
}

export default function DeviceList({
  devices,
  selectedDevice,
  onSelect,
  title = "Devices",
  compact = false,
  showSearch = true,
  groupByRole = true,
  showTags = true,
  devicesRef,
  onTagsChanged,
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // all | online | stale | offline | pending
  const [favs, setFavs] = useState(() => loadFavs());
  const [collapsed, setCollapsed] = useState(() => new Set()); // role strings
  const [activeTags, setActiveTags] = useState([]); // Tag filters

  useEffect(() => {
    saveFavs(favs);
  }, [favs]);

  // Collect all unique tags across devices
  const allTags = useMemo(() => {
    const tagCounts = new Map();
    for (const d of devices) {
      const dev = devicesRef?.current?.get(d.id);
      if (!dev) continue;
      for (const t of getAllTags(dev)) {
        tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
      }
    }
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .slice(0, 20); // Limit to top 20 tags
  }, [devices, devicesRef]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    let list = devices;

    // filter chips
    if (filter === "online") list = list.filter((d) => d.online && !d.stale);
    else if (filter === "stale") list = list.filter((d) => d.online && d.stale);
    else if (filter === "offline") list = list.filter((d) => !d.online);
    else if (filter === "pending") list = list.filter((d) => (d.pending || 0) > 0);

    // Tag filters (AND logic)
    if (activeTags.length > 0 && devicesRef) {
      list = list.filter((d) => {
        const dev = devicesRef.current.get(d.id);
        if (!dev) return false;
        const devTags = getAllTags(dev);
        return activeTags.every((t) => devTags.includes(t));
      });
    }

    // search
    if (query) {
      list = list.filter((d) => {
        const dev = devicesRef?.current?.get(d.id);
        const devTags = dev ? getAllTags(dev).join(" ") : "";
        const hay = `${d.id} ${d.role} ${devTags}`.toLowerCase();
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
  }, [devices, q, filter, favs, activeTags, devicesRef]);

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

  function toggleTagFilter(tag) {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function clearTagFilters() {
    setActiveTags([]);
  }

  const listClass = compact ? "deviceList compact" : "deviceList";

  function renderRow(d) {
    const s = statusClass(d);
    const active = d.id === selectedDevice;
    const fav = favs.has(d.id);

    return (
      <div key={d.id} className="deviceRowWrapper">
        <button
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

        {/* Tag editor row (shown when showTags enabled) */}
        {showTags && devicesRef && (
          <TagEditor
            device={d}
            devicesRef={devicesRef}
            onTagsChanged={onTagsChanged}
          />
        )}
      </div>
    );
  }

  return (
    <div className="devicePanel">
      <div className="devicePanelTop">
        <div>
          <div className="devicePanelTitle">{title}</div>
          <div className="devicePanelSub muted">
            {filtered.length} shown • {devices.length} total
            {activeTags.length > 0 && ` • ${activeTags.length} tag filter(s)`}
          </div>
        </div>

        {showSearch ? (
          <input
            className="deviceSearch"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search device, role, or tag…"
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

      {/* Tag filter chips (Milestone 2.3) */}
      {showTags && allTags.length > 0 && (
        <div className="tagFilterSection">
          <div className="tagFilterHeader">
            <span className="tagFilterLabel muted">Tags:</span>
            {activeTags.length > 0 && (
              <button
                type="button"
                className="tagFilterClear"
                onClick={clearTagFilters}
              >
                Clear filters
              </button>
            )}
          </div>
          <div className="tagFilterChips">
            {allTags.map(([tag, count]) => (
              <TagChip
                key={tag}
                tag={tag}
                count={count}
                active={activeTags.includes(tag)}
                onClick={() => toggleTagFilter(tag)}
              />
            ))}
          </div>
        </div>
      )}

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
