import { useEffect, useRef, useState } from "react";
import { ArrowUp, ChevronDown, Command, CornerDownLeft, FileText, GitBranch, LoaderCircle, MessageSquare, Search, Settings2, Terminal, X } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };
const commands = [
  ["New session", "Start a fresh conversation", "new"],
  ["Switch model", "Choose an AI model", "model"],
  ["Switch agent", "Build or plan mode", "agent"],
  ["Open settings", "Provider and model configuration", "settings"],
  ["Search sessions", "Find a previous session", "search"],
  ["Show workspace files", "Browse available files", "files"],
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [provider, setProvider] = useState(false);
  const [model, setModel] = useState("gpt-4o-mini");
  const [mode, setMode] = useState<"Build" | "Plan">("Build");
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [palette, setPalette] = useState<"commands" | "models" | "agents" | "settings" | "search" | "files" | null>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/config").then(r => r.json()).then(d => { setProvider(Boolean(d.providerConfigured)); setModel(d.model || "gpt-4o-mini"); }).catch(() => {});
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette("commands"); setQuery(""); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") { e.preventDefault(); newSession(); }
      if (e.key === "Escape") setPalette(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  function notify(s: string) { setToast(s); window.setTimeout(() => setToast(""), 2400); }
  function newSession() { setMessages([]); setInput(""); setSessionId(""); setSessionTitle(""); setPalette(null); setTimeout(() => inputRef.current?.focus(), 30); }
  function runCommand(id: string) { setPalette(null); setQuery(""); if (id === "new") newSession(); else if (id === "model") setPalette("models"); else if (id === "agent") setPalette("agents"); else if (id === "settings") setPalette("settings"); else if (id === "search") setPalette("search"); else if (id === "files") setPalette("files"); }
  async function send(value?: string) {
    const text = (value ?? input).trim(); if (!text || sending) return;
    setInput(""); const next = [...messages, { role: "user" as const, content: text }]; setMessages(next); setSending(true);
    if (!sessionTitle) setSessionTitle(text.length > 48 ? text.slice(0, 48) + "…" : text);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: mode === "Plan" ? "[Plan mode: do not make changes. Analyze and propose a plan.]\n" + text : text, sessionId, fileContext: "" }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.details || data.error || "Request failed. Check the AI provider configuration.");
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages([...next, { role: "assistant", content: data.answer || "No response returned." }]);
    } catch (err) { setMessages([...next, { role: "assistant", content: err instanceof Error ? err.message : "Request failed. Check the AI provider configuration." }]); }
    finally { setSending(false); inputRef.current?.focus(); }
  }
  const filteredCommands = commands.filter(c => (c[0] + " " + c[1]).toLowerCase().includes(query.toLowerCase()));
  return <div className="terminal-app">
    <main className="term-main">
      {messages.length === 0 ? <section className="term-welcome"><div className="term-logo">opencode</div><div className="term-subtitle">The open source AI coding agent</div>
        <form className="term-welcome-input" onSubmit={e => { e.preventDefault(); void send(); }}><textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder="Ask anything... (use @ to mention files)" rows={2} /><div className="term-input-bottom"><span><span className="term-agent-dot" /> {mode} <span className="term-muted">·</span> {model}</span><button type="submit" disabled={!input.trim() || sending} aria-label="Send"><ArrowUp size={14} /></button></div></form>
        <div className="term-hint"><span className="term-orange">↵</span> send message <span className="term-hint-sep">·</span> <span className="term-orange">tab</span> agents <span className="term-hint-sep">·</span> <span className="term-orange">ctrl+k</span> commands</div>
        {!provider && <div className="term-provider-note">AI provider not configured <button onClick={() => setPalette("settings")}>Configure <span>→</span></button></div>}
      </section> : <section className="term-conversation"><div className="term-conversation-head"><span><MessageSquare size={13} /> {sessionTitle || "New session"}</span><button onClick={() => { setPalette("commands"); setQuery(""); }}><Command size={13} /> Commands</button></div>
        {messages.map((m, i) => <article key={i} className={"term-message " + m.role}><div className="term-message-label">{m.role === "user" ? "› you" : "◆ assistant"} <span>{m.role === "assistant" ? model : ""}</span></div><div className="term-message-body">{m.content.split("\n").map((line, n) => <p key={n}>{line || "\u00a0"}</p>)}</div>{m.role === "assistant" && <button className="term-copy" onClick={() => { void navigator.clipboard?.writeText(m.content); notify("Copied response"); }}><FileText size={12} /> Copy</button>}</article>)}
        {sending && <div className="term-thinking"><LoaderCircle size={13} className="term-spin" /> Thinking...</div>}<div ref={endRef} />
      </section>}
    </main>
    {messages.length > 0 && <footer className="term-footer"><form className="term-composer" onSubmit={e => { e.preventDefault(); void send(); }}><textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder="Ask anything..." rows={2} /><div className="term-input-bottom"><button type="button" className="term-mode" onClick={() => setMode(v => v === "Build" ? "Plan" : "Build")}><span className="term-agent-dot" /> {mode} <ChevronDown size={11} /></button><button type="button" className="term-model" onClick={() => setPalette("models")}>{model} <ChevronDown size={11} /></button><span className="term-footer-spacer" /><span className="term-enter-hint">↵ send</span><button type="submit" disabled={!input.trim() || sending} aria-label="Send"><ArrowUp size={14} /></button></div></form><div className="term-footer-meta"><span><GitBranch size={11} /> main</span><span>{provider ? "● Connected" : "○ Not connected"}</span><button onClick={() => setPalette("commands")}><Command size={11} /> Commands</button></div></footer>}
    <div className="term-statusbar"><span><span className="term-status-dot" /> {sending ? "Generating" : "Ready"}</span><span>{mode} · {model}</span></div>
    {palette && <div className="term-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setPalette(null); }}><section className="term-palette">
      <div className="term-palette-title">{palette === "commands" ? "Commands" : palette === "models" ? "Select model" : palette === "agents" ? "Select agent" : palette === "settings" ? "Settings" : palette === "search" ? "Search sessions" : "Workspace files"}<button onClick={() => setPalette(null)} aria-label="Close"><X size={13} /></button></div>
      {palette === "commands" && <><div className="term-palette-search"><Search size={13} /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Type a command..." /></div><div className="term-palette-list">{filteredCommands.map(c => <button key={c[2]} onClick={() => runCommand(c[2])}><span className="term-command-icon">{c[2] === "new" ? "+" : c[2] === "model" ? "◇" : c[2] === "settings" ? "⚙" : "›"}</span><span><strong>{c[0]}</strong><small>{c[1]}</small></span><CornerDownLeft size={12} /></button>)}</div></>}
      {palette === "models" && <div className="term-palette-list">{["gpt-4o-mini", "gpt-4o", "claude-sonnet", "gemini-2.5-flash"].map(m => <button key={m} className={m === model ? "selected" : ""} onClick={() => { setModel(m); setPalette(null); notify("Model selection updated in the interface"); }}><span className="term-command-icon">◇</span><span><strong>{m}</strong><small>{m === model ? "Current selection" : "Choose model"}</small></span>{m === model && <span className="term-orange">✓</span>}</button>)}</div>}
      {palette === "agents" && <div className="term-palette-list">{["Build", "Plan"].map(m => <button key={m} onClick={() => { setMode(m as "Build" | "Plan"); setPalette(null); }}><span className="term-command-icon">›</span><span><strong>{m}</strong><small>{m === "Build" ? "Implement and solve tasks" : "Analyze and propose a plan"}</small></span>{m === mode && <span className="term-orange">✓</span>}</button>)}</div>}
      {palette === "settings" && <div className="term-settings"><Settings2 size={17} /><strong>AI provider configuration</strong><p>{provider ? "An AI provider is configured on the server." : "No provider key was detected. Add these variables in your Render service environment settings."}</p><code>AI_API_KEY · AI_BASE_URL · AI_MODEL</code><a href="https://dashboard.render.com/web/srv-dbah33jbc2fs73bcfe3g" target="_blank" rel="noreferrer">Open Render settings ↗</a></div>}
      {palette === "search" && <div className="term-settings"><Search size={16} /><p>Session history is not persisted between browser reloads in this version.</p><button onClick={() => { setPalette(null); notify("No saved sessions yet"); }}>Close</button></div>}
      {palette === "files" && <div className="term-settings"><Terminal size={16} /><p>Workspace file browsing is not connected to a repository in this prototype.</p><button onClick={() => setPalette(null)}>Close</button></div>}
      <div className="term-palette-bottom"><span><kbd>↑↓</kbd> navigate</span><span><kbd>↵</kbd> select</span><span><kbd>esc</kbd> close</span></div>
    </section></div>}
    {toast && <div className="term-toast">{toast}</div>}
  </div>;
}
