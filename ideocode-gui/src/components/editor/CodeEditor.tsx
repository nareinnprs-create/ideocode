import { useEffect, useRef, useCallback, useState } from "react";
import Editor, { DiffEditor, loader } from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
import { useFileStore } from "../../stores/fileStore";
import { useAppStore } from "../../stores/appStore";
import { getSettings, updateSettings, getInlineCompletion, streamInlineEdit } from "../../lib/tauri-commands";
import type { AppSettings } from "../../lib/tauri-commands";
import { defineAllMonacoThemes, monacoThemeName } from "../../lib/monaco-themes";
import { IconButton } from "../ui/IconButton";
import { Tooltip } from "../ui/Tooltip";
import { ChevronRight, Columns2, WrapText, Map, Save, Loader2 } from "lucide-react";
import { CmdKOverlay } from "./CmdKOverlay";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// Configure Monaco to use the bundled files (copied to public/monaco/vs by
// scripts/copy-monaco.mjs so the editor works fully offline and matches the
// CSP, which only allows same-origin scripts).
loader.config({
  paths: {
    vs: "/monaco/vs",
  },
});

const EXT_TO_LANG: Record<string, string> = {
  rs: "rust",
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  go: "go",
  java: "java",
  cpp: "cpp",
  c: "c",
  h: "c",
  hpp: "cpp",
  swift: "swift",
  kt: "kotlin",
  rb: "ruby",
  php: "php",
  css: "css",
  scss: "scss",
  html: "html",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  md: "markdown",
  sql: "sql",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  ps1: "powershell",
  xml: "xml",
  svg: "xml",
  txt: "plaintext",
};

function detectLanguage(filename: string): string {
  const parts = filename.split(".");
  const ext = parts[parts.length - 1]?.toLowerCase() ?? "";
  return EXT_TO_LANG[ext] ?? "plaintext";
}

