import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDown, ArrowUp, Check, ChevronDown, ChevronRight, CircleHelp,
  Command, FileCode2, FileText, Folder, GitBranch, History, LoaderCircle,
  Menu, MessageSquare, MoreHorizontal, PanelLeftClose, Paperclip, Plus,
  Search, Settings2, Sparkles, SquareTerminal, X
} from "lucide-react";

type WorkspaceFile = { path: string; content: string };
type ChatMessage = { role: "user" | "assistant"; content: string };
type Session = { id: string; title: string; updated: string; messages: ChatMessage[] };

const initialFiles: WorkspaceFile[] = [
  { path: "README.md", content: "# Welcome to Side Hustle Code\n\nAn OpenCode-inspired AI coding workspace.\n\nAsk the agent to explain code, propose fixes, and draft implementation plans.\n" },
  { path: "src/app.ts", content: "export function greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n" },
  { path: "package.json", content: "{\n  \"name\": \"your-project\",\n  \"private\": true\n}\n" }
];

const starterPrompts = [
  { title: "Understand this codebase", detail: "Map the project and explain how it works", prompt: "Explore the available workspace files and explain how this project is structured." },
  { title: "Find a bug", detail: "Inspect code and suggest a fix", prompt: "Inspect the available workspace files for likely bugs and explain how to fix them." },
  { title: "Plan a feature", detail: "Break an idea into implementation steps", prompt: "Help me plan a new feature. First ask any essential questions, then outline implementation steps." },
  { title: "Write tests", detail: "Identify important test cases", prompt: "Suggest meaningful tests for the currently available workspace files." }
];

