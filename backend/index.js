// backend/index.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

/* --------------------------
   Simple request logging
   (add this directly after middleware)
   -------------------------- */
   app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
    next();
  });
  
  /* --------------------------
     Health endpoint
     (add this before other routes)
     -------------------------- */
  app.get('/healthz', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });
  
function parseDate(s){
  if(!s) return null;
  const d = new Date(s + 'T00:00:00Z');
  if (isNaN(d)) return null;
  return d.getTime();
}

function scheduler(tasks) {
  if(!Array.isArray(tasks)) throw new Error('tasks must be an array');

  const taskMap = new Map();
  for (const t of tasks) {
    if (!t.title || typeof t.title !== 'string') throw new Error('every task must have a string title');
    if (taskMap.has(t.title)) throw new Error(`duplicate task title: ${t.title}`);
    const dueMs = parseDate(t.dueDate);
    if (t.dueDate && dueMs === null) throw new Error(`invalid dueDate for "${t.title}"`);
    taskMap.set(t.title, {
      title: t.title,
      estimatedHours: Number(t.estimatedHours) || 0,
      dueDateMs: dueMs,
      dependencies: Array.isArray(t.dependencies) ? t.dependencies.slice() : []
    });
  }

  const inDegree = new Map();
  const adj = new Map();
  for (const title of taskMap.keys()) {
    inDegree.set(title, 0);
    adj.set(title, []);
  }

  for (const [title, task] of taskMap.entries()) {
    for (const dep of task.dependencies) {
      if (!taskMap.has(dep)) throw new Error(`task "${title}" depends on unknown task "${dep}"`);
      adj.get(dep).push(title);
      inDegree.set(title, inDegree.get(title) + 1);
    }
  }

  const zero = [];
  for (const [title, deg] of inDegree.entries()) {
    if (deg === 0) zero.push(taskMap.get(title));
  }

  function compareA(a, b){
    const aDue = a.dueDateMs === null ? Infinity : a.dueDateMs;
    const bDue = b.dueDateMs === null ? Infinity : b.dueDateMs;
    if (aDue !== bDue) return aDue - bDue;
    if (a.estimatedHours !== b.estimatedHours) return a.estimatedHours - b.estimatedHours;
    return a.title.localeCompare(b.title);
  }

  const result = [];
  while (zero.length) {
    zero.sort(compareA);
    const cur = zero.shift();
    result.push(cur.title);

    for (const nb of adj.get(cur.title)) {
      inDegree.set(nb, inDegree.get(nb) - 1);
      if (inDegree.get(nb) === 0) zero.push(taskMap.get(nb));
    }
  }

  if (result.length !== tasks.length) {
    const remaining = [];
    for (const [t, deg] of inDegree.entries()) {
      if (deg > 0) remaining.push(t);
    }
    throw new Error('cycle detected among tasks: ' + remaining.join(', '));
  }

  return result;
}

app.post('/api/v1/projects/:projectId/schedule', (req, res) => {
  try {
    const body = req.body;
    if (!body || !body.tasks) {
      return res.status(400).json({ error: 'request body must contain tasks array' });
    }
    const recommendedOrder = scheduler(body.tasks);
    return res.json({ recommendedOrder });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Scheduler API listening on port ${PORT}`);
});
