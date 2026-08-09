export interface TabList {
  openFiles: string[];
  activeFile: string | null;
}

export function openTab(state: TabList, path: string): TabList {
  const openFiles = state.openFiles.includes(path)
    ? state.openFiles
    : [...state.openFiles, path];
  return { openFiles, activeFile: path };
}

export function closeTab(state: TabList, closed: string): TabList {
  const index = state.openFiles.indexOf(closed);
  if (index === -1) {
    return { ...state };
  }
  const openFiles = state.openFiles.filter((p) => p !== closed);
  if (state.activeFile !== closed) {
    return { openFiles, activeFile: state.activeFile };
  }
  const next = openFiles[index] ?? openFiles[index - 1] ?? null;
  return { openFiles, activeFile: next };
}

export function basename(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}
