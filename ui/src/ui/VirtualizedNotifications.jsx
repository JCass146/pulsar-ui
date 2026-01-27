import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

function VirtualizedNotifications({ notifItems, clearNotifs }) {
  // Group notifications by level for better organization
  const groupedNotifications = useMemo(() => {
    const groups = {
      'bad': [],
      'warn': [],
      'ok': [],
      'info': []
    };

    notifItems.forEach(notif => {
      const level = notif.level || 'info';
      if (groups[level]) {
        groups[level].push(notif);
      }
    });

    return groups;
  }, [notifItems]);

  // Flatten all notifications for virtualization
  const allNotifications = useMemo(() => {
    return Object.values(groupedNotifications).flat();
  }, [groupedNotifications]);

  // Row renderer for virtualized list
  const Row = ({ index, style }) => {
    const notif = allNotifications[index];
    const level = notif.level || 'info';

    return (
      <div style={style}>
        <div className={`notifRow ${level}`}>
          <div className="notifTop">
            <span className="mono notifTitle">{notif.title}</span>
            <span className="mono muted" style={{ fontSize: 11 }}>
              {new Date(notif.t_ms).toLocaleTimeString()}
            </span>
          </div>
          {notif.detail ? <div className="muted notifDetail">{notif.detail}</div> : null}
        </div>
      </div>
    );
  };

  return (
    <div className="notifList">
      {notifItems.length === 0 ? (
        <div className="muted">No notifications yet.</div>
      ) : (
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={Math.min(height, 320)}
              itemCount={allNotifications.length}
              itemSize={64} // Approximate height of notification row
              width={width}
            >
              {Row}
            </List>
          )}
        </AutoSizer>
      )}
    </div>
  );
}

export default VirtualizedNotifications;