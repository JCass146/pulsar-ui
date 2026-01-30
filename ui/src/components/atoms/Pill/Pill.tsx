import { HTMLAttributes } from 'react';
import styles from './Pill.module.css';

export interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

export function Pill({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...props
}: PillProps) {
  return (
    <span
      className={`${styles.pill} ${styles[variant]} ${styles[size]} ${className || ''}`}
      {...props}
    >
      {children}
    </span>
  );
}
