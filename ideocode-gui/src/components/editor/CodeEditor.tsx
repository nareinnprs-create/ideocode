import { useEffect, useRef, useCallback, useState } from "react";
import Editor, { loader } from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
import { useFileStore } from "../../stores/fileStore";
import { useAppStore } from "../../stores/appStore";
import { getSettings, updateSettings } from "../../lib/tauri-commands";
import type { AppSettings } from "../../lib/tauri-commands";
import { defineAllMonacoThemes, monacoThemeName } from "../../lib/monaco-themes";
import { IconButton } from "../ui/IconButton";
import { Tooltip } from "../ui/Tooltip";
import { ChevronRight, Columns2, WrapText, Map, Save } from "lucide-react";

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

export function CodeEditor() {
  const activeFile = useFileStore((s) => s.activeFile);
  const fileContent = useFileStore((s) =>
    s.activeFile ? s.contents[s.activeFile] : null,
  );
  const setContent = useFileStore((s) => s.setContent);
  const saveFile = useFileStore((s) => s.saveFile);
  const dirty = useFileStore((s) => (s.activeFile ? s.dirty[s.activeFile] : false));
  const theme = useAppStore((s) => s.theme);
  const editorSplit = useAppStore((s) => s.editorSplit);
  const toggleEditorSplit = useAppStore((s) => s.toggleEditorSplit);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [editorSettings, setEditorSettings] = useState<AppSettings | null>(null);

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

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const handleBeforeMount = useCallback((monaco: typeof import("monaco-editor")) => {
    defineAllMonacoThemes(monaco);
  }, []);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (!activeFile) return;
      setContent(activeFile, value ?? "");
      if (editorSettings?.auto_save) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          void saveFile(undefined, { silent: true });
        }, 800);
      }
    },
    [activeFile, editorSettings?.auto_save, setContent, saveFile],
  );

  if (!activeFile) {
    return null;
  }

  const filename = activeFile.split(/[/\\]/).pop() ?? "untitled";
  const language = detectLanguage(filename);
  const segments = activeFile.split(/[/\\]/).filter(Boolean);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar: breadcrumbs + actions */}
      <div className="flex items-center justify-between h-8 px-2 border-b border-border-subtle bg-bg-secondary/60 shrink-0">
        <div className="flex items-center min-w-0 text-[11px]">
          {segments.map((seg, i) => {
            const isLast = i === segments.length - 1;
            return (
              <span key={i} className="flex items-center min-w-0">
                {i > 0 && <ChevronRight size={11} className="text-text-muted shrink-0 mx-0.5" />}
                <span
                  className={`truncate ${
                    isLast ? "text-text-primary font-medium" : "text-text-muted hover:text-text-secondary cursor-pointer transition-fast"
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
            <IconButton size="sm" label={editorSplit ? "Exit split view" : "Split editor"} onClick={toggleEditorSplit} className={editorSplit ? "text-accent-primary" : ""}>
              <Columns2 size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip label={editorSettings?.word_wrap ? "Disable word wrap" : "Enable word wrap"}>
            <IconButton size="sm" label="Toggle word wrap" onClick={toggleWordWrap} className={editorSettings?.word_wrap ? "text-accent-primary" : ""}>
              <WrapText size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip label={editorSettings?.minimap ? "Hide minimap" : "Show minimap"}>
            <IconButton size="sm" label="Toggle minimap" onClick={toggleMinimap} className={editorSettings?.minimap ? "text-accent-primary" : ""}>
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
      <div className="flex-1 min-h-0">
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
      </div>
    </div>
  );
}
