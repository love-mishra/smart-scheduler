// src/components/ThemeToggle.js
import React, { useEffect, useState } from 'react';

const KEY = 'smart-scheduler-theme';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(KEY) || 'system';
    } catch {
      return 'system';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (theme === 'dark') root.classList.add('dark');
    else if (theme === 'light') root.classList.add('light');
    try { localStorage.setItem(KEY, theme); } catch {}
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button onClick={toggle} className="btn" title="Toggle theme" aria-label="Toggle theme" style={{ padding: '8px 10px' }}>
        {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
      </button>

      <select value={theme} onChange={(e) => setTheme(e.target.value)} className="input" style={{ padding: '8px', height: '40px', borderRadius: 8 }}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  );
}
