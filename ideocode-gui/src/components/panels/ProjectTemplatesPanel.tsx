import { useState } from "react";
import { LayoutTemplate, Plus, Trash2, Play, Search, FolderOpen, Code2 } from "lucide-react";

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  files: { path: string; content: string }[];
  createdAt: number;
}

const STORAGE_KEY = "idc-templates";

function loadTemplates(): ProjectTemplate[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

function saveTemplates(items: ProjectTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

const BUILT_IN_TEMPLATES: ProjectTemplate[] = [
  {
    id: "ts-node",
    name: "Node.js TypeScript",
    description: "TypeScript project with tsconfig and package.json",
    language: "typescript",
    files: [
      { path: "package.json", content: '{\n  "name": "my-project",\n  "version": "1.0.0",\n  "scripts": {\n    "build": "tsc",\n    "dev": "tsx watch src/index.ts"\n  },\n  "devDependencies": {\n    "typescript": "^5.0.0",\n    "tsx": "^4.0.0"\n  }\n}' },
      { path: "tsconfig.json", content: '{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "NodeNext",\n    "outDir": "dist"\n  }\n}' },
      { path: "src/index.ts", content: 'console.log("Hello, world!");' },
    ],
    createdAt: Date.now(),
  },
  {
    id: "rust-lib",
    name: "Rust Library",
    description: "Rust library with Cargo.toml",
    language: "rust",
    files: [
      { path: "Cargo.toml", content: '[package]\nname = "my-lib"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\nserde = { version = "1", features = ["derive"] }' },
      { path: "src/lib.rs", content: "pub fn add(a: i32, b: i32) -> i32 {\n    a + b\n}\n\n#[cfg(test)]\nmod tests {\n    use super::*;\n\n    #[test]\n    fn test_add() {\n        assert_eq!(add(2, 2), 4);\n    }\n}" },
    ],
    createdAt: Date.now(),
  },
  {
    id: "python-fastapi",
    name: "Python FastAPI",
    description: "FastAPI project with requirements.txt",
    language: "python",
    files: [
      { path: "requirements.txt", content: "fastapi\nuvicorn\npydantic" },
      { path: "main.py", content: "from fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get('/')\ndef read_root():\n    return {\"Hello\": \"World\"}" },
    ],
    createdAt: Date.now(),
  },
];

export function ProjectTemplatesPanel() {
  const [templates, setTemplates] = useState<ProjectTemplate[]>(() => [...BUILT_IN_TEMPLATES, ...loadTemplates()]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [lang, setLang] = useState("typescript");

  const filtered = templates.filter((t) => {
    const q = search.toLowerCase();
    return !search || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.language.toLowerCase().includes(q);
  });

  const handleAdd = () => {
    if (!name.trim()) return;
    const template: ProjectTemplate = {
      id: `tpl-${Date.now()}`,
      name,
      description: desc,
      language: lang,
      files: [],
      createdAt: Date.now(),
    };
    const next = [...templates, template];
    setTemplates(next); saveTemplates(next.filter((t) => !BUILT_IN_TEMPLATES.some((b) => b.id === t.id)));
    setName(""); setDesc(""); setShowAdd(false);
  };

  const remove = (id: string) => {
    if (BUILT_IN_TEMPLATES.some((t) => t.id === id)) return;
    const next = templates.filter((t) => t.id !== id);
    setTemplates(next); saveTemplates(next.filter((t) => !BUILT_IN_TEMPLATES.some((b) => b.id === t.id)));
  };

  const useTemplate = async (template: ProjectTemplate) => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("create_from_template", { template: { name: template.name, language: template.language, files: template.files } });
    } catch {}
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between h-10 px-3 border-b border-border-subtle">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
          <LayoutTemplate size={13} /> Project Templates
        </span>
        <button onClick={() => setShowAdd(!showAdd)} className="p-1 text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated">
          <Plus size={14} />
        </button>
      </div>

      <div className="px-3 py-2 border-b border-border-subtle">
        <div className="flex items-center gap-2 bg-bg-surface rounded border border-border-subtle px-2 py-1">
          <Search size={13} className="text-text-muted shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates..." className="flex-1 bg-transparent text-text-primary text-xs outline-none placeholder:text-text-muted" />
        </div>
      </div>

      {showAdd && (
        <div className="mx-3 mt-2 p-3 rounded border border-border-subtle bg-bg-surface space-y-2">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" className="w-full bg-bg-primary text-text-primary text-xs px-2 py-1.5 rounded border border-border-subtle placeholder:text-text-muted outline-none focus:border-accent-primary" />
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" className="w-full bg-bg-primary text-text-primary text-xs px-2 py-1.5 rounded border border-border-subtle placeholder:text-text-muted outline-none focus:border-accent-primary" />
          <input value={lang} onChange={(e) => setLang(e.target.value)} placeholder="Language" className="w-full bg-bg-primary text-text-primary text-xs px-2 py-1.5 rounded border border-border-subtle placeholder:text-text-muted outline-none focus:border-accent-primary" />
          <div className="flex justify-end gap-1">
            <button onClick={() => setShowAdd(false)} className="px-2 py-1 text-[11px] rounded bg-bg-elevated text-text-secondary">Cancel</button>
            <button onClick={handleAdd} disabled={!name.trim()} className="px-2 py-1 text-[11px] rounded bg-accent-primary text-white disabled:opacity-50">Create</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-text-muted">
            <LayoutTemplate size={24} className="opacity-30" />
            <div className="text-xs">No templates found</div>
          </div>
        ) : (
          filtered.map((t) => (
            <div key={t.id} className="px-3 py-3 hover:bg-bg-elevated transition-fast border-b border-border-subtle/50 group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FolderOpen size={14} className="text-accent-primary shrink-0" />
                    <span className="text-xs font-medium text-text-primary">{t.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-surface text-text-muted">{t.language}</span>
                  </div>
                  {t.description && <div className="text-[10px] text-text-secondary mt-1">{t.description}</div>}
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-text-muted">
                    <Code2 size={10} />
                    <span>{t.files.length} files</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-fast">
                  <button onClick={() => useTemplate(t)} className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-accent-primary text-white hover:bg-accent-hover transition-fast">
                    <Play size={10} /> Use
                  </button>
                  {!BUILT_IN_TEMPLATES.some((b) => b.id === t.id) && (
                    <button onClick={() => remove(t.id)} className="p-1 text-text-muted hover:text-red-400 transition-fast">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