export function CodeEditor({ file: overrideFile }: { file?: string } = {}) {
  const activeFile = useFileStore((s) => s.activeFile);
  const currentFile = overrideFile ?? activeFile;
  const fileContent = useFileStore((s) =>
    currentFile ? s.contents[currentFile] : null,
  );
  const setContent = useFileStore((s) => s.setContent);
  const saveFile = useFileStore((s) => s.saveFile);
  const dirty = useFileStore((s) => (currentFile ? s.dirty[currentFile] : false));
  const theme = useAppStore((s) => s.theme);
  const editorSplit = useAppStore((s) => s.editorSplit);
  const toggleEditorSplit = useAppStore((s) => s.toggleEditorSplit);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [editorSettings, setEditorSettings] = useState<AppSettings | null>(null);
  const [cmdKOpen, setCmdKOpen] = useState(false);
  const [cmdKPos, setCmdKPos] = useState<{ top: number; left: number } | null>(null);
  const [inlineAI, setInlineAI] = useState<{
    active: boolean;
    loading: boolean;
    original: string;
    modified: string;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    getSettings().then(setEditorSettings).catch(() => {});
  }, []);

  const persistSetting = useCallback((patch: Partial<AppSettings>) => {
    getSettings()
      .then((s) => updateSettings({ ...s, ...patch }))
      .then(() => getSettings())
      .then(setEditorSettings)
      .catch(() => {});
  }, []);

  const toggleMinimap = () => {
    const next = !(editorSettings?.minimap ?? false);
    setEditorSettings((s) => (s ? { ...s, minimap: next } : s));
    persistSetting({ minimap: next });
  };

  const toggleWordWrap = () => {
    const next = !(editorSettings?.word_wrap ?? false);
    setEditorSettings((s) => (s ? { ...s, word_wrap: next } : s));
    persistSetting({ word_wrap: next });
  };

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      const position = editor.getPosition();
      if (position) {
        const coords = editor.getScrolledVisiblePosition(position);
        if (coords) {
          setCmdKPos({ top: coords.top, left: coords.left });
        } else {
          setCmdKPos({ top: 50, left: 200 });
        }
      }
      setCmdKOpen(true);
    });

    const unlisteners: UnlistenFn[] = [];
    listen<{ file: string; line: number; column: number; message: string; severity: "error" | "warning" | "info" }[]>(
      "build://diagnostics",
      (e) => {
        const diagnostics = e.payload;
        const grouped: Record<string, any[]> = {};
        for (const d of diagnostics) {
          if (!grouped[d.file]) grouped[d.file] = [];
          grouped[d.file].push({
            severity:
              d.severity === "error"
                ? monaco.MarkerSeverity.Error
                : d.severity === "warning"
                  ? monaco.MarkerSeverity.Warning
                  : monaco.MarkerSeverity.Info,
            startLineNumber: d.line,
            startColumn: d.column,
            endLineNumber: d.line,
            endColumn: d.column + 1,
            message: d.message,
          });
        }
        for (const [file, markers] of Object.entries(grouped)) {
          const model = monaco.editor.getModel(monaco.Uri.file(file));
          if (model) {
            monaco.editor.setModelMarkers(model, "build", markers);
          }
        }
      },
    ).then((unlisten) => unlisteners.push(unlisten));

    return () => {
      for (const unlisten of unlisteners) unlisten();
    };
  }, []);

  const handleBeforeMount = useCallback((monaco: typeof import("monaco-editor")) => {
    defineAllMonacoThemes(monaco);

    // Codex Parity: Inline Ghost Text Provider
    monaco.languages.registerInlineCompletionsProvider("*", {
      provideInlineCompletions: async (model, position, _context, token) => {
        // Skip if not at end of line (simple heuristic for ghost text)
        const lineContent = model.getLineContent(position.lineNumber);
        if (position.column < lineContent.length + 1) {
          return { items: [] };
        }

        const prefix = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        // Add a small artificial delay so we don't spam while typing
        await new Promise(resolve => setTimeout(resolve, 300));
        if (token.isCancellationRequested) return { items: [] };

        try {
          const completion = await getInlineCompletion(prefix, "");
          if (completion && completion.length > 0) {
            return {
              items: [{
                insertText: completion,
                range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
              }]
            };
          }
        } catch (e) {
          // ignore
        }
        return { items: [] };
      },
      disposeInlineCompletions: () => {},
    });
  }, []);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (!currentFile) return;
      setContent(currentFile, value ?? "");
      if (editorSettings?.auto_save) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          void saveFile(undefined, { silent: true });
        }, 800);
      }
    },
    [currentFile, editorSettings?.auto_save, setContent, saveFile],
  );

  if (!currentFile) {
    return null;
  }

  const filename = currentFile.split(/[/\\]/).pop() ?? "untitled";
  const language = detectLanguage(filename);
  const segments = currentFile.split(/[/\\]/).filter(Boolean);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar: breadcrumbs + actions */}
      <div className="flex items-center justify-between h-8 px-2 border-b border-border-subtle bg-surface/60 shrink-0">
        <div className="flex items-center min-w-0 text-[11px]">
          {segments.map((seg, i) => {
            const isLast = i === segments.length - 1;
            return (
              <span key={i} className="flex items-center min-w-0">
                {i > 0 && <ChevronRight size={11} className="text-fg-muted shrink-0 mx-0.5" />}
                <span
                  className={`truncate ${
                    isLast ? "text-fg-primary font-medium" : "text-fg-muted hover:text-fg-secondary cursor-pointer transition-fast"
                  }`}
                >
                  {seg}
                </span>
              </span>
            );
          })}
          {dirty && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-warning shrink-0" title="Unsaved changes" />}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <Tooltip label={editorSplit ? "Exit split view" : "Split editor (side-by-side)"}>
            <IconButton size="sm" label={editorSplit ? "Exit split view" : "Split editor"} onClick={toggleEditorSplit} className={editorSplit ? "text-accent" : ""}>
              <Columns2 size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip label={editorSettings?.word_wrap ? "Disable word wrap" : "Enable word wrap"}>
            <IconButton size="sm" label="Toggle word wrap" onClick={toggleWordWrap} className={editorSettings?.word_wrap ? "text-accent" : ""}>
              <WrapText size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip label={editorSettings?.minimap ? "Hide minimap" : "Show minimap"}>
            <IconButton size="sm" label="Toggle minimap" onClick={toggleMinimap} className={editorSettings?.minimap ? "text-accent" : ""}>
              <Map size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip label={dirty ? "Save (Ctrl+S)" : "Saved"}>
            <IconButton size="sm" label="Save file" onClick={() => void saveFile()} className={dirty ? "text-warning" : ""}>
              <Save size={14} />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 relative">
        <CmdKOverlay 
          isOpen={cmdKOpen} 
          onClose={() => setCmdKOpen(false)} 
          position={cmdKPos} 
          onSubmit={async (prompt) => {
            setCmdKOpen(false);
            if (!currentFile || !fileContent) return;
            setInlineAI({
              active: true,
              loading: true,
              original: fileContent,
              modified: "",
              error: null,
            });
            try {
              const unlisten = await listen<any>("chat://delta", (e) => {
                if (e.payload.id.startsWith("inline-")) {
                  setInlineAI(s => s ? { ...s, modified: s.modified + e.payload.content } : s);
                }
              });
              const promise = streamInlineEdit(currentFile, fileContent, prompt);
              const res = await promise;
              unlisten();
              setInlineAI(s => s ? { ...s, loading: false, modified: res.content } : s);
            } catch (e) {
              setInlineAI(s => s ? { ...s, loading: false, error: String(e) } : s);
            }
          }} 
        />
        {inlineAI?.active ? (
          <div className="absolute inset-0 z-10 flex flex-col bg-surface/50 backdrop-blur-md">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border-default bg-transparent">
              <div className="text-xs text-fg-primary font-medium">
                {inlineAI.loading ? (
                  <span className="flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Generating changes...</span>
                ) : inlineAI.error ? (
                  <span className="text-error">Error: {inlineAI.error}</span>
                ) : (
                  <span>Review inline changes</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setInlineAI(null)}
                  className="px-3 py-1 rounded bg-surface-elevated hover:bg-surface-hover text-fg-primary text-xs transition-fast border border-border-subtle"
                >
                  Reject
                </button>
                <button
                  disabled={inlineAI.loading}
                  onClick={() => {
                    setContent(currentFile!, inlineAI.modified);
                    setInlineAI(null);
                  }}
                  className="px-3 py-1 rounded bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-fast disabled:opacity-50"
                >
                  Accept
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <DiffEditor
                original={inlineAI.original}
                modified={inlineAI.modified}
                language={language}
                theme={monacoThemeName(theme)}
                options={{
                  readOnly: true,
                  renderSideBySide: true,
                  minimap: { enabled: false },
                  fontSize: editorSettings?.font_size ?? 13,
                  fontFamily: editorSettings?.font_family ?? "'JetBrains Mono', 'Fira Code', monospace",
                  wordWrap: "off",
                }}
              />
            </div>
          </div>
        ) : (
          <Editor
            value={fileContent ?? ""}
            language={language}
            theme={monacoThemeName(theme)}
            beforeMount={handleBeforeMount}
            onMount={handleMount}
            onChange={handleChange}
            options={{
              readOnly: false,
              minimap: { enabled: editorSettings?.minimap ?? false },
              fontSize: editorSettings?.font_size ?? 13,
              fontFamily: editorSettings?.font_family ?? "'JetBrains Mono', 'Fira Code', monospace",
              fontLigatures: true,
              lineNumbers: "on",
              renderWhitespace: "selection",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              smoothScrolling: true,
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              padding: { top: 8 },
              tabSize: editorSettings?.tab_size ?? 2,
              wordWrap: (editorSettings?.word_wrap ? "on" : "off") as "on" | "off",
              quickSuggestions: true,
              suggestOnTriggerCharacters: true,
              parameterHints: { enabled: true },
              snippetSuggestions: "inline",
              links: true,
              bracketPairColorization: { enabled: true },
            }}
          />
        )}
      </div>
    </div>
  );
}
