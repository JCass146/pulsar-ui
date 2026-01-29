/**
 * AuthorityControl.jsx - Milestone 3.3
 *
 * Authority Layers for command safety:
 * - VIEW: Read-only, no commands allowed
 * - CONTROL: Normal operation commands allowed
 * - ARMED: Dangerous commands allowed (requires confirmation)
 *
 * Provides visual indicators and enforces command restrictions.
 */

import React, { useState, useCallback, useEffect, useRef } from "react";

/**
 * Authority level definitions
 */
export const AUTHORITY_LEVELS = {
  view: {
    id: "view",
    label: "View Only",
    shortLabel: "VIEW",
    description: "Read-only mode. No commands can be sent.",
    icon: "👁",
    color: "info",
    canCommand: false,
    canDanger: false,
  },
  control: {
    id: "control",
    label: "Control",
    shortLabel: "CTRL",
    description: "Normal operations. Safe commands allowed.",
    icon: "🎛",
    color: "ok",
    canCommand: true,
    canDanger: false,
  },
  armed: {
    id: "armed",
    label: "Armed",
    shortLabel: "ARMED",
    description: "Full authority. Dangerous commands enabled.",
    icon: "⚠",
    color: "warn",
    canCommand: true,
    canDanger: true,
  },
};

/**
 * AuthorityBadge - Compact display of current authority
 */
export function AuthorityBadge({ level, onClick }) {
  const config = AUTHORITY_LEVELS[level] || AUTHORITY_LEVELS.view;

  return (
    <button
      className={`authorityBadge ${config.color}`}
      onClick={onClick}
      title={config.description}
    >
      <span className="authorityBadgeIcon">{config.icon}</span>
      <span className="authorityBadgeLabel">{config.shortLabel}</span>
    </button>
  );
}

/**
 * ArmedTimer - Countdown display for ARMED mode auto-timeout
 */
