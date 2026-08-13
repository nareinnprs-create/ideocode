export const MAX_FILE_CONTEXT_CHARS = 30_000;

export interface FileContextResult {
  payload: string;
  strip: (s: string) => string;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildFileContext(
  payload: string,
  activeFile: string | null,
  fileContent: string | undefined,
): FileContextResult | null {
  if (!activeFile || fileContent === undefined) return null;
  const ext = activeFile.includes(".") ? activeFile.split(".").pop()!.toLowerCase() : "";
  const body =
    fileContent.length > MAX_FILE_CONTEXT_CHARS
      ? fileContent.slice(0, MAX_FILE_CONTEXT_CHARS) + "\n... [file context truncated]"
      : fileContent;
  const marker = `<context file="${activeFile}">`;
  const block = `${marker}\n\`\`\`${ext}\n${body}\n\`\`\`\n</context>\n\n${payload}`;
  const stripPattern = new RegExp(
    `${escapeRegex(marker)}[\\s\\S]*</context>\\n?`,
  );
  return { payload: block, strip: (s) => s.replace(stripPattern, "") };
}
