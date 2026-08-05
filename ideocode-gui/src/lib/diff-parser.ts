export interface ParsedDiff {
  original: string;
  modified: string;
}

const HUNK_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

export function parseUnifiedDiff(diff: string): ParsedDiff | null {
  if (!diff || diff.trim() === "") return null;

  const original: string[] = [];
  const modified: string[] = [];
  let inHunk = false;

  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("@@")) {
      inHunk = HUNK_RE.test(line);
      continue;
    }
    if (line.startsWith("Binary files")) {
      return null;
    }
    if (!inHunk) {
      if (line === "\\ No newline at end of file") continue;
      continue;
    }
    if (line === "\\ No newline at end of file") continue;

    const marker = line[0];
    const content = line.slice(1);
    if (marker === " ") {
      original.push(content);
      modified.push(content);
    } else if (marker === "-") {
      original.push(content);
    } else if (marker === "+") {
      modified.push(content);
    }
  }

  if (original.length === 0 && modified.length === 0) return null;

  return {
    original: original.join("\n"),
    modified: modified.join("\n"),
  };
}
