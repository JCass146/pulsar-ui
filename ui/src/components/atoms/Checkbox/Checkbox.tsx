import { InputHTMLAttributes } from 'react';
import styles from './Checkbox.module.css';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return (
    <label className={`${styles.checkboxLabel} ${className || ''}`}>
      <input type="checkbox" className={styles.checkbox} {...props} />
      {label && <span className={styles.labelText}>{label}</span>}
    </label>
  );
}
