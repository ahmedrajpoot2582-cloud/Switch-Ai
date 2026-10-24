import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

// Helper to hash passwords securely
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate secure API key
function generateApiKey() {
  return `sk_switchai_${crypto.randomBytes(16).toString('hex')}`;
}

const INITIAL_DATA = {
  users: [
    {
      id: "user-default",
      username: "ahmed",
      passwordHash: hashPassword("password123"),
      apiKey: "sk_switchai_demo_ahmed_2026",
      createdAt: new Date().toISOString(),
      // By default: NO AI CONNECTED! User must connect manually!
      connectedAis: [],
      checkpoints: [],
      tasks: [],
      notes: []
    }
  ]
};

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {}
  }
  if (!fs.existsSync(DB_FILE)) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
    } catch (e) {}
  }
}

export function readStore() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (!data.users) {
      data.users = INITIAL_DATA.users;
      writeStore(data);
    }
    return data;
  } catch (err) {
    return INITIAL_DATA;
  }
}

export function writeStore(data) {
  ensureDataFile();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // If running in read-only environment like Vercel, fallback gracefully
    console.error("Storage write error:", err.message);
  }
}

// --- AUTHENTICATION ---
export function registerUser(username, password) {
  const store = readStore();
  const existing = store.users.find(u => u.username.toLowerCase() === username.toLowerCase().trim());
  if (existing) {
    throw new Error("Username already taken. Please choose another username.");
  }

  const newUser = {
    id: `user-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    username: username.trim(),
    passwordHash: hashPassword(password),
    apiKey: generateApiKey(),
    createdAt: new Date().toISOString(),
    connectedAis: [], // Starts completely empty!
    checkpoints: [],
    tasks: [],
    notes: []
  };

  store.users.push(newUser);
  writeStore(store);
  return {
    id: newUser.id,
    username: newUser.username,
    apiKey: newUser.apiKey
  };
}

export function loginUser(username, password) {
  const store = readStore();
  const user = store.users.find(u => u.username.toLowerCase() === username.toLowerCase().trim());
  if (!user || user.passwordHash !== hashPassword(password)) {
    throw new Error("Invalid username or password.");
  }
  return {
    id: user.id,
    username: user.username,
    apiKey: user.apiKey
  };
}

export function getUserByApiKey(apiKey) {
  if (!apiKey) return null;
  const store = readStore();
  return store.users.find(u => u.apiKey === apiKey.trim()) || null;
}

// --- AI CONNECTION LIFECYCLE ---

// Generate connection prompt for a given AI provider
export function generateConnectPrompt(apiKey, aiId) {
  const user = getUserByApiKey(apiKey);
  if (!user) throw new Error("Unauthorized: Invalid API Key");

  const mcpServerPath = path.join(__dirname, 'mcp-server.js');
  let prompt = "";
  let command = "";
  let instructions = "";

  switch (aiId.toLowerCase()) {
    case 'opencode':
      command = `opencode mcp add switch-ai -- node "${mcpServerPath}" --token="${user.apiKey}"`;
      instructions = `Apne terminal me yeh command paste karein. OpenCode is secure token ke sath Switch-Ai se connect ho jayega:`;
      prompt = `${instructions}\n\n${command}`;
      break;

    case 'antigravity':
      command = JSON.stringify({
        mcpServers: {
          "switch-ai": {
            command: "node",
            args: [mcpServerPath, `--token=${user.apiKey}`],
            env: { "SWITCHAI_TOKEN": user.apiKey }
          }
        }
      }, null, 2);
      instructions = `Antigravity IDE me connect karne ke liye ~/.gemini/config/mcp_config.json me yeh configuration add karein:`;
      prompt = `${instructions}\n\n${command}`;
      break;

    case 'chatgpt':
      instructions = `ChatGPT / Claude Web ke liye yeh secure prompt apni chat me bhejein:`;
      prompt = `You are now integrated with Switch-Ai project continuity hub.\nSecure User Key: ${user.apiKey}\nEndpoint: http://localhost:3000/api\nWhen task is handed off or rate limit is reached, output a standardized handoff brief for the next AI.`;
      break;

    case 'claude':
      instructions = `Claude Desktop app ke claude_desktop_config.json me yeh snippet dalein:`;
      command = JSON.stringify({
        mcpServers: {
          "switch-ai": {
            command: "node",
            args: [mcpServerPath, `--token=${user.apiKey}`]
          }
        }
      }, null, 2);
      prompt = `${instructions}\n\n${command}`;
      break;

    default:
      prompt = `Connect AI with Key: ${user.apiKey}`;
  }

  return {
    aiId,
    token: user.apiKey,
    prompt,
    command
  };
}

