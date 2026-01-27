import React from 'react';
import { useTheme } from '../context/ThemeContext';

function ThemeToggle() {
  const { theme, currentTheme, toggleTheme } = useTheme();

  // Get theme icons and labels
  const getThemeInfo = () => {
    switch (theme) {
      case 'light':
        return { icon: '☀️', label: 'Light', nextLabel: 'System' };
      case 'system':
        return { icon: currentTheme === 'dark' ? '🌙' : '☀️', label: 'System', nextLabel: 'Dark' };
      case 'dark':
      default:
        return { icon: '🌙', label: 'Dark', nextLabel: 'Light' };
    }
  };

  const { icon, label, nextLabel } = getThemeInfo();

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      title={`Switch to ${nextLabel} theme`}
      aria-label={`Switch to ${nextLabel} theme`}
    >
      <span className="theme-icon">{icon}</span>
      <span className="theme-label">{label}</span>
    </button>
  );
}

export default ThemeToggle;