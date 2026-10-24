import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as db from "./db.js";

// Parse Token from Command Line Arguments or Environment
const args = process.argv.slice(2);
let userToken = process.env.SWITCHAI_TOKEN || null;

for (const arg of args) {
  if (arg.startsWith('--token=')) {
    userToken = arg.split('=')[1];
  } else if (arg.startsWith('--key=')) {
    userToken = arg.split('=')[1];
  }
}

// Fallback to default demo user if local dev without token
if (!userToken) {
  userToken = "sk_switchai_demo_ahmed_2026";
}

// Helper to validate user token before tool execution
function validateToken() {
  const user = db.getUserByApiKey(userToken);
  if (!user) {
    throw new Error(`Unauthorized: Invalid Switch-Ai Security Key. Please pass --token="sk_switchai_..."`);
  }
  return user;
}

// Auto-register handshake when server connects
try {
  db.performHandshake(userToken, "opencode", "OpenCode CLI");
} catch (e) {
  console.error("Initial handshake note:", e.message);
}

// Initialize MCP Server
const server = new McpServer({
  name: "switch-ai-secure-mcp",
  version: "3.0.0"
});

// 1. One-Click AI Switcher (Pass the baton from one AI to another)
server.tool(
  "switch_ai_session",
  {
    fromAi: z.string().describe("The AI that is exiting or hit limit (e.g. 'OpenCode', 'ChatGPT')"),
    toAi: z.string().describe("The target AI taking over (e.g. 'Antigravity', 'Claude')"),
    reason: z.string().optional().describe("Reason for switching"),
    nextStep: z.string().describe("The exact next task or file for the incoming AI to execute")
  },
  async ({ fromAi, toAi, reason = "Rate Limit Exceeded", nextStep }) => {
    validateToken();
    const result = db.switchUserAi(userToken, { fromAi, toAi, reason, nextStep });

    return {
      content: [
        {
          type: "text",
          text: `🔄 AI SWITCH COMPLETED SECURELY!\nFrom: ${fromAi} ➡️ To: ${toAi}\n\nIncoming AI Continuation Brief:\n\n${result.handoffPrompt}`
        }
      ]
    };
  }
);

// 2. Get Latest Handoff Brief
server.tool(
  "get_latest_handoff",
  {},
  async () => {
    const user = validateToken();
    const brief = db.generateUserHandoffPrompt(user);
    return {
      content: [
        {
          type: "text",
          text: brief
        }
      ]
    };
  }
);

// 3. Add Project Task
server.tool(
  "create_task",
  {
    title: z.string().describe("Task description"),
    priority: z.enum(["low", "medium", "high"]).optional().describe("Priority level")
  },
  async ({ title, priority = "medium" }) => {
    validateToken();
    const task = db.addUserTask(userToken, { title, priority });
    return {
      content: [
        {
          type: "text",
          text: `Task added! ID: ${task.id}, Title: ${task.title}`
        }
      ]
    };
  }
);

// Start stdio transport
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Switch-Ai Secure MCP Server running on stdio");
}

run().catch((err) => {
  console.error("Fatal error running MCP server:", err);
  process.exit(1);
});
