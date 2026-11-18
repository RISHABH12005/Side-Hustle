import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { randomUUID } from "node:crypto";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const here = path.dirname(fileURLToPath(import.meta.url));
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

const sessions = new Map();
const workspace = new Map([
  ["README.md", "# Welcome to Side Hustle Code\n\nAn OpenCode-inspired AI coding workspace.\n"],
  ["src/app.ts", "export function greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n"],
  ["package.json", JSON.stringify({ name: "your-project", private: true }, null, 2)]
]);
const configured = () => Boolean(process.env.AI_API_KEY && process.env.AI_API_KEY !== "replace_me");
const client = () => configured() ? new OpenAI({ apiKey: process.env.AI_API_KEY, baseURL: process.env.AI_BASE_URL || undefined }) : null;
app.get("/api/health", (_req,res) => res.json({ok:true, providerConfigured:configured()}));
app.get("/api/config", (_req,res) => res.json({providerConfigured:configured(),model:process.env.AI_MODEL || "gpt-4o-mini"}));
app.get("/api/files", (_req,res) => res.json({files:[...workspace.entries()].map(([path,content])=>({path,content}))}));
app.put("/api/files", (req,res) => {
  const {path:filePath,content} = req.body || {};
  if(typeof filePath!=="string" || typeof content!=="string") return res.status(400).json({error:"path and content are required"});
  if(filePath.startsWith("/") || filePath.includes("..") || filePath.length>180 || content.length>500000) return res.status(400).json({error:"Invalid path or file too large"});
  workspace.set(filePath,content); res.json({ok:true,path:filePath});
});
app.post("/api/chat", async (req,res) => {
  const {message,sessionId,fileContext} = req.body || {};
  if(typeof message!=="string" || !message.trim()) return res.status(400).json({error:"message is required"});
  if(message.length>20000) return res.status(400).json({error:"Message too long"});
  const id = typeof sessionId==="string" ? sessionId : randomUUID();
  const history = sessions.get(id) || [];
  const ai = client();
  if(!ai) return res.status(503).json({error:"AI provider is not configured.",details:"Set AI_API_KEY in Render Environment. Optionally set AI_BASE_URL and AI_MODEL."});
  try {
    const completion = await ai.chat.completions.create({model:process.env.AI_MODEL || "gpt-4o-mini",temperature:0.2,messages:[
      {role:"system",content:"You are Side Hustle Code, a careful AI coding assistant inspired by coding-agent workflows. Help explain, plan, and implement software. Never claim tools were executed unless they were. The current sample workspace is memory-backed, has no arbitrary shell execution and cannot access the user's computer.\n\nWorkspace context:\n"+(typeof fileContext==="string"?fileContext.slice(0,30000):"(no selected file)")},
      ...history.slice(-12),{role:"user",content:message.trim()}
    ]});
    const answer=completion.choices?.[0]?.message?.content || "The model returned an empty response.";
    sessions.set(id,[...history.slice(-12),{role:"user",content:message.trim()},{role:"assistant",content:answer}]);
    res.json({sessionId:id,answer,model:completion.model});
  } catch(err) {
    console.error("AI request failed:",err?.message || err);
    res.status(502).json({error:"The AI provider request failed.",details:"Check provider URL, API key, model name and quota in Render logs."});
  }
});
app.use(express.static(path.resolve(here,"../dist")));
app.get("*path", (req,res,next) => req.path.startsWith("/api/") ? next() : res.sendFile(path.resolve(here,"../dist/index.html")));
app.listen(PORT,"0.0.0.0",()=>console.log(`Side Hustle Code listening on ${PORT}`));