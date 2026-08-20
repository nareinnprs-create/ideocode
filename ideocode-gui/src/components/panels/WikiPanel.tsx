import React from "react";
import { useState } from "react";
import { BookOpen, Plus, Search, Trash2, Edit3, Save, X, Download, Upload } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { ConfirmDialog } from "../ui/ConfirmDialog";

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    let earliest: RegExpMatchArray | null = null;
    let type: "bold" | "code" | null = null;

    if (boldMatch && (!codeMatch || (boldMatch.index ?? Infinity) < (codeMatch.index ?? Infinity))) {
      earliest = boldMatch;
      type = "bold";
    } else if (codeMatch) {
      earliest = codeMatch;
      type = "code";
    }

    if (!earliest || earliest.index === undefined) {
      parts.push(remaining);
      break;
    }

    if (earliest.index > 0) {
      parts.push(remaining.slice(0, earliest.index));
    }

    if (type === "bold") {
      parts.push(<strong key={key++} className="font-semibold text-text-primary">{earliest[1]}</strong>);
    } else {
      parts.push(
        <code key={key++} className="px-1 py-0.5 text-[11px] font-mono bg-bg-tertiary text-accent-primary rounded">
          {earliest[1]}
        </code>
      );
    }

    remaining = remaining.slice(earliest.index + earliest[0].length);
  }

  return parts;
}