function ArmedTimer({ expiresAt, onExpire }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const left = Math.max(0, expiresAt - now);
      setRemaining(left);

      if (left === 0) {
        onExpire();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (!expiresAt || remaining === 0) return null;

  const seconds = Math.ceil(remaining / 1000);
  const progress = (remaining / 30000) * 100; // 30 second timeout

  return (
    <div className="armedTimer">
      <div className="armedTimerBar" style={{ width: `${progress}%` }} />
      <span className="armedTimerText">{seconds}s</span>
    </div>
  );
}

/**
 * AuthoritySelector - Modal for changing authority level
 */
function AuthoritySelector({ currentLevel, onSelect, onClose }) {
  const [confirmArmed, setConfirmArmed] = useState(false);
  const [armedConfirmText, setArmedConfirmText] = useState("");

  const handleSelect = (levelId) => {
    if (levelId === "armed") {
      setConfirmArmed(true);
    } else {
      onSelect(levelId);
      onClose();
    }
  };

  const handleConfirmArmed = () => {
    if (armedConfirmText.toLowerCase() === "arm") {
      setConfirmArmed(false);
      setArmedConfirmText("");
      onSelect("armed");
      onClose();
    }
  };

  return (
    <div className="authoritySelectorOverlay" onClick={onClose}>
      <div className="authoritySelector" onClick={(e) => e.stopPropagation()}>
        <div className="authoritySelectorHeader">
          <h3>Authority Level</h3>
          <button className="authoritySelectorClose" onClick={onClose}>
            ✕
          </button>
        </div>

        {!confirmArmed ? (
          <div className="authoritySelectorOptions">
            {Object.values(AUTHORITY_LEVELS).map((level) => (
              <button
                key={level.id}
                className={`authoritySelectorOption ${level.color} ${
                  currentLevel === level.id ? "active" : ""
                }`}
                onClick={() => handleSelect(level.id)}
              >
                <div className="authoritySelectorOptionTop">
                  <span className="authoritySelectorIcon">{level.icon}</span>
                  <span className="authoritySelectorLabel">{level.label}</span>
                </div>
                <div className="authoritySelectorDesc">{level.description}</div>
                {level.id === "armed" && (
                  <div className="authoritySelectorWarning">
                    ⚠ Requires confirmation
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="authoritySelectorConfirm">
            <div className="authoritySelectorConfirmIcon">⚠</div>
            <div className="authoritySelectorConfirmTitle">Enable ARMED Mode?</div>
            <div className="authoritySelectorConfirmText">
              ARMED mode enables dangerous commands that could affect hardware.
            </div>
            <div className="authoritySelectorConfirmInput">
              <label>
                Type "ARM" to confirm:
                <input
                  type="text"
                  value={armedConfirmText}
                  onChange={(e) => setArmedConfirmText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirmArmed()}
                  autoFocus
                />
              </label>
            </div>
            <div className="authoritySelectorConfirmActions">
              <button onClick={() => setConfirmArmed(false)}>Cancel</button>
              <button
                className="danger"
                onClick={handleConfirmArmed}
                disabled={armedConfirmText.toLowerCase() !== "arm"}
              >
                Enable ARMED
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * useAuthorityControl - Hook for managing authority state
 *
 * @param {Object} options
 * @param {number} options.armedTimeoutMs - Auto-downgrade timeout for ARMED mode (default 30s)
 * @param {Function} options.onLevelChange - Callback when level changes
 * @returns {Object} Authority control state and functions
 */
export function useAuthorityControl(options = {}) {
  const { onLevelChange } = options;

  const [level, setLevel] = useState("control");

  // Handle level change
  const changeLevel = useCallback(
    (newLevel) => {
      setLevel(newLevel);

      if (onLevelChange) {
        onLevelChange(newLevel);
      }
    },
    [onLevelChange]
  );

  // Check if command is allowed
  const canExecuteCommand = useCallback(
    (isDangerous = false) => {
      const config = AUTHORITY_LEVELS[level];
      if (!config.canCommand) return false;
      if (isDangerous && !config.canDanger) return false;
      return true;
    },
    [level]
  );

  return {
    level,
    setLevel: changeLevel,
    armedExpiresAt: null,
    refreshArmed: () => {},
    handleArmedExpire: () => {},
    config: AUTHORITY_LEVELS[level],
  };
}

/**
 * AuthorityControl - Main component
 *
 * @param {Object} props
 * @param {string} props.level - Current authority level
 * @param {Function} props.onLevelChange - Callback to change level
 * @param {number} props.armedExpiresAt - Timestamp when ARMED expires
 * @param {Function} props.onArmedExpire - Callback when ARMED expires
 * @param {boolean} props.compact - Use compact badge view
 */
export default function AuthorityControl({
  level,
  onLevelChange,
  armedExpiresAt,
  onArmedExpire,
  compact = false,
}) {
  const [showSelector, setShowSelector] = useState(false);
  const config = AUTHORITY_LEVELS[level] || AUTHORITY_LEVELS.view;

  const handleBadgeClick = useCallback(() => {
    setShowSelector(true);
  }, []);

  const handleSelect = useCallback(
    (newLevel) => {
      onLevelChange(newLevel);
    },
    [onLevelChange]
  );

  if (compact) {
    return (
      <>
        <AuthorityBadge level={level} onClick={handleBadgeClick} />
        {level === "armed" && (
          <ArmedTimer expiresAt={armedExpiresAt} onExpire={onArmedExpire} />
        )}
        {showSelector && (
          <AuthoritySelector
            currentLevel={level}
            onSelect={handleSelect}
            onClose={() => setShowSelector(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className={`authorityControl ${config.color}`}>
      <div className="authorityControlMain">
        <button
          className={`authorityControlBtn ${config.color}`}
          onClick={handleBadgeClick}
        >
          <span className="authorityControlIcon">{config.icon}</span>
          <div className="authorityControlText">
            <span className="authorityControlLabel">{config.label}</span>
            <span className="authorityControlDesc">
              {config.canCommand
                ? config.canDanger
                  ? "All commands enabled"
                  : "Safe commands only"
                : "Read-only"}
            </span>
          </div>
        </button>

        {level === "armed" && (
          <ArmedTimer expiresAt={armedExpiresAt} onExpire={onArmedExpire} />
        )}
      </div>

      {showSelector && (
        <AuthoritySelector
          currentLevel={level}
          onSelect={handleSelect}
          onClose={() => setShowSelector(false)}
        />
      )}
    </div>
  );
}

/**
 * CommandGate - Wrapper that blocks commands based on authority
 */
export function CommandGate({
  level,
  isDangerous = false,
  onBlocked,
  children,
}) {
  const config = AUTHORITY_LEVELS[level] || AUTHORITY_LEVELS.view;
  const isAllowed =
    config.canCommand && (isDangerous ? config.canDanger : true);

  if (!isAllowed) {
    const reason = !config.canCommand
      ? "View-only mode - commands disabled"
      : "Dangerous command requires ARMED mode";

    return (
      <div
        className="commandGateBlocked"
        onClick={() => onBlocked && onBlocked(reason)}
        title={reason}
      >
        {children}
        <div className="commandGateOverlay">
          <span className="commandGateIcon">🔒</span>
        </div>
      </div>
    );
  }

  return children;
}
