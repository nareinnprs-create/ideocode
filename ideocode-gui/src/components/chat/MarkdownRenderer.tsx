import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { lazy, Suspense, useState } from "react";
import { Copy, Check, FileCode2, Play } from "lucide-react";
import { useFileStore } from "../../stores/fileStore";
import { useEditStore } from "../../stores/editStore";
import { notify } from "../../stores/toastStore";

const MermaidDiagram = lazy(() =>
  import("./MermaidDiagram").then((m) => ({ default: m.MermaidDiagram })),
);

interface Props {
  content: string;
  onFileClick?: (path: string) => void;
}

export function MarkdownRenderer({ content, onFileClick }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        pre({ children }) {
          return <CodeBlock lang={extractLanguage(children)}>{children}</CodeBlock>;
        },
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const raw = extractText(children);
          if (match && match[1].toLowerCase() === "mermaid") {
            return (
              <Suspense
                fallback={
                  <div className="my-2 p-3 text-xs text-fg-muted animate-pulse rounded-lg bg-surface">
                    Rendering diagram...
                  </div>
                }
              >
                <MermaidDiagram code={raw} />
              </Suspense>
            );
          }
          if (match) {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
          const looksLikePath = isFilePath(raw);
          if (looksLikePath && onFileClick) {
            return (
              <button
                onClick={() => onFileClick(raw)}
                title={`Open ${raw}`}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-elevated text-fg-primary text-[13px] font-mono hover:text-accent hover:bg-surface-hover transition-fast cursor-pointer align-middle underline decoration-dotted decoration-text-muted underline-offset-2"
              >
                <FileCode2 size={12} />
                {raw}
              </button>
            );
          }
          return (
            <code
              className="bg-surface-elevated px-1.5 py-0.5 rounded text-fg-primary text-[13px] font-mono"
              {...props}
            >
              {children}
            </code>
          );
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              {children}
            </a>
          );
        },
        ul({ children }) {
          return <ul className="list-disc list-outside space-y-1 pl-5 my-2">{children}</ul>;
        },
        ol({ children }) {
          return (
            <ol className="list-decimal list-outside space-y-1 pl-5 my-2">{children}</ol>
          );
        },
        h1({ children }) {
          return (
            <h1 className="text-xl font-bold text-fg-primary mt-4 mb-2">
              {children}
            </h1>
          );
        },
        h2({ children }) {
          return (
            <h2 className="text-lg font-semibold text-fg-primary mt-3 mb-1.5">
              {children}
            </h2>
          );
        },
        h3({ children }) {
          return (
            <h3 className="text-base font-semibold text-fg-primary mt-2 mb-1">
              {children}
            </h3>
          );
        },
        p({ children }) {
          return <p className="text-sm leading-relaxed mb-2">{children}</p>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-2 border-accent pl-3 text-fg-secondary italic my-2">
              {children}
            </blockquote>
          );
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-2">
              <table className="text-sm border-collapse">{children}</table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th className="border border-border-default px-3 py-1.5 text-left font-medium bg-surface-elevated">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="border border-border-default px-3 py-1.5">
              {children}
            </td>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function CodeBlock({ children, lang }: { children: React.ReactNode; lang: string | null }) {
  const [copied, setCopied] = useState(false);
  const activeFile = useFileStore(s => s.activeFile);
  const contents = useFileStore(s => s.contents);
  const stageEdit = useEditStore(s => s.stageEdit);

  const handleCopy = () => {
    const text = extractText(children);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const handleApply = () => {
    if (!activeFile) {
      notify("error", "No active file", "Please open a file to apply the edit.");
      return;
    }
    const text = extractText(children);
    stageEdit(activeFile, contents[activeFile] || "", text);
    notify("success", "Edit staged", `Staged edit for ${activeFile.split(/[/\\]/).pop()}`);
  };

  return (
    <div className="group/cb my-2 rounded-lg overflow-hidden border border-border-subtle">
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-elevated/60 border-b border-border-subtle">
        <span className="text-[11px] text-fg-muted font-mono">{lang || "code"}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleApply}
            className="flex items-center gap-1.5 p-1 rounded-md text-accent hover:bg-accent/10 opacity-60 group-hover/cb:opacity-100 focus-visible:opacity-100 transition-fast"
            title="Stage edit for active file"
          >
            <Play size={12} />
            <span className="text-[11px] font-medium">Apply</span>
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 p-1 rounded-md text-fg-muted hover:text-fg-primary hover:bg-surface-hover opacity-60 group-hover/cb:opacity-100 focus-visible:opacity-100 transition-fast"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <span className="text-[11px]">{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>
      <pre className="bg-surface p-3 overflow-x-auto text-[13px] leading-relaxed font-mono">
        {children}
      </pre>
    </div>
  );
}

function extractLanguage(node: React.ReactNode): string | null {
  if (node && typeof node === "object" && "props" in node) {
    const props = node.props as { className?: string };
    const match = /language-(\w+)/.exec(props.className || "");
    if (match) return match[1];
  }
  return null;
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (!node || typeof node !== "object") return "";
  if ("props" in node && node.props && typeof node.props === "object") {
    const props = node.props as { children?: React.ReactNode };
    return extractText(props.children);
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join("");
  }
  return "";
}

export function isFilePath(text: string): boolean {
  const t = text.trim();
  if (t.length === 0 || t.length > 160) return false;
  if (/\s/.test(t)) return false;
  const hasPathSeparator = /[/\\]/.test(t);
  const hasExtension = /\.[a-zA-Z0-9]{1,8}$/.test(t);
  if (!hasPathSeparator && !hasExtension) return false;
  const withoutDrive = t.replace(/^[a-zA-Z]:/, "");
  if (/[{}().,;:<>'"`=+*@!#&|]/.test(withoutDrive.replace(/\.[a-zA-Z0-9]+$/, ""))) return false;
  return true;
}
