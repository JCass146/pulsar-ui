/**
 * Pill Component
 * Compact label/status element with icon support
 */

import React from 'react';
import './Pill.css';

/**
 * Pill - Compact badge/label element
 * Can be used for status, tags, or labels
 */
export const Pill = React.forwardRef(({
  children,
  className = '',
  variant = 'default',
  size = 'sm',
  icon: Icon = null,
  ...props
}, ref) => (
  <span
    ref={ref}
    className={`pill pill--${variant} pill--${size} ${className}`}
    {...props}
  >
    {Icon && <Icon className="pill__icon" />}
    <span className="pill__text">{children}</span>
  </span>
));
Pill.displayName = 'Pill';

export default Pill;
