import { useState } from "react";
import { FileCode2, Plus, Trash2, Copy, Search, Edit3 } from "lucide-react";
import { listSnippets, saveSnippet, deleteSnippet } from "../../lib/tauri-commands";
import { notify } from "../../stores/toastStore";

interface SnippetEntry {
  id: string;
  name: string;
  description: string;
  language: string;
  code: string;
  tags: string[];
  createdAt: number;
}

const STORAGE_KEY = "idc-snippets";

function loadLocal(): SnippetEntry[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

function persistLocal(items: SnippetEntry[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

const LANGUAGES = ["typescript", "javascript", "rust", "python", "go", "html", "css", "sql", "bash", "json", "yaml", "markdown", "other"];

function toBackend(e: SnippetEntry): {
  id: string; name: string; description: string; language: string; code: string;
  tags: string[]; created_at: number;
} {
  return { ...e, created_at: e.createdAt };
}

export function CodeSnippetsPanel() {
  const [snippets, setSnippets] = useState<SnippetEntry[]>(loadLocal);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [lang, setLang] = useState("typescript");
  const [code, setCode] = useState("");
  const [tags, setTags] = useState("");
  const [backendError, setBackendError] = useState<string | null>(null);

  // Load snippets from the backend (persisted on disk) on mount.
  useState(() => {
    void listSnippets()
      .then((items) => {
        const mapped: SnippetEntry[] = items.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          language: s.language,
          code: s.code,
          tags: s.tags ?? [],
          createdAt: Number(s.created_at) || Date.now(),
        }));
        if (mapped.length > 0) {
          setSnippets(mapped);
          persistLocal(mapped);
        }
      })
      .catch(() => setBackendError("Snippet backend unavailable; using local storage"));
  });

  const syncBackend = async (items: SnippetEntry[], notified = false) => {
    persistLocal(items);
    try {
      for (const it of items) await saveSnippet(toBackend(it));
      if (notified) notify("success", "Snippet saved");
    } catch (e) {
      setBackendError(`Failed to persist snippet: ${e}`);
    }
  };

  const filtered = snippets.filter((s) => {
    const q = search.toLowerCase();
    return !search || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q));
  });

  const handleAdd = () => {
    if (!name.trim() || !code.trim()) return;
    const entry: SnippetEntry = {
      id: `snip-${Date.now()}`,
      name,
      description: desc,
      language: lang,
      code,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      createdAt: Date.now(),
    };
    const next = [...snippets, entry];
    setSnippets(next); void syncBackend(next, true);
    resetForm();
  };

  const handleUpdate = () => {
    if (!editingId || !name.trim() || !code.trim()) return;
    const next = snippets.map((s) => s.id === editingId ? { ...s, name, description: desc, language: lang, code, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) } : s);
    setSnippets(next); void syncBackend(next, true);
    resetForm();
  };

  const startEdit = (s: SnippetEntry) => {
    setEditingId(s.id); setName(s.name); setDesc(s.description); setLang(s.language); setCode(s.code); setTags(s.tags.join(", ")); setShowAdd(true);
  };

  const resetForm = () => {
    setEditingId(null); setName(""); setDesc(""); setLang("typescript"); setCode(""); setTags(""); setShowAdd(false);
  };

  const remove = (id: string) => {
    const next = snippets.filter((s) => s.id !== id);
    setSnippets(next);
    persistLocal(next);
    void deleteSnippet(id).then(() => notify("success", "Snippet deleted")).catch((e) => setBackendError(`Failed to delete snippet: ${e}`));
  };

  const copyCode = (c: string) => navigator.clipboard.writeText(c);

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Code snippets">
      <div className="flex items-center justify-between h-10 px-3 border-b border-border-subtle surface-blur">
        <span className="text-xs font-medium text-fg-secondary uppercase tracking-wider flex items-center gap-1.5">
          <FileCode2 size={13} /> Code Snippets
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => { resetForm(); setShowAdd(!showAdd); }} aria-label="Add snippet" aria-expanded={showAdd} className="p-1 text-fg-muted hover:text-fg-primary transition-fast rounded hover:bg-surface-elevated">
            <Plus size={14} />
          </button>
        </div>
      </div>

      {backendError && (
        <div className="mx-3 mt-2 px-2 py-1.5 rounded border border-error/40 bg-error/10 text-error text-[11px]" role="alert">
          {backendError}
        </div>
      )}

      <div className="px-3 py-2 border-b border-border-subtle surface-blur">
        <div className="flex items-center gap-2 bg-bg-surface rounded border border-border-subtle px-2 py-1">
          <Search size={13} className="text-fg-muted shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search snippets..." aria-label="Search snippets" className="flex-1 bg-transparent text-fg-primary text-xs outline-none placeholder:text-fg-muted" />
        </div>
      </div>

      {showAdd && (
        <div className="mx-3 mt-2 p-3 rounded border border-border-subtle bg-bg-surface space-y-2">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Snippet name" aria-label="Snippet name" className="w-full bg-surface text-fg-primary text-xs px-2 py-1.5 rounded border border-border-subtle placeholder:text-fg-muted outline-none focus:border-accent" />
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" aria-label="Snippet description" className="w-full bg-surface text-fg-primary text-xs px-2 py-1.5 rounded border border-border-subtle placeholder:text-fg-muted outline-none focus:border-accent" />
          <div className="flex gap-2">
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="bg-surface text-fg-primary text-xs px-2 py-1.5 rounded border border-border-subtle outline-none focus:border-accent">
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma-separated)" aria-label="Snippet tags" className="flex-1 bg-surface text-fg-primary text-xs px-2 py-1.5 rounded border border-border-subtle placeholder:text-fg-muted outline-none focus:border-accent" />
          </div>
          <textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste your code..." rows={6} aria-label="Snippet code" className="w-full bg-surface text-fg-primary text-xs font-mono px-2 py-1.5 rounded border border-border-subtle placeholder:text-fg-muted outline-none focus:border-accent resize-y" />
          <div className="flex justify-end gap-1">
            <button onClick={resetForm} className="px-2 py-1 text-[11px] rounded bg-surface-elevated text-fg-secondary transition-fast hover:bg-surface-hover">Cancel</button>
            <button onClick={editingId ? handleUpdate : handleAdd} disabled={!name.trim() || !code.trim()} className="px-2 py-1 text-[11px] rounded bg-accent text-white disabled:opacity-50 transition-fast hover:bg-accent-hover">{editingId ? "Update" : "Save"}</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-fg-muted">
            <FileCode2 size={24} className="opacity-30" />
            <div className="text-xs">{snippets.length === 0 ? "No snippets saved" : "No matches found"}</div>
          </div>
        ) : (
          filtered.map((s) => (
            <div key={s.id} className="px-3 py-2 hover:bg-surface-elevated transition-fast border-b border-border-subtle/50 group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-fg-primary">{s.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-surface text-fg-muted">{s.language}</span>
                  </div>
                  {s.description && <div className="text-[10px] text-fg-secondary mt-0.5">{s.description}</div>}
                  {s.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {s.tags.map((t) => <span key={t} className="text-[9px] px-1 py-0.5 rounded bg-accent/10 text-accent">{t}</span>)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-fast">
                  <button onClick={() => copyCode(s.code)} aria-label="Copy snippet" className="p-1 text-fg-muted hover:text-accent transition-fast" title="Copy"><Copy size={12} /></button>
                  <button onClick={() => startEdit(s)} aria-label="Edit snippet" className="p-1 text-fg-muted hover:text-fg-primary transition-fast" title="Edit"><Edit3 size={12} /></button>
                  <button onClick={() => remove(s.id)} aria-label="Delete snippet" className="p-1 text-fg-muted hover:text-error transition-fast" title="Delete"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
