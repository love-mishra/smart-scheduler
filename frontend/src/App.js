import React, { useState } from 'react';
import './App.css';
import ThemeToggle from './components/ThemeToggle';

function Spinner() {
  return (
    <div className="spinner" role="status" aria-label="loading">
      <div></div><div></div><div></div><div></div>
    </div>
  );
}

export default function App() {
  const [inputJson, setInputJson] = useState(`{
  "tasks": [
    {"title":"Design API","estimatedHours":5,"dueDate":"2025-10-25","dependencies":[]},
    {"title":"Implement Backend","estimatedHours":12,"dueDate":"2025-10-28","dependencies":["Design API"]},
    {"title":"Build Frontend","estimatedHours":10,"dueDate":"2025-10-30","dependencies":["Design API"]},
    {"title":"End-to-End Test","estimatedHours":8,"dueDate":"2025-10-31","dependencies":["Implement Backend","Build Frontend"]}
  ]
}`);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [mockMode, setMockMode] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

  // Minimum spinner visibility (ms). Tune this value to taste: 400-900ms are common.
  const MIN_LOADING_MS = 700;
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSuccessMsg(null);

    // Validate JSON first (good UX)
    let bodyObj;
    try {
      bodyObj = JSON.parse(inputJson);
      if (!bodyObj.tasks) throw new Error('Top-level "tasks" array missing.');
    } catch (err) {
      setError(`Invalid JSON: ${err.message}`);
      return;
    }

    const startedAt = Date.now();
    setLoading(true);

    // Mock mode: simulate backend but ensure spinner stays visible at least MIN_LOADING_MS
    if (mockMode) {
      try {
        // simulate short network jitter so mock feels realistic
        await sleep(140 + Math.random() * 400); // ~140-540ms
        setResult(['Design API','Implement Backend','Build Frontend','End-to-End Test']);
        setSuccessMsg('Result (mocked) — backend not called.');
      } catch (err) {
        setError(`Mock failed: ${err.message}`);
      } finally {
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
        await sleep(remaining);
        setLoading(false);
      }
      return;
    }

    // Real network request
    try {
      const resp = await fetch(`${backendUrl}/api/v1/projects/demo/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyObj),
      });

      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        const msg = data?.error || `Server returned ${resp.status}`;
        throw new Error(msg);
      }

      setResult(data.recommendedOrder || []);
      setSuccessMsg('Schedule computed successfully.');
    } catch (err) {
      setError(`Request failed: ${err.message}`);
    } finally {
      // ensure spinner visible at least MIN_LOADING_MS
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
      await sleep(remaining);
      setLoading(false);
    }
  }

  function copyResult() {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setSuccessMsg('Result copied to clipboard.');
    setTimeout(() => setSuccessMsg(null), 1500);
  }

  return (
    <div className="app-root">
      {/* ====== HEADER: replaced with brand + theme toggle ====== */}
      <header className="header card">
        <div className="brand">
          <div className="logo">SS</div>
          <div>
            <div className="title">Smart Scheduler</div>
            <div className="subtitle">Plan tasks automatically — Demo</div>
          </div>
        </div>

        <div className="controls">
          {/* ThemeToggle lives here */}
          <ThemeToggle />
        </div>
      </header>

      <main className="app-main card">
        <form onSubmit={handleSubmit} className="form">
          <label htmlFor="tasks">Tasks JSON</label>
          <textarea
            id="tasks"
            value={inputJson}
            onChange={e => setInputJson(e.target.value)}
            className="json-input input"
            rows={12}
            aria-label="Tasks JSON"
          />

          <div className="controls form-controls" style={{ marginTop: 12 }}>
            <label className="mock-toggle small">
              <input type="checkbox" checked={mockMode} onChange={e => setMockMode(e.target.checked)} />
              Mock mode (test UI without backend)
            </label>

            <div className="buttons">
              <button type="submit" className="primary btn" disabled={loading}>
                {loading ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </div>
        </form>

        <section className="feedback" aria-live="polite" style={{ marginTop: 18 }}>
          {loading && <div className="loading-row"><Spinner /><span style={{ marginLeft: 8 }}>Working on it…</span></div>}
          {error && <div className="error">{error}</div>}
          {successMsg && <div className="success">{successMsg}</div>}

          {result && (
            <div className="result-card card" style={{ marginTop: 12 }}>
              <div className="result-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0 }}>Recommended order</h3>
                <div>
                  <button onClick={copyResult} className="small btn secondary">Copy</button>
                </div>
              </div>
              <ol className="result-list" style={{ marginTop: 12 }}>
                {result.map((t, i) => <li key={i}>{t}</li>)}
              </ol>
            </div>
          )}
        </section>
      </main>

      <footer className="app-footer small card" style={{ marginTop: 18 }}>
        <div>Backend URL: <code>{backendUrl}</code></div>
      </footer>
    </div>
  );
}
