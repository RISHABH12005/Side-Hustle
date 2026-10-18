import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDown, ArrowRight, Bot, Check, ChevronDown, ChevronRight, CircleHelp,
  Code2, Command, Copy, File, FileCode2, FilePlus2, Folder, FolderOpen, GitBranch,
  Globe, Hammer, History, LoaderCircle, Menu, MessageSquare, MoreHorizontal, PanelLeft,
  Play, Plus, Search, Send, Settings2, ShieldCheck, Sparkles, SquareTerminal, WandSparkles,
  X
} from "lucide-react";

type WorkspaceFile = { path: string; content: string };
type ChatMessage = { role: "user" | "assistant"; content: string };

const starterFiles: WorkspaceFile[] = [
  { path: "README.md", content: "# Welcome to Side Hustle Code\n\nAn OpenCode-inspired AI coding workspace.\n\nAsk the agent to explain code, propose fixes, and draft implementation plans.\n" },
  { path: "src/app.ts", content: "export function greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n" },
  { path: "package.json", content: "{\n  \"name\": \"your-project\",\n  \"private\": true\n}\n" }
];

export default function App() {
  const [files, setFiles] = useState<WorkspaceFile[]>(starterFiles);
  const [selectedPath, setSelectedPath] = useState("src/app.ts");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hey! I'm your coding partner. I can explain code, help plan changes, and draft implementations. Connect an AI provider in the deployment settings to enable live responses." }
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [model, setModel] = useState("gpt-4o-mini");
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"code" | "preview" | "terminal">("code");
  const [sideOpen, setSideOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [leftTab, setLeftTab] = useState<"files" | "search" | "history">("files");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

  const selectedFile = files.find(f => f.path === selectedPath);
  const content = selectedFile ? drafts[selectedPath] ?? selectedFile.content : "";
  const lines = useMemo(() => content.split("\n"), [content]);

  useEffect(() => {
    fetch("/api/config").then(r => r.json()).then(data => {
      setProviderConfigured(Boolean(data.providerConfigured));
      setModel(data.model || "gpt-4o-mini");
    }).catch(() => {});
    fetch("/api/files").then(r => r.json()).then(data => {
      if (Array.isArray(data.files) && data.files.length) setFiles(data.files);
    }).catch(() => {});
  }, []);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }

  async function saveFile() {
    if (!selectedFile) return;
    setBusy(true);
    const nextContent = drafts[selectedPath] ?? selectedFile.content;
    try {
      const response = await fetch("/api/files", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selectedPath, content: nextContent })
      });
      if (!response.ok) throw new Error("save failed");
      setFiles(current => current.map(f => f.path === selectedPath ? { ...f, content: nextContent } : f));
      setDrafts(current => { const next = { ...current }; delete next[selectedPath]; return next; });
      notify("Saved to workspace");
    } catch {
      setFiles(current => current.map(f => f.path === selectedPath ? { ...f, content: nextContent } : f));
      setDrafts(current => { const next = { ...current }; delete next[selectedPath]; return next; });
      notify("Saved in this session");
    } finally { setBusy(false); }
  }

  async function sendMessage(preset?: string) {
    const message = (preset ?? input).trim();
    if (!message || sending) return;
    setInput("");
    const nextMessages = [...messages, { role: "user" as const, content: message }];
    setMessages(nextMessages);
    setSending(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message, sessionId,
          fileContext: selectedFile ? `Selected file: ${selectedPath}\n${content}` : ""
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.details || data.error || "Request failed");
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages(current => [...current, { role: "assistant", content: data.answer }]);
    } catch (error) {
      setMessages(current => [...current, {
        role: "assistant",
        content: error instanceof Error ? error.message : "Request failed. Check the server configuration."
      }]);
    } finally { setSending(false); }
  }

  async function createFile() {
    const path = window.prompt("New file path (for example src/utils.ts)");
    if (!path?.trim()) return;
    if (files.some(file => file.path === path.trim())) return notify("That file already exists");
    const file = { path: path.trim(), content: "" };
    setFiles(current => [...current, file]);
    setSelectedPath(file.path);
    try {
      await fetch("/api/files", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(file) });
    } catch {}
    notify("File created");
  }

  async function copyContent() {
    try { await navigator.clipboard.writeText(content); notify("Copied file content"); }
    catch { notify("Clipboard access was blocked"); }
  }

  const filteredFiles = files.filter(f => f.path.toLowerCase().includes(search.toLowerCase()));
  const folders = [...new Set(filteredFiles.map(f => f.path.includes("/") ? f.path.split("/")[0] : ""))].filter(Boolean);

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-area">
        <button className="icon-btn mobile-toggle" aria-label="Toggle sidebar" onClick={() => setSideOpen(!sideOpen)}><Menu size={17}/></button>
        <div className="brand-mark"><Code2 size={19}/></div>
        <div className="brand-name">sidehustle<span>.</span><small>CODE</small></div>
        <div className="top-separator"/>
        <button className="project-switch"><Folder size={14}/> side-hustle <ChevronDown size={13}/></button>
      </div>
      <div className="top-center"><span className="status-dot"/><span>Workspace ready</span><span className="status-divider">/</span><span className="muted">Local demo workspace</span></div>
      <div className="top-actions">
        <button className="icon-btn" aria-label="Activity"><Activity size={16}/></button>
        <button className="icon-btn" aria-label="Settings" onClick={() => notify("Set AI_API_KEY, AI_BASE_URL and AI_MODEL in Render environment settings")}><Settings2 size={16}/></button>
        <div className="avatar">R</div>
      </div>
    </header>

    <div className="workspace">
      {sideOpen && <aside className="left-sidebar">
        <div className="sidebar-tabs">
          <button className={leftTab === "files" ? "sidebar-tab active" : "sidebar-tab"} onClick={() => setLeftTab("files")}><FolderOpen size={15}/> Explorer</button>
          <button className={leftTab === "search" ? "sidebar-tab active" : "sidebar-tab"} onClick={() => setLeftTab("search")}><Search size={15}/> Search</button>
          <button className={leftTab === "history" ? "sidebar-tab active" : "sidebar-tab"} onClick={() => setLeftTab("history")}><History size={15}/></button>
        </div>
        {leftTab === "files" && <>
          <div className="section-heading"><span>EXPLORER</span><button className="mini-icon" aria-label="New file" onClick={createFile}><FilePlus2 size={14}/></button></div>
          <div className="tree-root"><ChevronDown size={13}/><FolderOpen size={14} className="folder-icon"/> SIDE-HUSTLE</div>
          {folders.map(folder => <div className="tree-folder" key={folder}><ChevronDown size={12}/><Folder size={14} className="folder-icon"/><span>{folder}</span></div>)}
          <div className="file-tree">
            {filteredFiles.map(file => <button key={file.path} className={selectedPath === file.path ? "file-item selected" : "file-item"} onClick={() => setSelectedPath(file.path)}>
              <span className={file.path.endsWith(".md") ? "file-glyph md" : file.path.endsWith(".json") ? "file-glyph json" : "file-glyph ts"}>{file.path.endsWith(".md") ? "M" : file.path.endsWith(".json") ? "{}" : "TS"}</span>
              <span>{file.path.split("/").pop()}</span>{drafts[file.path] !== undefined && <span className="unsaved-dot"/>}
            </button>)}
          </div>
          <div className="sidebar-bottom"><div className="section-heading"><span>ENVIRONMENT</span><ChevronDown size={13}/></div><div className="env-row"><span className="green-pulse"/>{providerConfigured ? "AI provider connected" : "AI provider not set"}</div><div className="env-row muted"><GitBranch size={13}/> main</div></div>
        </>}
        {leftTab === "search" && <div className="search-panel"><label>Search files</label><div className="search-input"><Search size={14}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a file..."/></div><p className="hint">{filteredFiles.length} matching files</p>{filteredFiles.map(f => <button key={f.path} className="search-result" onClick={() => { setSelectedPath(f.path); setLeftTab("files"); }}>{f.path}</button>)}</div>}
        {leftTab === "history" && <div className="history-panel"><History size={18}/><p>Session history</p><span>Conversations from this session appear here in the full version.</span></div>}
      </aside>}

      <main className="main-column">
        <div className="breadcrumb-bar">
          <div className="breadcrumbs"><FileCode2 size={14}/><span>{selectedPath.split("/").slice(0,-1).join("/") || "root"}</span><ChevronRight size={13}/><strong>{selectedPath.split("/").pop()}</strong><span className="dirty-mark">{drafts[selectedPath] !== undefined ? "●" : ""}</span></div>
          <div className="editor-actions"><button className="icon-btn" title="Copy file" onClick={copyContent}><Copy size={14}/></button><button className="icon-btn" title="More options" onClick={() => notify("More editor actions coming soon")}><MoreHorizontal size={16}/></button></div>
        </div>
        <div className="editor-tabs"><button className="editor-file-tab"><span className="file-glyph ts">{selectedPath.endsWith(".md") ? "M" : selectedPath.endsWith(".json") ? "{}" : "TS"}</span>{selectedPath.split("/").pop()}{drafts[selectedPath] !== undefined && <span className="unsaved-dot"/>}<X size={13}/></button><div className="editor-tab-spacer"/><button className={activeTab === "code" ? "mode-tab active" : "mode-tab"} onClick={() => setActiveTab("code")}><Code2 size={13}/> Editor</button><button className={activeTab === "preview" ? "mode-tab active" : "mode-tab"} onClick={() => setActiveTab("preview")}><Globe size={13}/> Preview</button><button className={activeTab === "terminal" ? "mode-tab active" : "mode-tab"} onClick={() => setActiveTab("terminal")}><SquareTerminal size={13}/> Terminal</button></div>

        {activeTab === "code" && <div className="code-editor">
          <div className="line-numbers">{lines.map((_, i) => <div key={i}>{i + 1}</div>)}</div>
          <textarea aria-label="Code editor" spellCheck={false} value={content} onChange={e => setDrafts(current => ({ ...current, [selectedPath]: e.target.value }))} />
        </div>}
        {activeTab === "preview" && <div className="preview-pane"><div className="preview-window"><div className="preview-toolbar"><span/><span/><span/><p>Preview</p></div><div className="preview-content"><div className="preview-logo"><Code2 size={22}/></div><h1>Build something<br/><span>remarkable.</span></h1><p>Your AI-powered development workspace starts here.</p><button onClick={() => setActiveTab("code")}>Explore source <ArrowRight size={14}/></button></div></div></div>}
        {activeTab === "terminal" && <div className="terminal-pane"><div className="terminal-head"><SquareTerminal size={14}/> Terminal <span className="terminal-badge">SIMULATED</span></div><div className="terminal-output"><p><span className="term-prompt">➜</span> <span className="term-dir">side-hustle</span> <span className="term-muted">git:(main)</span> <span className="term-muted">✗</span></p><p className="term-muted">Remote shell execution is disabled in this demo.</p><p className="term-muted">For safety, this workspace currently edits sample files only.</p><p><span className="term-prompt">➜</span> <span className="term-dir">side-hustle</span> <span className="cursor"/></p></div></div>}

        <div className="bottom-bar"><div className="bottom-left"><span><GitBranch size={12}/> main</span><span><Check size={12}/> Ready</span><span>UTF-8</span></div><div className="bottom-right"><span>TypeScript</span><span>Ln {Math.max(1, content.slice(0, content.length).split("\n").length)}, Col 1</span><span>Spaces: 2</span></div></div>
      </main>

      {chatOpen && <aside className="right-panel">
        <div className="chat-header"><div className="chat-heading"><div className="agent-mark"><Sparkles size={15}/></div><div><strong>AI Agent</strong><small><span className={providerConfigured ? "online-dot" : "idle-dot"}/>{providerConfigured ? "Connected" : "Setup required"}</small></div></div><div className="chat-head-actions"><button className="icon-btn" aria-label="New chat" onClick={() => { setMessages([{ role: "assistant", content: "New session. What are we building today?" }]); setSessionId(""); }}><Plus size={15}/></button><button className="icon-btn" aria-label="Collapse chat" onClick={() => setChatOpen(false)}><PanelLeft size={15}/></button></div></div>
        <div className="agent-selector"><Bot size={15}/><span>Build Agent</span><span className="model-chip">{model}</span><ChevronDown size={13}/></div>
        <div className="chat-scroll">
          <div className="chat-date">TODAY <span/></div>
          {messages.map((message, index) => <div className={message.role === "user" ? "message-row user-row" : "message-row"} key={index}>
            {message.role === "assistant" && <div className="message-avatar"><Sparkles size={13}/></div>}
            <div className={message.role === "user" ? "message-bubble user-bubble" : "message-bubble"}>
              {message.content.split("\n").map((line, i) => <p key={i}>{line || " "}</p>)}
            </div>
          </div>)}
          {sending && <div className="message-row"><div className="message-avatar"><Sparkles size={13}/></div><div className="thinking"><span/><span/><span/> Thinking</div></div>}
          {!providerConfigured && <div className="setup-card"><div className="setup-card-icon"><ShieldCheck size={16}/></div><div><strong>Connect your AI provider</strong><p>Add an API key in Render to start chatting with your codebase.</p><button onClick={() => notify("Render → Side-Hustle Code → Environment: set AI_API_KEY, AI_BASE_URL and AI_MODEL")}>View setup guide <ArrowRight size={13}/></button></div></div>}
          <div className="suggestion-heading">QUICK ACTIONS</div>
          <div className="quick-actions"><button onClick={() => sendMessage("Explain the selected file and identify any issues.")}><WandSparkles size={13}/> Explain this code</button><button onClick={() => sendMessage("Create a concise implementation plan for improving this project.")}><Hammer size={13}/> Create a plan</button><button onClick={() => sendMessage("Suggest tests for the selected file and provide example test code.")}><ShieldCheck size={13}/> Suggest tests</button></div>
        </div>
        <div className="chat-composer-wrap"><div className="composer-context"><FileCode2 size={12}/><span>{selectedPath}</span><button onClick={() => notify("Current file context is attached to each prompt")}><CircleHelp size={13}/></button></div><div className="chat-composer"><textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} placeholder="Ask anything about your code..." rows={3}/><div className="composer-footer"><div className="composer-tools"><button aria-label="Add context" onClick={() => notify("Selected file is already included")}><Plus size={15}/></button><button aria-label="Command" onClick={() => setInput("/")}><Command size={14}/></button><span><span className={providerConfigured ? "green-pulse" : "idle-dot"}/> {providerConfigured ? "Ready" : "No provider"}</span></div><button className="send-btn" disabled={!input.trim() || sending} aria-label="Send message" onClick={() => void sendMessage()}>{sending ? <LoaderCircle className="spin" size={15}/> : <Send size={15}/>}</button></div></div><div className="composer-hint">AI can make mistakes. Review changes before use.</div></div>
      </aside>}
      {!chatOpen && <button className="reopen-chat" onClick={() => setChatOpen(true)}><MessageSquare size={15}/> Open AI Agent</button>}
    </div>
    {toast && <div className="toast"><Check size={14}/>{toast}</div>}
  </div>;
}