export default function App() {
  const [files, setFiles] = useState<WorkspaceFile[]>(initialFiles);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState("new");
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [provider, setProvider] = useState(false);
  const [model, setModel] = useState("gpt-4o-mini");
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showFiles, setShowFiles] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [mode, setMode] = useState<"build" | "plan">("build");
  const [selectedPath, setSelectedPath] = useState("src/app.ts");

  const file = files.find(f => f.path === selectedPath);
  const filteredSessions = sessions.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));
  const lineCount = useMemo(() => (file?.content ?? "").split("\n").length, [file]);

  useEffect(() => {
    fetch("/api/config").then(r => r.json()).then(d => {
      setProvider(Boolean(d.providerConfigured));
      setModel(d.model || "gpt-4o-mini");
    }).catch(() => {});
    fetch("/api/files").then(r => r.json()).then(d => {
      if (d.files?.length) setFiles(d.files);
    }).catch(() => {});
  }, []);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function startNewSession() {
    setActiveSession("new");
    setMessages([]);
    setSessionId("");
    setInput("");
    setShowFiles(false);
  }

  function selectSession(session: Session) {
    setActiveSession(session.id);
    setMessages(session.messages);
    setShowFiles(false);
  }

  async function send(preset?: string) {
    const message = (preset ?? input).trim();
    if (!message || sending) return;
    setInput("");
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: message }];
    setMessages(nextMessages);
    setSending(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: mode === "plan" ? "[Plan mode: do not make changes. Analyze and propose a plan.]\n" + message : message,
          sessionId,
          fileContext: file ? "Selected workspace file: " + selectedPath + "\n" + file.content : ""
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.details || data.error || "The request failed.");
      if (data.sessionId) setSessionId(data.sessionId);
      const finalMessages: ChatMessage[] = [...nextMessages, { role: "assistant", content: data.answer }];
      setMessages(finalMessages);
      const id = activeSession === "new" ? String(Date.now()) : activeSession;
      setActiveSession(id);
      setSessions(previous => {
        const title = message.length > 42 ? message.slice(0, 42).trim() + "…" : message;
        const session = { id, title, updated: "Just now", messages: finalMessages };
        return [session, ...previous.filter(s => s.id !== id)];
      });
    } catch (error) {
      setMessages(current => [...current, {
        role: "assistant",
        content: error instanceof Error ? error.message : "Request failed. Check the AI provider configuration."
      }]);
    } finally {
      setSending(false);
    }
  }

  async function saveFile() {
    if (!file) return;
    try {
      const response = await fetch("/api/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: file.path, content: file.content })
      });
      if (!response.ok) throw new Error();
      notify("File saved");
    } catch {
      notify("Could not save file to the workspace");
    }
  }

  async function createFile() {
    const path = window.prompt("File path, e.g. src/utils.ts");
    if (!path?.trim()) return;
    if (files.some(f => f.path === path.trim())) return notify("That file already exists");
    const created = { path: path.trim(), content: "" };
    setFiles(current => [...current, created]);
    setSelectedPath(created.path);
    setShowFiles(true);
    try {
      await fetch("/api/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(created)
      });
    } catch { /* local UI remains available */ }
  }

  return (
    <div className="oc-app">
      <header className="oc-topbar">
        <div className="oc-top-left">
          <button className="oc-icon-button sidebar-toggle" aria-label="Toggle sidebar" onClick={() => setSidebarOpen(v => !v)}><PanelLeftClose size={16} /></button>
          <div className="oc-brand-mark"><span /></div>
          <span className="oc-brand-name">opencode</span>
          <span className="oc-brand-divider" />
          <button className="oc-project-switch" onClick={() => setShowFiles(v => !v)}><Folder size={14} /><span>side-hustle</span><ChevronDown size={13} /></button>
        </div>
        <div className="oc-top-center"><span className="oc-branch"><GitBranch size={13} /> main</span><span className="oc-top-separator">/</span><span className="oc-muted">workspace</span></div>
        <div className="oc-top-right">
          <span className={provider ? "oc-provider-dot connected" : "oc-provider-dot"} />
          <span className="oc-provider-label">{provider ? "Connected" : "Not connected"}</span>
          <button className="oc-icon-button" aria-label="Settings" onClick={() => setShowSettings(v => !v)}><Settings2 size={16} /></button>
          <button className="oc-icon-button" aria-label="More options" onClick={() => notify("More actions are not available in this prototype")}><MoreHorizontal size={17} /></button>
        </div>
      </header>

      <div className="oc-layout">
        {sidebarOpen && <aside className="oc-sidebar">
          <button className="oc-new-session" onClick={startNewSession}><Plus size={15} /><span>New session</span><kbd>⌘ N</kbd></button>
          <button className="oc-sidebar-action" onClick={() => setSearch(v => v ? "" : " ")}><Search size={14} /><span>Search sessions</span><kbd>⌘ K</kbd></button>
          <div className="oc-sidebar-section"><span>SESSIONS</span><button aria-label="New session" onClick={startNewSession}><Plus size={14} /></button></div>
          <div className="oc-session-list">
            {filteredSessions.length === 0 && <div className="oc-empty-sessions">{search ? "No matching sessions" : "Your recent sessions will appear here."}</div>}
            {filteredSessions.map(session => <button key={session.id} className={"oc-session-item " + (activeSession === session.id ? "active" : "")} onClick={() => selectSession(session)}>
              <MessageSquare size={14} /><span>{session.title}</span><small>{session.updated}</small>
            </button>)}
          </div>
          <div className="oc-sidebar-bottom">
            <button className="oc-sidebar-action" onClick={() => setShowFiles(v => !v)}><FileCode2 size={14} /><span>Workspace files</span><ChevronRight size={13} className={showFiles ? "rotated" : ""} /></button>
            {showFiles && <div className="oc-files-list">
              {files.map(f => <button key={f.path} className={selectedPath === f.path ? "active" : ""} onClick={() => setSelectedPath(f.path)}><FileText size={13} /><span>{f.path}</span></button>)}
              <button className="oc-add-file" onClick={createFile}><Plus size={13} /> New file</button>
              {file && <div className="oc-file-editor"><div className="oc-file-editor-head"><span>{selectedPath}</span><button onClick={saveFile} aria-label="Save file"><Check size={13} /></button></div><textarea value={file.content} onChange={e => setFiles(current => current.map(f => f.path === selectedPath ? { ...f, content: e.target.value } : f))} spellCheck={false} /><div className="oc-file-status">{lineCount} lines · Workspace file</div></div>}
            </div>}
            <div className="oc-account-row"><div className="oc-avatar">R</div><div className="oc-account-copy"><strong>Local workspace</strong><span>{provider ? model : "AI provider setup needed"}</span></div><button className="oc-icon-button" aria-label="Account options" onClick={() => setShowSettings(v => !v)}><MoreHorizontal size={16} /></button></div>
          </div>
        </aside>}

        <main className="oc-main">
          <div className="oc-session-header">
            <div className="oc-session-title"><span>{activeSession === "new" ? "New session" : (sessions.find(s => s.id === activeSession)?.title || "Session")}</span><ChevronDown size={14} /></div>
            <div className="oc-session-tools"><span className="oc-session-status"><span /> {sending ? "Working" : "Ready"}</span><button className="oc-icon-button" title="Session history" onClick={() => notify("Sessions are kept in this browser session only")}><History size={15} /></button><button className="oc-icon-button" title="Terminal" onClick={() => notify("A real terminal is not enabled in this hosted prototype")}><SquareTerminal size={15} /></button><button className="oc-icon-button" title="Session options" onClick={() => notify("Session options coming soon")}><MoreHorizontal size={16} /></button></div>
          </div>

          {messages.length === 0 ? <div className="oc-welcome-scroll">
            <section className="oc-welcome">
              <div className="oc-welcome-symbol"><span /></div>
              <h1>What are we building?</h1>
              <p>Start a conversation with your coding agent.</p>
              {!provider && <div className="oc-setup-notice"><div className="oc-setup-icon"><CircleHelp size={16} /></div><div><strong>Connect a model to get started</strong><span>Set AI_API_KEY and AI_BASE_URL in your Render service environment settings.</span></div><button onClick={() => setShowSettings(true)}>Setup <ChevronRight size={13} /></button></div>}
              <div className="oc-starter-grid">{starterPrompts.map(item => <button key={item.title} className="oc-starter-card" onClick={() => void send(item.prompt)}><span>{item.title}</span><small>{item.detail}</small><ArrowUp size={14} /></button>)}</div>
            </section>
          </div> : <div className="oc-conversation" key={activeSession}>
            {messages.map((message, index) => <article className={"oc-message " + message.role} key={index}>
              {message.role === "assistant" ? <div className="oc-message-mark"><span /></div> : <div className="oc-user-mark">R</div>}
              <div className="oc-message-content">
                <div className="oc-message-meta"><strong>{message.role === "assistant" ? "Build" : "You"}</strong>{message.role === "assistant" && <span className="oc-meta-model">{model}</span>}</div>
                <div className="oc-message-text">{message.content.split("\n").map((line, i) => <p key={i}>{line || "\u00a0"}</p>)}</div>
                {message.role === "assistant" && <div className="oc-message-actions"><button onClick={() => { void navigator.clipboard?.writeText(message.content); notify("Response copied"); }}><FileText size={12} /> Copy</button><button onClick={() => void send("Continue from your last response.")}><ArrowDown size={12} /> Continue</button></div>}
              </div>
            </article>)}
            {sending && <article className="oc-message assistant"><div className="oc-message-mark"><span /></div><div className="oc-message-content"><div className="oc-message-meta"><strong>Build</strong><span className="oc-meta-model">Working</span></div><div className="oc-thinking"><LoaderCircle size={14} /> Thinking through your request…</div></div></article>}
          </div>}

          <div className="oc-composer-area">
            <div className="oc-composer">
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder="Ask anything… (use @ to add context)" rows={3} aria-label="Message the coding agent" />
              <div className="oc-composer-toolbar">
                <div className="oc-composer-left">
                  <button className="oc-tool-button" title="Attach context" onClick={() => setShowFiles(v => !v)}><Paperclip size={15} /></button>
                  <button className="oc-mode-switch" onClick={() => setMode(v => v === "build" ? "plan" : "build")}><span className={mode === "plan" ? "oc-mode-dot plan" : "oc-mode-dot"} />{mode === "build" ? "Build" : "Plan"}<ChevronDown size={12} /></button>
                  <span className="oc-composer-divider" />
                  <button className="oc-model-switch" onClick={() => setShowSettings(true)}>{model}<ChevronDown size={12} /></button>
                </div>
                <div className="oc-composer-right"><span className="oc-key-hint"><kbd>↵</kbd> send</span><button className="oc-send-button" disabled={!input.trim() || sending} onClick={() => void send()} aria-label="Send message">{sending ? <LoaderCircle size={15} className="oc-spin" /> : <ArrowUp size={16} />}</button></div>
              </div>
            </div>
            <div className="oc-composer-caption"><span><Command size={11} /> K for commands</span><span>AI can make mistakes. Review important changes.</span></div>
          </div>
        </main>
      </div>

      {showSettings && <div className="oc-modal-backdrop" onClick={() => setShowSettings(false)}><section className="oc-settings-modal" onClick={e => e.stopPropagation()}><div className="oc-modal-header"><div><strong>Model configuration</strong><span>Connect an AI provider for live responses.</span></div><button className="oc-icon-button" onClick={() => setShowSettings(false)} aria-label="Close settings"><X size={16} /></button></div><div className="oc-settings-body"><div className="oc-setting-row"><div><strong>Provider status</strong><span>{provider ? "An AI provider is configured on the server." : "No AI provider key was detected by the server."}</span></div><span className={provider ? "oc-status-pill good" : "oc-status-pill"}>{provider ? "Connected" : "Not configured"}</span></div><div className="oc-setting-help"><strong>Configure on Render</strong><p>Open your service's Environment settings and set <code>AI_API_KEY</code>, <code>AI_BASE_URL</code>, and <code>AI_MODEL</code>. Never put API keys in this chat or in frontend code.</p><a href="https://dashboard.render.com/web/srv-dbah33jbc2fs73bcfe3g" target="_blank" rel="noreferrer">Open Render dashboard <ChevronRight size={13} /></a></div></div><div className="oc-modal-footer"><button className="oc-secondary-button" onClick={() => setShowSettings(false)}>Close</button><button className="oc-primary-button" onClick={() => { setShowSettings(false); notify("Refresh after configuring the provider on Render"); }}>Done</button></div></section></div>}
      {toast && <div className="oc-toast"><Check size={14} />{toast}</div>}
    </div>
  );
}
