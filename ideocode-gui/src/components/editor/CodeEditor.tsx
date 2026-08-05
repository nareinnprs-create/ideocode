import { useEffect, useRef, useCallback, useState } from "react";
import Editor, { loader } from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
import { useFileStore } from "../../stores/fileStore";
import { useAppStore } from "../../stores/appStore";
import { getSettings } from "../../lib/tauri-commands";
import type { AppSettings } from "../../lib/tauri-commands";
import { defineAllMonacoThemes, monacoThemeName } from "../../lib/monaco-themes";

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
  const selectedFile = useFileStore((s) => s.selectedFile);
  const fileContent = useFileStore((s) => s.fileContent);
  const dirty = useFileStore((s) => s.dirty);
  const setContent = useFileStore((s) => s.setContent);
  const saveFile = useFileStore((s) => s.saveFile);
  const theme = useAppStore((s) => s.theme);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [editorSettings, setEditorSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    getSettings().then(setEditorSettings).catch(() => {});
  }, []);

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const handleBeforeMount = useCallback((monaco: typeof import("monaco-editor")) => {
    defineAllMonacoThemes(monaco);
  }, []);

  const handleChange = useCallback(
    (value: string | undefined) => {
      setContent(value ?? "");
      if (editorSettings?.auto_save) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          void saveFile();
        }, 800);
      }
    },
    [editorSettings?.auto_save, setContent, saveFile],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveFile();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveFile]);

  if (!selectedFile) {
    return null;
  }

  const filename = selectedFile.split(/[/\\]/).pop() ?? "untitled";
  const language = detectLanguage(filename);

  return (
    <div className="flex flex-col h-full">
      {/* File tab header */}
      <div className="flex items-center h-9 px-3 border-b border-border-subtle bg-bg-secondary">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-bg-elevated rounded-t text-xs border border-border-subtle border-b-0 -mb-px">
          <span className="w-3 h-3 rounded-full bg-accent-primary/30" />
          <span className="text-text-primary font-mono text-[11px]">
            {filename}
          </span>
          {dirty && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-warning shrink-0"
              title="Unsaved changes"
            />
          )}
          <span className="text-text-muted text-[10px]">
            {language}
          </span>
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
            lineNumbers: "on",
            renderWhitespace: "selection",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 8 },
            tabSize: editorSettings?.tab_size ?? 2,
            wordWrap: (editorSettings?.word_wrap ? "on" : "off") as "on" | "off",
          }}
        />
      </div>
    </div>
  );
}
