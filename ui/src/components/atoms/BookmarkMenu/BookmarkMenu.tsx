import { useState, useRef, useEffect } from 'react';
import styles from './BookmarkMenu.module.css';

export interface BookmarkMenuProps {
  currentType: 'main' | 'live' | null;
  onBookmark: (type: 'main' | 'live' | null) => void;
  disabled?: boolean;
}

export function BookmarkMenu({ currentType, onBookmark, disabled = false }: BookmarkMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (type: 'main' | 'live' | null) => {
    onBookmark(type);
    setIsOpen(false);
  };

  const getStarDisplay = () => {
    if (currentType === 'main') return '📌'; // Main bookmark
    if (currentType === 'live') return '⭐'; // Live bookmark
    return '☆'; // Not bookmarked
  };

  return (
    <div ref={menuRef} className={styles.menuContainer}>
      <button
        className={styles.triggerButton}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        title="Bookmark options"
      >
        {getStarDisplay()}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <button
            className={`${styles.option} ${currentType === 'main' ? styles.active : ''}`}
            onClick={() => handleSelect(currentType === 'main' ? null : 'main')}
          >
            <span className={styles.icon}>📌</span>
            <span className={styles.text}>Pin to Main</span>
            {currentType === 'main' && <span className={styles.check}>✓</span>}
          </button>

          <button
            className={`${styles.option} ${currentType === 'live' ? styles.active : ''}`}
            onClick={() => handleSelect(currentType === 'live' ? null : 'live')}
          >
            <span className={styles.icon}>⭐</span>
            <span className={styles.text}>Save to Live</span>
            {currentType === 'live' && <span className={styles.check}>✓</span>}
          </button>

          {currentType !== null && (
            <>
              <div className={styles.divider} />
              <button
                className={styles.option}
                onClick={() => handleSelect(null)}
              >
                <span className={styles.icon}>✕</span>
                <span className={styles.text}>Remove Bookmark</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
