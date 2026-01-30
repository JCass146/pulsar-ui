import { HTMLAttributes, ReactNode } from 'react';
import styles from './NavItem.module.css';

export interface NavItemProps extends Omit<HTMLAttributes<HTMLButtonElement>, 'onClick'> {
  icon: ReactNode;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
  badge?: number;
}

export function NavItem({
  icon,
  label,
  active = false,
  collapsed = false,
  onClick,
  badge,
  className,
  ...props
}: NavItemProps) {
  return (
    <button
      className={`${styles.navItem} ${active ? styles.active : ''} ${collapsed ? styles.collapsed : ''} ${className || ''}`}
      onClick={onClick}
      title={collapsed ? label : undefined}
      {...props}
    >
      <span className={styles.icon}>{icon}</span>
      {!collapsed && (
        <>
          <span className={styles.label}>{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className={styles.badge}>{badge}</span>
          )}
        </>
      )}
    </button>
  );
}
