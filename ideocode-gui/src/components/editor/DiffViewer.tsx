import { DiffEditor } from "@monaco-editor/react";
import { useAppStore } from "../../stores/appStore";
import { defineAllMonacoThemes, monacoThemeName } from "../../lib/monaco-themes";
import { parseUnifiedDiff } from "../../lib/diff-parser";

const EXT_TO_LANG: Record<string, string> = {
  rs: "rust", ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
  py: "python", go: "go", java: "java", cpp: "cpp", c: "c", h: "c", hpp: "cpp",
  swift: "swift", kt: "kotlin", rb: "ruby", php: "php", css: "css", scss: "scss",
  html: "html", json: "json", yaml: "yaml", yml: "yaml", toml: "toml", md: "markdown",
  sql: "sql", sh: "shell", bash: "shell", ps1: "powershell", xml: "xml", svg: "xml",
};

function detectLanguage(filename: string): string {
  const parts = filename.split(".");
  const ext = parts[parts.length - 1]?.toLowerCase() ?? "";
  return EXT_TO_LANG[ext] ?? "plaintext";
}

interface DiffViewerProps {
  file: string;
  diff?: string;
  originalContent?: string;
  modifiedContent?: string;
  height?: number | string;
  sideBySide?: boolean;
}

export function DiffViewer({ file, diff, originalContent, modifiedContent, height = 224, sideBySide = true }: DiffViewerProps) {
  const theme = useAppStore((s) => s.theme);
  
  let original = originalContent || "";
  let modified = modifiedContent || "";
  let isParseable = true;

  if (diff) {
    const parsed = parseUnifiedDiff(diff);
    if (parsed) {
      original = parsed.original;
      modified = parsed.modified;
    } else {
      isParseable = false;
    }
  }

  const handleBeforeMount = (monaco: typeof import("monaco-editor")) => {
    defineAllMonacoThemes(monaco);
  };

  if (!isParseable) {
    return (
      <pre className="px-3 py-2 text-[11px] font-mono text-fg-secondary max-h-48 overflow-y-auto whitespace-pre-wrap">
        {diff ? "Binary or unparseable diff" : "No diff available"}
      </pre>
    );
  }

  return (
    <div style={{ height }}>
      <DiffEditor
        original={original}
        modified={modified}
        language={detectLanguage(file)}
        theme={monacoThemeName(theme)}
        beforeMount={handleBeforeMount}
        options={{
          readOnly: true,
          renderSideBySide: sideBySide,
          originalEditable: false,
          minimap: { enabled: false },
          fontSize: 11,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          renderIndicators: true,
          wordWrap: "off",
        }}
      />
    </div>
  );
}
