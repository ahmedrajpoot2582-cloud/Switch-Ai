import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import * as db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Middleware for Protected Routes
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.headers['x-api-key']) {
    token = req.headers['x-api-key'];
  } else if (req.query.apiKey) {
    token = req.query.apiKey;
  }

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Missing API Key" });
  }

  const user = db.getUserByApiKey(token);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired API Key" });
  }

  req.user = user;
  req.apiKey = token;
  next();
}

// --- AUTHENTICATION ROUTES ---

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: "Username and password (min 6 chars) are required." });
  }
  try {
    const user = db.registerUser(username, password);
    res.status(201).json({
      message: "Account created successfully",
      user
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }
  try {
    const user = db.loginUser(username, password);
    res.json({
      message: "Login successful",
      user
    });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    apiKey: req.user.apiKey
  });
});

// --- USER DASHBOARD & AI CONNECTIONS (PROTECTED) ---

app.get('/api/user/status', requireAuth, (req, res) => {
  try {
    const state = db.getUserDashboardState(req.apiKey);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate connection prompt for selected AI
app.post('/api/ai/generate-connect-prompt', requireAuth, (req, res) => {
  const { aiId } = req.body;
  if (!aiId) return res.status(400).json({ error: "AI identifier is required." });
  try {
    const connectData = db.generateConnectPrompt(req.apiKey, aiId);
    res.json(connectData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Secure MCP Handshake (Called when an AI links using the token)
app.post('/api/mcp/handshake', (req, res) => {
  const { token, aiId, aiName } = req.body;
  if (!token || !aiId) {
    return res.status(400).json({ error: "Token and AI ID are required for handshake." });
  }
  try {
    const connectedAis = db.performHandshake(token, aiId, aiName);
    res.json({
      success: true,
      message: `${aiName || aiId} successfully connected and verified via secure token.`,
      connectedAis
    });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// Disconnect AI
app.post('/api/ai/disconnect', requireAuth, (req, res) => {
  const { aiId } = req.body;
  try {
    const connectedAis = db.disconnectAi(req.apiKey, aiId);
    res.json({ success: true, connectedAis });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Switch AI session (User-scoped)
app.post('/api/switch-ai', requireAuth, (req, res) => {
  const { fromAi, toAi, reason, nextStep } = req.body;
  try {
    const result = db.switchUserAi(req.apiKey, { fromAi, toAi, reason, nextStep });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get Latest Handoff Prompt
app.get('/api/handoff-prompt', requireAuth, (req, res) => {
  try {
    const prompt = db.generateUserHandoffPrompt(req.user);
    res.json({ prompt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tasks
app.get('/api/tasks', requireAuth, (req, res) => {
  res.json(req.user.tasks || []);
});

app.post('/api/tasks', requireAuth, (req, res) => {
  const { title, priority } = req.body;
  if (!title) return res.status(400).json({ error: "Task title required" });
  const task = db.addUserTask(req.apiKey, { title, priority });
  res.status(201).json(task);
});

app.patch('/api/tasks/:id/toggle', requireAuth, (req, res) => {
  const { completed } = req.body;
  const task = db.toggleUserTask(req.apiKey, req.params.id, completed);
  res.json(task || { error: "Task not found" });
});

// Notes
app.get('/api/notes', requireAuth, (req, res) => {
  res.json(req.user.notes || []);
});

// Start Server locally if run directly
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`  Switch-Ai Secure Server is running!`);
    console.log(`  Dashboard:  http://localhost:${PORT}`);
    console.log(`==================================================\n`);
  });
}

export default app;
