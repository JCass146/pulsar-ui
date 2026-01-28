/**
 * IconButton Component
 * Minimal icon-only button with hover effects
 */

import React from 'react';
import './IconButton.css';

/**
 * IconButton - Icon-only button with minimal visual weight
 */
export const IconButton = React.forwardRef(({
  icon: Icon,
  children,
  className = '',
  variant = 'default',
  size = 'md',
  title = '',
  disabled = false,
  onClick,
  ...props
}, ref) => (
  <button
    ref={ref}
    className={`icon-button icon-button--${variant} icon-button--${size} ${disabled ? 'icon-button--disabled' : ''} ${className}`}
    title={title}
    disabled={disabled}
    onClick={onClick}
    {...props}
  >
    {Icon && <Icon className="icon-button__icon" />}
    {children && <span className="icon-button__label">{children}</span>}
  </button>
));
IconButton.displayName = 'IconButton';

export default IconButton;
