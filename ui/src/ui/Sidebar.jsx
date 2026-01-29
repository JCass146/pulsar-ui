/**
 * Sidebar.jsx
 * Main navigation sidebar with branding, nav items, quick actions, and utilities
 */
import React, { useState } from 'react';
import { AuthorityBadge } from './AuthorityControl.jsx';
import './Sidebar.css';

export function Sidebar({
  currentTab,
  onTabChange,
  notificationCount = 0,
  onOpenNotifications,
  onOpenBroadcast,
  onOpenTags,
  onOpenSettings,
  authorityLevel,
  armedExpiresAt,
  onAuthorityClick,
  collapsed = false,
  onToggleCollapse,
}) {

  const navItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'fleet', icon: '🏭', label: 'Fleet' },
    { id: 'commands', icon: '⚡', label: 'Commands' },
    { id: 'timeline', icon: '⏱️', label: 'Timeline' },
    { id: 'raw', icon: '📡', label: 'Raw' },
  ];

  const quickActions = [
    { id: 'notifications', icon: '🔔', label: 'Notifications', badge: notificationCount, onClick: onOpenNotifications },
    { id: 'broadcast', icon: '⚡', label: 'Broadcast', onClick: onOpenBroadcast },
    { id: 'tags', icon: '🏷️', label: 'Tags', onClick: onOpenTags },
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Brand */}
      <div className="sidebar__brand">
        <div className="sidebar__logo" />
        {!collapsed && <span className="sidebar__brand-text">PULSAR</span>}
      </div>

      {/* Toggle */}
      <button
        className="sidebar__toggle"
        onClick={() => onToggleCollapse?.(!collapsed)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? '→' : '←'}
      </button>

      {/* Main Navigation */}
      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar__nav-item ${currentTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
            title={item.label}
          >
            <span className="sidebar__nav-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar__nav-label">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Quick Actions */}
      <div className="sidebar__actions">
        {quickActions.map((action) => (
          <button
            key={action.id}
            className="sidebar__action-item"
            onClick={action.onClick}
            title={action.label}
          >
            <span className="sidebar__action-icon">{action.icon}</span>
            {action.badge > 0 && (
              <span className="sidebar__badge">{action.badge}</span>
            )}
            {!collapsed && <span className="sidebar__action-label">{action.label}</span>}
          </button>
        ))}
      </div>
    </aside>
  );
}

export default Sidebar;
