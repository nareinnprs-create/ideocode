import { useState, useMemo } from "react";
import { useFileStore } from "../../stores/fileStore";
import { DiffEditor } from "@monaco-editor/react";
import { loader } from "@monaco-editor/react";
import { monacoThemeName } from "../../lib/monaco-themes";
import { useAppStore } from "../../stores/appStore";

loader.config({ paths: { vs: "/monaco/vs" } });

export function DiffPanel() {
  const openFiles = useFileStore((s) => s.openFiles);
  const contents = useFileStore((s) => s.contents);
  const theme = useAppStore((s) => s.theme);

  const [leftFile, setLeftFile] = useState<string>("");
  const [rightFile, setRightFile] = useState<string>("");

  const filesWithContent = useMemo(
    () => openFiles.filter((f) => contents[f] !== undefined),
    [openFiles, contents],
  );

  const hasDiff = leftFile && rightFile && leftFile !== rightFile;

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Diff viewer">
      <div className="flex items-center gap-3 px-3 h-9 border-b border-border-subtle bg-surface shrink-0">
        <span className="text-xs font-medium text-fg-primary">Diff</span>
        <select
          value={leftFile}
          onChange={(e) => setLeftFile(e.target.value)}
          className="flex-1 bg-surface border border-border-subtle rounded px-2 py-1 text-[11px] text-fg-primary outline-none font-mono"
          aria-label="Original file (left side)"
        >
          <option value="">Original (left)…</option>
          {filesWithContent.map((f) => (
            <option key={f} value={f}>{f.split(/[/\\]/).pop()}</option>
          ))}
        </select>
        <select
          value={rightFile}
          onChange={(e) => setRightFile(e.target.value)}
          className="flex-1 bg-surface border border-border-subtle rounded px-2 py-1 text-[11px] text-fg-primary outline-none font-mono"
          aria-label="Modified file (right side)"
        >
          <option value="">Modified (right)…</option>
          {filesWithContent.map((f) => (
            <option key={f} value={f}>{f.split(/[/\\]/).pop()}</option>
          ))}
        </select>
      </div>
      <div className="flex-1 min-h-0">
        {hasDiff ? (
          <DiffEditor
            original={contents[leftFile] ?? ""}
            modified={contents[rightFile] ?? ""}
            theme={monacoThemeName(theme)}
            options={{
              readOnly: true,
              renderSideBySide: true,
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-fg-muted text-xs">
            Select two files to compare
          </div>
        )}
      </div>
    </div>
  );
}
