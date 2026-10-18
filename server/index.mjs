import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { randomUUID } from "node:crypto";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, "../dist");
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

const sessions = new Map();
const workspace = new Map([
  ["README.md", "# Welcome to Side Hustle Code\n\nAn OpenCode-inspired AI coding workspace.\n\n- Ask the agent to explain code\n- Request implementation plans\n- Generate files and review diffs\n\nThis demo uses a memory-backed workspace. Files reset on restart; connect durable storage before relying on it for important work.\n"],
  ["src/app.ts", "export function greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n"],
  ["package.json", JSON.stringify({ name: "your-project", private: true, scripts: { test: "echo \\"Add tests\\"" } }, null, 2)]
]);

function providerConfigured() {
  return Boolean(process.env.AI_API_KEY && process.env.AI_API_KEY !== "replace_me");
}
function getClient() {
  if (!providerConfigured()) return null;
  return new OpenAI({
    apiKey: process.env.AI_API_KEY,
    baseURL: process.env.AI_BASE_URL || undefined
  });
}
app.get("/api/health", (_req, res) => res.json({ ok: true, providerConfigured: providerConfigured() }));
app.get("/api/config", (_req, res) => res.json({
  providerConfigured: providerConfigured(),
  model: process.env.AI_MODEL || "gpt-4o-mini",
  appName: "Side Hustle Code"
}));
app.get("/api/files", (_req, res) => res.json({
  files: [...workspace.entries()].map(([path, content]) => ({ path, content }))
}));
app.get("/api/files/*path", (req, res) => {
  const filePath = Array.isArray(req.params.path) ? req.params.path.join("/") : String(req.params.path || "");
  const content = workspace.get(filePath);
  if (content === undefined) return res.status(404).json({ error: "File not found" });
  res.json({ path: filePath, content });
});
app.put("/api/files", (req, res) => {
  const { path: filePath, content } = req.body || {};
  if (typeof filePath !== "string" || typeof content !== "string") {
    return res.status(400).json({ error: "path and content are required" });
  }
  if (filePath.startsWith("/") || filePath.includes("..") || filePath.length > 180 || content.length > 500_000) {
    return res.status(400).json({ error: "Invalid path or file too large" });
  }
  workspace.set(filePath, content);
  res.json({ ok: true, path: filePath });
});
app.post("/api/chat", async (req, res) => {
  const { message, sessionId, fileContext } = req.body || {};
  if (typeof message !== "string" || !message.trim()) return res.status(400).json({ error: "message is required" });
  if (message.length > 20_000) return res.status(400).json({ error: "Message too long" });

  const id = typeof sessionId === "string" ? sessionId : randomUUID();
  const history = sessions.get(id) || [];
  const client = getClient();
  const systemPrompt = `You are Side Hustle Code, a careful AI coding assistant inspired by modern terminal coding agents. Help users understand, plan, and implement software. Be explicit when you cannot inspect or run a real repository. Do not claim tools were executed unless they were. When suggesting edits, return complete code blocks and explain paths. This server currently exposes a memory-backed sample workspace only: it has no arbitrary shell execution and cannot access the user's computer.\n\nCurrent workspace context:\n${typeof fileContext === "string" ? fileContext.slice(0, 30_000) : "(no file selected)"}`;
  try {
    if (!client) {
      return res.status(503).json({
        error: "AI provider is not configured.",
        details: "Set AI_API_KEY in Render Environment. Optionally set AI_BASE_URL and AI_MODEL for your provider."
      });
    }
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-12),
      { role: "user", content: message.trim() }
    ];
    const completion = await client.chat.completions.create({
      model: process.env.AI_MODEL || "gpt-4o-mini",
      messages,
      temperature: 0.2
    });
    const answer = completion.choices?.[0]?.message?.content || "The model returned an empty response.";
    sessions.set(id, [...history.slice(-12), { role: "user", content: message.trim() }, { role: "assistant", content: answer }]);
    res.json({ sessionId: id, answer, model: completion.model });
  } catch (err) {
    console.error("AI request failed:", err?.message || err);
    res.status(502).json({ error: "The AI provider request failed.", details: "Check provider URL, API key, model name, and provider quota in Render logs." });
  }
});
app.use(express.static(distPath));
app.get("*path", (_req, res, next) => {
  if (_req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(distPath, "index.html"));
});
app.listen(PORT, "0.0.0.0", () => console.log(`Side Hustle Code listening on ${PORT}`));
