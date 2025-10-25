import React, { useState } from 'react';
import './App.css';

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

    // If mock mode, simulate a delay then show static result
    if (mockMode) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setResult(['Design API','Implement Backend','Build Frontend','End-to-End Test']);
        setSuccessMsg('Result (mocked) — backend not called.');
      }, 900);
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(`${backendUrl}/api/v1/projects/demo/schedule`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(bodyObj),
      });

      // network-level success, but server may return 400 with JSON
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
      setLoading(false);
    }
  }

  function copyResult() {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setSuccessMsg('Result copied to clipboard.');
    setTimeout(()=>setSuccessMsg(null), 1500);
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Smart Scheduler — Demo</h1>
        <small>Paste tasks as JSON and click <strong>Schedule</strong></small>
      </header>

      <main className="app-main">
        <form onSubmit={handleSubmit} className="form">
          <label htmlFor="tasks">Tasks JSON</label>
          <textarea
            id="tasks"
            value={inputJson}
            onChange={e => setInputJson(e.target.value)}
            className="json-input"
            rows={12}
            aria-label="Tasks JSON"
          />

          <div className="controls">
            <label className="mock-toggle">
              <input type="checkbox" checked={mockMode} onChange={e=>setMockMode(e.target.checked)} />
              Mock mode (test UI without backend)
            </label>

            <div className="buttons">
              <button type="submit" className="primary" disabled={loading}>
                {loading ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </div>
        </form>

        <section className="feedback" aria-live="polite">
          {loading && <div className="loading-row"><Spinner /><span>Working on it…</span></div>}
          {error && <div className="error">{error}</div>}
          {successMsg && <div className="success">{successMsg}</div>}

          {result && (
            <div className="result-card">
              <div className="result-head">
                <h3>Recommended order</h3>
                <div>
                  <button onClick={copyResult} className="small">Copy</button>
                </div>
              </div>
              <ol className="result-list">
                {result.map((t,i)=> <li key={i}>{t}</li>)}
              </ol>
            </div>
          )}
        </section>
      </main>

      <footer className="app-footer">
        <div>Backend URL: <code>{backendUrl}</code></div>
      </footer>
    </div>
  );
}
