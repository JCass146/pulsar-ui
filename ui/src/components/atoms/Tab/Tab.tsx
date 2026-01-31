import { ReactNode } from 'react';
import styles from './Tab.module.css';

export interface TabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon?: ReactNode;
}

export function Tab({ label, isActive, onClick, icon }: TabProps) {
  return (
    <button
      className={`${styles.tab} ${isActive ? styles.active : ''}`}
      onClick={onClick}
      type="button"
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.label}>{label}</span>
    </button>
  );
}

export interface TabBarProps {
  tabs: TabProps[];
  value: string;
  onChange: (value: string) => void;
}

export function TabBar({ tabs, value, onChange }: TabBarProps) {
  return (
    <div className={styles.tabBar}>
      {tabs.map((tab) => (
        <Tab
          key={tab.label}
          label={tab.label}
          isActive={tab.label === value}
          onClick={() => onChange(tab.label)}
          icon={tab.icon}
        />
      ))}
    </div>
  );
}
