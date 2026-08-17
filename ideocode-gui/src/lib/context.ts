export const MAX_FILE_CONTEXT_CHARS = 30_000;

export interface FileContextResult {
  payload: string;
  strip: (s: string) => string;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface FileEntry {
  path: string;
  content: string;
}

export function buildFileContext(
  payload: string,
  activeFile: string | null,
  fileContent: string | undefined,
  mentionedFiles: FileEntry[] = [],
): FileContextResult | null {
  const filesToInclude = new Map<string, string>();
  if (activeFile && fileContent !== undefined) {
    filesToInclude.set(activeFile, fileContent);
  }
  for (const mf of mentionedFiles) {
    filesToInclude.set(mf.path, mf.content);
  }

  if (filesToInclude.size === 0) return null;

  let block = "";
  const markers: string[] = [];

  for (const [path, content] of filesToInclude.entries()) {
    const ext = path.includes(".") ? path.split(".").pop()!.toLowerCase() : "";
    const body =
      content.length > MAX_FILE_CONTEXT_CHARS
        ? content.slice(0, MAX_FILE_CONTEXT_CHARS) + "\n... [file context truncated]"
        : content;
    const marker = `<context file="${path}">`;
    markers.push(marker);
    block += `${marker}\n\`\`\`${ext}\n${body}\n\`\`\`\n</context>\n\n`;
  }

  block += payload;

  const strip = (s: string) => {
    let result = s;
    for (const marker of markers) {
      const stripPattern = new RegExp(`${escapeRegex(marker)}[\\s\\S]*?</context>\\n?`, "g");
      result = result.replace(stripPattern, "");
    }
    return result;
  };

  return { payload: block, strip };
}
