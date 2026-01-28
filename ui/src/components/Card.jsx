/**
 * Card Component Suite
 * Reusable card primitives that enforce tokenized spacing and layout
 * Used throughout dashboard for consistent visual hierarchy
 */

import React from 'react';
import './Card.css';

/**
 * Card - Base container with standardized padding and shadow
 */
export const Card = React.forwardRef(({
  children,
  className = '',
  interactive = false,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={`card ${interactive ? 'card--interactive' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
));
Card.displayName = 'Card';

/**
 * CardHeader - Top section with standard spacing
 */
export const CardHeader = React.forwardRef(({
  children,
  className = '',
  divider = false,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={`card__header ${divider ? 'card__header--divider' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
));
CardHeader.displayName = 'CardHeader';

/**
 * CardTitle - Primary heading within card
 */
export const CardTitle = React.forwardRef(({
  children,
  className = '',
  size = 'md',
  ...props
}, ref) => (
  <h3
    ref={ref}
    className={`card__title card__title--${size} ${className}`}
    {...props}
  >
    {children}
  </h3>
));
CardTitle.displayName = 'CardTitle';

/**
 * CardMeta - Subtitle/metadata section below title
 */
export const CardMeta = React.forwardRef(({
  children,
  className = '',
  ...props
}, ref) => (
  <div
    ref={ref}
    className={`card__meta ${className}`}
    {...props}
  >
    {children}
  </div>
));
CardMeta.displayName = 'CardMeta';

/**
 * CardBody - Main content area with standard padding
 */
export const CardBody = React.forwardRef(({
  children,
  className = '',
  scrollable = false,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={`card__body ${scrollable ? 'card__body--scrollable' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
));
CardBody.displayName = 'CardBody';

/**
 * CardFooter - Bottom section with standard spacing
 */
export const CardFooter = React.forwardRef(({
  children,
  className = '',
  divider = true,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={`card__footer ${divider ? 'card__footer--divider' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
));
CardFooter.displayName = 'CardFooter';

export default Card;
