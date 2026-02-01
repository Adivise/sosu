import { useState, useEffect } from 'react';

export default function useLocalStorageState(key, defaultValue, options = {}) {
  const {
    serializer = (v) => {
      try { return JSON.stringify(v); } catch (e) { return String(v); }
    },
    deserializer = (v) => {
      if (v === null) return null;
      try { return JSON.parse(v); } catch (e) { return v; }
    }
  } = options;

  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) {
        return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
      }
      const parsed = deserializer(raw);
      return (parsed === null || parsed === undefined) ? (typeof defaultValue === 'function' ? defaultValue() : defaultValue) : parsed;
    } catch (err) {
      return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, serializer(state));
    } catch (err) {
      // ignore
    }
  }, [key, state, serializer]);

  return [state, setState];
}