// Perform Handshake to mark an AI connected
export function performHandshake(apiKey, aiId, aiName) {
  const store = readStore();
  const user = store.users.find(u => u.apiKey === apiKey);
  if (!user) throw new Error("Unauthorized: Invalid API Key");

  if (!user.connectedAis) user.connectedAis = [];
  
  const existing = user.connectedAis.find(a => a.id === aiId);
  if (!existing) {
    user.connectedAis.push({
      id: aiId,
      name: aiName || aiId,
      status: "connected",
      connectedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    });
  } else {
    existing.status = "connected";
    existing.lastSeen = new Date().toISOString();
  }

  writeStore(store);
  return user.connectedAis;
}

// Disconnect an AI
export function disconnectAi(apiKey, aiId) {
  const store = readStore();
  const user = store.users.find(u => u.apiKey === apiKey);
  if (!user) throw new Error("Unauthorized: Invalid API Key");

  user.connectedAis = (user.connectedAis || []).filter(a => a.id !== aiId);
  writeStore(store);
  return user.connectedAis;
}

// Get user state & connected AIs
export function getUserDashboardState(apiKey) {
  const user = getUserByApiKey(apiKey);
  if (!user) throw new Error("Unauthorized");

  return {
    username: user.username,
    apiKey: user.apiKey,
    connectedAis: user.connectedAis || [],
    checkpointsCount: (user.checkpoints || []).length,
    latestCheckpoint: (user.checkpoints || [])[0] || null,
    tasks: user.tasks || [],
    notes: user.notes || []
  };
}

// Switch AI session (User-scoped)
export function switchUserAi(apiKey, { fromAi, toAi, reason = "Rate Limit Exceeded", nextStep }) {
  const store = readStore();
  const user = store.users.find(u => u.apiKey === apiKey);
  if (!user) throw new Error("Unauthorized");

  if (!user.checkpoints) user.checkpoints = [];

  const newCheckpoint = {
    id: `cp-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    projectName: "Switch-Ai Project",
    exitingAi: fromAi,
    incomingAi: toAi,
    reason,
    nextStep,
    goal: "Resume project without repeating completed work",
    completedWork: [
      `Completed work phase with ${fromAi}`,
      `Handed over project state to Switch-Ai Hub`
    ],
    pendingWork: [
      nextStep,
      "Verify workspace and continue next development step"
    ],
    filesModified: ["db.js", "web-server.js", "mcp-server.js"]
  };

  user.checkpoints.unshift(newCheckpoint);
  writeStore(store);

  return {
    checkpoint: newCheckpoint,
    handoffPrompt: generateUserHandoffPrompt(user)
  };
}

export function generateUserHandoffPrompt(user) {
  const cp = (user.checkpoints || [])[0];
  if (!cp) return "No active handoff checkpoint found.";

  return `### 🔄 AI SESSION HANDOVER BRIEF
**Project:** ${cp.projectName}
**Previous AI:** ${cp.exitingAi} (Status: ${cp.reason})
**Handing Over To:** ${cp.incomingAi}
**Timestamp:** ${new Date(cp.timestamp).toLocaleString()}

#### 🎯 Active Goal:
${cp.goal}

#### ✅ Already Completed by ${cp.exitingAi}:
${cp.completedWork.map(w => `- ${w}`).join("\n")}

#### ⏳ Pending Steps (START HERE):
${cp.pendingWork.map((w, idx) => `${idx + 1}. **${w}**`).join("\n")}

#### 📁 Files Affected / Modified:
${cp.filesModified.map(f => `- \`${f}\``).join("\n")}

#### 📝 Special Instructions:
> "Switched from ${cp.exitingAi} due to ${cp.reason}. Start immediately on: ${cp.nextStep}"

---
**Instruction for AI:** Read the brief above and immediately continue with Step 1 of Pending Steps.`;
}

// Task & Note management
export function addUserTask(apiKey, { title, priority = "medium" }) {
  const store = readStore();
  const user = store.users.find(u => u.apiKey === apiKey);
  if (!user) throw new Error("Unauthorized");

  if (!user.tasks) user.tasks = [];
  const newTask = {
    id: `task-${Date.now()}`,
    title: title.trim(),
    priority,
    completed: false,
    createdAt: new Date().toISOString()
  };
  user.tasks.unshift(newTask);
  writeStore(store);
  return newTask;
}

export function toggleUserTask(apiKey, taskId, completed) {
  const store = readStore();
  const user = store.users.find(u => u.apiKey === apiKey);
  if (!user) throw new Error("Unauthorized");

  const task = (user.tasks || []).find(t => t.id === taskId);
  if (task) {
    task.completed = completed;
    writeStore(store);
  }
  return task;
}
