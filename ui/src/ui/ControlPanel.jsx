/**
 * ControlPanel Component
 * Collapsible filter sections for dashboard controls
 */

import React, { useState } from 'react';
import { SectionHeader } from '../components/SectionHeader.jsx';
import { IconButton } from '../components/IconButton.jsx';
import './ControlPanel.css';

// Simple chevron-like indicator (can be replaced with icon library)
function ChevronIcon({ className = '' }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 3 6 0"></polyline>
    </svg>
  );
}

export function ControlPanel({ sections = [] }) {
  const [expandedSections, setExpandedSections] = useState(
    new Set(sections.map((_, i) => i).filter(i => sections[i].expanded !== false))
  );
  
  const toggleSection = (index) => {
    const next = new Set(expandedSections);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setExpandedSections(next);
  };
  
  return (
    <div className="control-panel">
      {sections.map((section, i) => (
        <div key={i} className="control-panel__section">
          <button
            className="control-panel__header-button"
            onClick={() => toggleSection(i)}
          >
            <div className="control-panel__header-content">
              <h3 className="control-panel__title">{section.title}</h3>
            </div>
            <ChevronIcon
              className={`control-panel__chevron ${
                expandedSections.has(i) ? 'open' : ''
              }`}
            />
          </button>
          
          {expandedSections.has(i) && (
            <div className="control-panel__content">
              {section.children}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default ControlPanel;
