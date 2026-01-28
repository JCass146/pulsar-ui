/**
 * SectionHeader Component
 * Visual section title with optional actions
 */

import React from 'react';
import './SectionHeader.css';

/**
 * SectionHeader - Section divider with title and optional right-aligned content
 */
export const SectionHeader = React.forwardRef(({
  title,
  children,
  actions = null,
  className = '',
  level = 2,
  ...props
}, ref) => {
  const HeadingTag = `h${level}`;
  
  return (
    <div
      ref={ref}
      className={`section-header ${className}`}
      {...props}
    >
      <div className="section-header__left">
        <HeadingTag className="section-header__title">
          {title}
        </HeadingTag>
        {children && <div className="section-header__content">{children}</div>}
      </div>
      {actions && <div className="section-header__actions">{actions}</div>}
    </div>
  );
});
SectionHeader.displayName = 'SectionHeader';

export default SectionHeader;
