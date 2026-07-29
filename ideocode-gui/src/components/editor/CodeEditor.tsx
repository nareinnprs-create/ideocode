import { useRef, useCallback } from "react";
import Editor, { loader } from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
import { useFileStore } from "../../stores/fileStore";

// Configure Monaco to use bundled files
loader.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs",
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
  const { selectedFile, fileContent } = useFileStore();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

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
          theme="vs-dark"
          onMount={handleMount}
          options={{
            readOnly: false,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineNumbers: "on",
            renderWhitespace: "selection",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 8 },
            tabSize: 2,
            wordWrap: "off",
          }}
        />
      </div>
    </div>
  );
}
