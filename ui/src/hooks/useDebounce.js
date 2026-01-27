import { useState, useEffect } from 'react';

/**
 * Custom hook for debouncing values
 * @param {any} value - The value to debounce
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {any} The debounced value
 */
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set debounced value immediately if delay is 0
    if (delay === 0) {
      setDebouncedValue(value);
      return;
    }

    // Set debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup timeout on value or delay change
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook for throttling function calls
 * @param {Function} callback - The function to throttle
 * @param {number} limit - Minimum time between calls in milliseconds
 * @returns {Function} The throttled function
 */
export function useThrottle(callback, limit) {
  const [lastCall, setLastCall] = useState(0);

  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= limit) {
      callback(...args);
      setLastCall(now);
    }
  };
}

/**
 * Custom hook for memoizing expensive computations with deep comparison
 * @param {Function} computation - The computation function
 * @param {Array} dependencies - Dependency array
 * @returns {any} The memoized result
 */
export function useDeepMemo(computation, dependencies) {
  const [memoizedValue, setMemoizedValue] = useState(computation());

  useEffect(() => {
    // Deep compare dependencies
    const isEqual = dependencies.every((dep, index) => {
      const prevDep = dependencies[index];
      return JSON.stringify(dep) === JSON.stringify(prevDep);
    });

    if (!isEqual) {
      setMemoizedValue(computation());
    }
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  return memoizedValue;
}