function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const blocks = text.split(/\n\n+/);
  const key = { v: 0 };
  const next = () => key.v++;

  return (
    <div className="space-y-2">
      {blocks.map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        const lines = trimmed.split("\n");

        if (lines.length === 1 && lines[0].startsWith("### ")) {
          return <h3 key={next()} className="text-xs font-bold text-text-primary mt-2">{renderInline(lines[0].slice(4))}</h3>;
        }
        if (lines.length === 1 && lines[0].startsWith("## ")) {
          return <h2 key={next()} className="text-sm font-bold text-text-primary mt-3">{renderInline(lines[0].slice(3))}</h2>;
        }
        if (lines.length === 1 && lines[0].startsWith("# ")) {
          return <h1 key={next()} className="text-base font-bold text-text-primary mt-3">{renderInline(lines[0].slice(2))}</h1>;
        }

        if (lines.length === 1 && trimmed.startsWith("```") && trimmed.endsWith("```")) {
          const code = trimmed.slice(3, -3);
          return (
            <pre key={next()} className="p-2 text-[11px] font-mono bg-bg-tertiary text-text-primary rounded border border-border-subtle overflow-x-auto whitespace-pre-wrap">
              {code}
            </pre>
          );
        }

        const allCodeBlock = trimmed.startsWith("```");
        if (allCodeBlock) {
          const code = trimmed.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
          return (
            <pre key={next()} className="p-2 text-[11px] font-mono bg-bg-tertiary text-text-primary rounded border border-border-subtle overflow-x-auto whitespace-pre-wrap">
              {code}
            </pre>
          );
        }

        const isUnorderedList = lines.every((l) => /^[\s]*[-*] /.test(l));
        if (isUnorderedList) {
          return (
            <ul key={next()} className="list-disc list-inside space-y-0.5 text-xs text-text-secondary">
              {lines.map((l, i) => (
                <li key={i}>{renderInline(l.replace(/^[\s]*[-*] /, ""))}</li>
              ))}
            </ul>
          );
        }

        const isOrderedList = lines.every((l) => /^[\s]*\d+\. /.test(l));
        if (isOrderedList) {
          return (
            <ol key={next()} className="list-decimal list-inside space-y-0.5 text-xs text-text-secondary">
              {lines.map((l, i) => (
                <li key={i}>{renderInline(l.replace(/^[\s]*\d+\. /, ""))}</li>
              ))}
            </ol>
          );
        }

        const isBlockquote = lines.every((l) => /^> /.test(l));
        if (isBlockquote) {
          return (
            <blockquote key={next()} className="pl-2 border-l-2 border-accent-primary text-xs text-text-muted italic">
              {lines.map((l, i) => <div key={i}>{renderInline(l.replace(/^> /, ""))}</div>)}
            </blockquote>
          );
        }

        return (
          <p key={next()} className="text-xs text-text-secondary leading-relaxed">
            {lines.map((l, i) => (
              <React.Fragment key={i}>
                {i > 0 && <br />}
                {renderInline(l)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

interface WikiPage {
  id: string;
  title: string;
  content: string;
  category: string;
  updatedAt: number;
}

const STORAGE_KEY = "idc-wiki";

function loadPages(): WikiPage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function savePages(pages: WikiPage[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
}

export function WikiPanel() {
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const [pages, setPages] = useState<WikiPage[]>(loadPages);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("general");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const importRef = React.useRef<HTMLInputElement>(null);

  const selected = pages.find((p) => p.id === selectedId);
  const filtered = pages.filter(
    (p) => p.title.toLowerCase().includes(search.toLowerCase()) || p.content.toLowerCase().includes(search.toLowerCase())
  );

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(pages, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wiki-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported: WikiPage[] = JSON.parse(reader.result as string);
        if (!Array.isArray(imported)) return;
        const merged = [...pages];
        for (const page of imported) {
          if (!merged.some((p) => p.id === page.id)) {
            merged.push(page);
          }
        }
        setPages(merged);
        savePages(merged);
      } catch { /* ignore invalid json */ }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleNew = () => {
    const id = `wiki-${Date.now()}`;
    const page: WikiPage = { id, title: "Untitled Page", content: "", category: "general", updatedAt: Date.now() };
    const next = [...pages, page];
    setPages(next);
    savePages(next);
    setSelectedId(id);
    setEditTitle(page.title);
    setEditContent(page.content);
    setEditCategory(page.category);
    setEditing(true);
  };

  const handleSave = () => {
    if (!selectedId) return;
    const next = pages.map((p) =>
      p.id === selectedId ? { ...p, title: editTitle, content: editContent, category: editCategory, updatedAt: Date.now() } : p
    );
    setPages(next);
    savePages(next);
    setEditing(false);
  };

  const handleDelete = (id: string) => {
    const next = pages.filter((p) => p.id !== id);
    setPages(next);
    savePages(next);
    if (selectedId === id) setSelectedId(null);
  };

  const startEdit = () => {
    if (!selected) return;
    setEditTitle(selected.title);
    setEditContent(selected.content);
    setEditCategory(selected.category);
    setEditing(true);
  };

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Wiki panel">
      <div className="px-1 pt-1 flex items-center justify-between">
        <button onClick={() => setRightPanelOpen(false)} className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated">
          <BookOpen size={14} /> Wiki
        </button>
        <div className="flex items-center gap-1">
          <button onClick={handleNew} aria-label="New wiki page" className="flex items-center gap-1 px-2 py-1 text-xs text-accent-primary hover:text-accent-hover transition-fast rounded hover:bg-bg-elevated">
            <Plus size={14} /> New
          </button>
          <button onClick={handleExport} aria-label="Export wiki" className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated">
            <Download size={14} /> Export
          </button>
          <button onClick={() => importRef.current?.click()} aria-label="Import wiki" className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated">
            <Upload size={14} /> Import
          </button>
          <input ref={importRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>
      </div>

      {!selectedId ? (
        <>
          <div className="px-3 py-2">
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="text" placeholder="Search wiki..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                <BookOpen size={24} className="mb-2 opacity-50" />
                <div className="text-xs">No wiki pages yet</div>
              </div>
            ) : (
              filtered.map((page) => (
                <div key={page.id} onClick={() => setSelectedId(page.id)}
                  className="px-3 py-2 border-b border-border-subtle hover:bg-bg-elevated cursor-pointer transition-fast group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text-primary">{page.title}</span>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(page.id); }}
                      aria-label="Delete wiki page"
                      className="p-1 text-text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-fast">
                      <Trash2 size={11} />
                    </button>
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5 line-clamp-1">{page.content || "Empty page"}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted">{page.category}</span>
                    <span className="text-[10px] text-text-muted">{wordCount(page.content)} words</span>
                    <span className="text-[10px] text-text-muted">{new Date(page.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-border-subtle flex items-center gap-2">
            <button onClick={() => { setSelectedId(null); setEditing(false); }} aria-label="Close page" className="text-text-muted hover:text-text-primary transition-fast">
              <X size={14} />
            </button>
            {editing ? (
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 text-xs font-medium text-text-primary bg-transparent border-b border-border-subtle focus:outline-none focus:border-accent-primary" />
              ) : (
                <span className="flex-1 text-xs font-medium text-text-primary">{selected?.title}</span>
            )}
            {editing ? (
              <button onClick={handleSave} aria-label="Save page" className="p-1 text-success hover:bg-success/10 rounded transition-fast"><Save size={14} /></button>
            ) : (
              <button onClick={startEdit} aria-label="Edit page" className="p-1 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded transition-fast"><Edit3 size={14} /></button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {editing ? (
              <div className="space-y-2">
                <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary">
                  <option value="general">General</option>
                  <option value="architecture">Architecture</option>
                  <option value="api">API</option>
                  <option value="guide">Guide</option>
                  <option value="reference">Reference</option>
                </select>
                <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-full min-h-[300px] p-2 text-xs font-mono bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary resize-none"
                  placeholder="Write your wiki content in Markdown..." />
              </div>
            ) : (
              <div className="text-xs text-text-secondary leading-relaxed">
                {renderMarkdown(selected?.content || "")}
                {!selected?.content && <span className="text-text-muted italic">Empty page. Click edit to add content.</span>}
              </div>
            )}
          </div>
        </div>
      )}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) { handleDelete(deleteTarget); setDeleteTarget(null); } }}
        title="Delete Page"
        description="Are you sure you want to delete this wiki page? This cannot be undone."
        danger
      />
    </div>
  );
}
