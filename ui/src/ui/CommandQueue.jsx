/**
 * CommandQueue.jsx - Milestone 3.1
 *
 * Active Command Queue / Intent Panel
 * Shows pending commands, their lifecycle status, and recent history.
 * Provides visibility into command flow and enables command cancellation.
 */

import React, { useState, useMemo, useCallback } from "react";
import { formatDuration, nowIsoMs } from "../utils/helpers.js";

/**
 * Command status badge colors
 */
const STATUS_CONFIG = {
  pending: { label: "Pending", className: "pending", icon: "⏳" },
  sent: { label: "Sent", className: "sent", icon: "📤" },
  acked: { label: "Acked", className: "ok", icon: "✓" },
  timeout: { label: "Timeout", className: "warn", icon: "⏱" },
  failed: { label: "Failed", className: "bad", icon: "✗" },
  cancelled: { label: "Cancelled", className: "muted", icon: "⊘" },
};

/**
 * StagedCommandRow - A command waiting for review before sending
 */
function StagedCommandRow({ cmd, onExecute, onCancel, isBroadcast = false }) {
  const topic = `pulsar/${cmd.deviceId}/cmd/${cmd.action}`;
  const isDangerous = cmd.isDangerous;

  return (
    <div className={`cmdStagedRow ${isDangerous ? 'danger' : ''}`}>
      <div className="cmdStagedHeader">
        <div className="cmdStagedTarget">
          <span className="cmdStagedDevice">{cmd.deviceId}</span>
          <span className="cmdStagedAction">{cmd.action}</span>
          {isBroadcast && (
            <span className="cmdStagedBroadcast">📡 Broadcast to {cmd.deviceCount} devices</span>
          )}
        </div>
        {isDangerous && (
          <span className="cmdStagedDanger">⚠ Dangerous</span>
        )}
      </div>

      <div className="cmdStagedDetails">
        <div className="cmdStagedTopic">
          <span className="cmdStagedTopicLabel">Topic:</span>
          <span className="cmdStagedTopicValue mono">{topic}</span>
        </div>

        <div className="cmdStagedPayload">
          <span className="cmdStagedPayloadLabel">Payload:</span>
          <pre className="cmdStagedPayloadValue">{JSON.stringify(cmd.args, null, 2)}</pre>
        </div>
      </div>

      <div className="cmdStagedActions">
        <button
          type="button"
          className={`cmdStagedExecute ${isDangerous ? 'danger' : 'primary'}`}
          onClick={() => onExecute(cmd)}
        >
          {isDangerous ? '⚠ Execute Dangerous' : 'Execute'}
        </button>
        <button
          type="button"
          className="cmdStagedCancel secondary"
          onClick={() => onCancel(cmd)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * PendingCommandRow - A single pending command with cancel option
 */
function PendingCommandRow({ cmd, onCancel, deviceTick }) {
  const elapsed = Date.now() - cmd.tStart;
  const progress = cmd.timeoutMs ? Math.min((elapsed / cmd.timeoutMs) * 100, 100) : 0;

  return (
    <div className="cmdQueueRow pending">
      <div className="cmdQueueRowTop">
        <div className="cmdQueueTarget">
          <span className="cmdQueueDevice">{cmd.deviceId}</span>
          <span className="cmdQueueAction">{cmd.action}</span>
        </div>
        <div className="cmdQueueRowRight">
          <StatusBadge status="pending" />
          {onCancel && (
            <button
              className="cmdCancelBtn"
              onClick={() => onCancel(cmd.id, cmd.deviceId)}
              title="Cancel command"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <div className="cmdQueueProgress">
        <div className="cmdQueueProgressBar" style={{ width: `${progress}%` }} />
      </div>
      <div className="cmdQueueRowMeta">
        <span className="cmdQueueElapsed">{formatDuration(elapsed)} ago</span>
        <span className="cmdQueueId mono">id: {cmd.id.slice(0, 8)}...</span>
      </div>
    </div>
  );
}

/**
 * HistoryCommandRow - A completed command in history
 */
function HistoryCommandRow({ cmd, onRetry, expanded, onToggleExpand }) {
  const hasPayload = cmd.payload && Object.keys(cmd.payload).length > 0;
  const hasError = !!cmd.error;

  return (
    <div className={`cmdQueueRow history ${cmd.status}`}>
      <div className="cmdQueueRowTop">
        <div className="cmdQueueTarget">
          <span className="cmdQueueDevice">{cmd.device}</span>
          <span className="cmdQueueAction">{cmd.action}</span>
        </div>
        <div className="cmdQueueRowRight">
          <StatusBadge status={cmd.status} />
          <span className="cmdQueueTime">{cmd.t?.split("T")[1]?.slice(0, 8) || ""}</span>
        </div>
      </div>

      {(hasPayload || hasError) && (
        <button
          className="cmdQueueExpandBtn"
          onClick={() => onToggleExpand(cmd.id)}
        >
          {expanded ? "▼ Hide details" : "▶ Show details"}
        </button>
      )}

      {expanded && (
        <div className="cmdQueueDetails">
          {hasError && (
            <div className="cmdQueueError">
              <span className="cmdQueueErrorLabel">Error:</span>
              <span className="cmdQueueErrorText">{String(cmd.error)}</span>
            </div>
          )}
          {hasPayload && (
            <pre className="cmdQueuePayload">
              {JSON.stringify(cmd.payload, null, 2)}
            </pre>
          )}
        </div>
      )}

      {onRetry && (cmd.status === "timeout" || cmd.status === "failed") && (
        <button
          className="cmdRetryBtn"
          onClick={() => onRetry(cmd)}
          title="Retry this command"
        >
          ↻ Retry
        </button>
      )}
    </div>
  );
}

/**
 * IntentSummary - Shows aggregate intent stats
 */
function IntentSummary({ pendingCount, recentStats }) {
  return (
    <div className="cmdIntentSummary">
      <div className={`cmdIntentStat ${pendingCount > 0 ? "active" : ""}`}>
        <span className="cmdIntentNum">{pendingCount}</span>
        <span className="cmdIntentLabel">Pending</span>
      </div>
      <div className="cmdIntentStat ok">
        <span className="cmdIntentNum">{recentStats.acked}</span>
        <span className="cmdIntentLabel">Acked</span>
      </div>
      <div className="cmdIntentStat warn">
        <span className="cmdIntentNum">{recentStats.timeout}</span>
        <span className="cmdIntentLabel">Timeout</span>
      </div>
      <div className="cmdIntentStat bad">
        <span className="cmdIntentNum">{recentStats.failed}</span>
        <span className="cmdIntentLabel">Failed</span>
      </div>
    </div>
  );
}

/**
 * CommandQueue - Main component
 *
 * @param {Object} props
 * @param {Map} props.devicesRef - Reference to devices map
 * @param {Array} props.cmdHistory - Command history array
 * @param {number} props.deviceTick - Tick to trigger re-render
 * @param {Function} props.onCancelCommand - Cancel a pending command
 * @param {Function} props.onRetryCommand - Retry a failed command
 * @param {boolean} props.collapsed - Whether panel is collapsed
 * @param {Function} props.onToggleCollapse - Toggle collapse state
 * @param {Array} props.stagedCommands - Commands waiting for review
 * @param {Function} props.onExecuteStaged - Execute a staged command
 * @param {Function} props.onCancelStaged - Cancel a staged command
 * @param {boolean} props.expertMode - Skip staging for safe commands
 * @param {Function} props.onToggleExpertMode - Toggle expert mode
 */
export default function CommandQueue({
  devicesRef,
  cmdHistory = [],
  deviceTick,
  onCancelCommand,
  onRetryCommand,
  collapsed = false,
  onToggleCollapse,
  maxHistoryDisplay = 20,
  stagedCommands = [],
  onExecuteStaged,
  onCancelStaged,
  expertMode = false,
  onToggleExpertMode,
}) {
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [historyFilter, setHistoryFilter] = useState("all"); // all, acked, timeout, failed

  // Gather all pending commands from devices
  const pendingCommands = useMemo(() => {
    const pending = [];
    if (!devicesRef?.current) return pending;

    for (const [deviceId, device] of devicesRef.current.entries()) {
      if (device.pendingCommands) {
        for (const [cmdId, cmd] of device.pendingCommands.entries()) {
          pending.push({
            ...cmd,
            deviceId,
            timeoutMs: cmd.timeoutMs || 10000,
          });
        }
      }
    }

    // Sort by start time (newest first)
    return pending.sort((a, b) => b.tStart - a.tStart);
  }, [devicesRef, deviceTick]);

  // Calculate recent stats from history (last 50 commands)
  const recentStats = useMemo(() => {
    const stats = { acked: 0, timeout: 0, failed: 0 };
    const recent = cmdHistory.slice(0, 50);
    for (const cmd of recent) {
      if (cmd.status === "acked") stats.acked++;
      else if (cmd.status === "timeout") stats.timeout++;
      else if (cmd.status === "failed") stats.failed++;
    }
    return stats;
  }, [cmdHistory]);

  // Filter history
  const filteredHistory = useMemo(() => {
    if (historyFilter === "all") return cmdHistory.slice(0, maxHistoryDisplay);
    return cmdHistory
      .filter((c) => c.status === historyFilter)
      .slice(0, maxHistoryDisplay);
  }, [cmdHistory, historyFilter, maxHistoryDisplay]);

  const toggleExpand = useCallback((id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCancel = useCallback(
    (cmdId, deviceId) => {
      if (onCancelCommand) {
        onCancelCommand(cmdId, deviceId);
      }
    },
    [onCancelCommand]
  );

  const handleRetry = useCallback(
    (cmd) => {
      if (onRetryCommand) {
        onRetryCommand(cmd.device, cmd.action, cmd.payload?.args || {});
      }
    },
    [onRetryCommand]
  );

  return (
    <div className={`commandQueue ${collapsed ? "collapsed" : ""}`}>
      <div className="cmdQueueHeader">
        <div className="cmdQueueHeaderLeft">
          {onToggleCollapse && (
            <button className="cmdQueueCollapseBtn" onClick={onToggleCollapse}>
              {collapsed ? "▶" : "▼"}
            </button>
          )}
          <h2 className="cmdQueueTitle">Command Queue</h2>
        </div>
        <IntentSummary
          pendingCount={pendingCommands.length}
          recentStats={recentStats}
        />
      </div>

      {!collapsed && (
        <>
          {/* Expert Mode Toggle */}
          {onToggleExpertMode && (
            <div className="cmdExpertMode">
              <label className="cmdExpertModeLabel">
                <input
                  type="checkbox"
                  checked={expertMode}
                  onChange={onToggleExpertMode}
                />
                <span className="cmdExpertModeText">Expert Mode: Skip staging for safe commands</span>
              </label>
            </div>
          )}

          {/* Staged commands section */}
          {stagedCommands.length > 0 && (
            <div className="cmdQueueSection">
              <div className="cmdQueueSectionHeader">
                <span className="cmdQueueSectionTitle">
                  Review Before Send ({stagedCommands.length})
                </span>
              </div>
              <div className="cmdQueueList staged">
                {stagedCommands.map((cmd, index) => (
                  <StagedCommandRow
                    key={`staged-${index}`}
                    cmd={cmd}
                    onExecute={onExecuteStaged}
                    onCancel={onCancelStaged}
                    isBroadcast={cmd.deviceCount > 1}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pending commands section */}
          {pendingCommands.length > 0 && (
            <div className="cmdQueueSection">
              <div className="cmdQueueSectionHeader">
                <span className="cmdQueueSectionTitle">
                  Active ({pendingCommands.length})
                </span>
              </div>
              <div className="cmdQueueList pending">
                {pendingCommands.map((cmd) => (
                  <PendingCommandRow
                    key={`${cmd.deviceId}-${cmd.id}`}
                    cmd={cmd}
                    onCancel={onCancelCommand ? handleCancel : null}
                    deviceTick={deviceTick}
                  />
                ))}
              </div>
            </div>
          )}

          {/* History section */}
          <div className="cmdQueueSection">
            <div className="cmdQueueSectionHeader">
              <span className="cmdQueueSectionTitle">History</span>
              <div className="cmdQueueFilters">
                {["all", "acked", "timeout", "failed"].map((f) => (
                  <button
                    key={f}
                    className={`cmdQueueFilterBtn ${historyFilter === f ? "active" : ""}`}
                    onClick={() => setHistoryFilter(f)}
                  >
                    {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="cmdQueueList history">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((cmd) => (
                  <HistoryCommandRow
                    key={`${cmd.device}-${cmd.id}-${cmd.t}`}
                    cmd={cmd}
                    onRetry={onRetryCommand ? handleRetry : null}
                    expanded={expandedIds.has(cmd.id)}
                    onToggleExpand={toggleExpand}
                  />
                ))
              ) : (
                <div className="cmdQueueEmpty">
                  {historyFilter === "all"
                    ? "No commands yet"
                    : `No ${historyFilter} commands`}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
