import type { editor } from "monaco-editor";
import type { Theme } from "./theme-registry";
import { getThemeColors, THEME_COLORS } from "./theme-palettes";

export function monacoThemeName(theme: Theme): string {
  return `ideocode-${theme}`;
}

export function defineAllMonacoThemes(monaco: typeof import("monaco-editor")): void {
  for (const theme of Object.keys(THEME_COLORS) as Theme[]) {
    defineMonacoTheme(monaco, theme);
  }
}

export function defineMonacoTheme(monaco: typeof import("monaco-editor"), theme: Theme): void {
  const c = getThemeColors(theme);
  const isLight = theme === "light";

  const data: editor.IStandaloneThemeData = {
    base: isLight ? "vs" : "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: c.fg },
      { token: "comment", foreground: c.textMuted, fontStyle: "italic" },
      { token: "keyword", foreground: c.accent },
      { token: "keyword.control", foreground: c.accent },
      { token: "string", foreground: c.accentSecondary },
      { token: "string.escape", foreground: c.accentTertiary },
      { token: "number", foreground: c.success },
      { token: "type", foreground: c.accentTertiary },
      { token: "type.identifier", foreground: c.accentTertiary },
      { token: "identifier", foreground: c.fg },
      { token: "function", foreground: c.info },
      { token: "variable", foreground: c.fg },
      { token: "constant", foreground: c.warning },
      { token: "operator", foreground: c.textSecondary },
      { token: "delimiter", foreground: c.textSecondary },
      { token: "tag", foreground: c.accent },
      { token: "attribute.name", foreground: c.accentTertiary },
      { token: "attribute.value", foreground: c.accentSecondary },
      { token: "invalid", foreground: c.error },
      { token: "error", foreground: c.error },
      { token: "annotation", foreground: c.accentTertiary },
      { token: "keyword.operator", foreground: c.textSecondary },
      { token: "meta.embedded", foreground: c.fg },
    ],
    colors: {
      "editor.background": c.bg,
      "editor.foreground": c.fg,
      "editorLineNumber.foreground": c.textMuted,
      "editorLineNumber.activeForeground": c.accent,
      "editorCursor.foreground": c.accent,
      "editor.selectionBackground": c.selection,
      "editor.inactiveSelectionBackground": c.selection,
      "editor.lineHighlightBackground": c.bgHover,
      "editorIndentGuide.background1": c.borderSubtle,
      "editorIndentGuide.activeBackground1": c.borderDefault,
      "editorWidget.background": c.bgSecondary,
      "editorWidget.border": c.borderDefault,
      "editorWidget.shadow": c.glow,
      "input.background": c.bg,
      "input.foreground": c.fg,
      "input.border": c.borderDefault,
      "focusBorder": c.accent,
      "list.activeSelectionBackground": c.bgHover,
      "list.activeSelectionForeground": c.fg,
      "list.hoverBackground": c.bgHover,
      "list.inactiveSelectionBackground": c.bgHover,
      "scrollbarSlider.background": c.selection,
      "scrollbarSlider.hoverBackground": c.glow,
      "editorGutter.background": c.bg,
      "editorGutter.modifiedBackground": c.warning,
      "editorGutter.addedBackground": c.success,
      "editorGutter.deletedBackground": c.error,
      "editorOverviewRuler.border": c.borderSubtle,
      "minimap.background": c.bg,
      "diffEditor.insertedTextBackground": `${c.success}26`,
      "diffEditor.removedTextBackground": `${c.error}26`,
      "breadcrumb.background": c.bg,
      "editorBracketHighlight.foreground1": c.accent,
      "editorBracketHighlight.foreground2": c.accentSecondary,
      "editorBracketHighlight.foreground3": c.accentTertiary,
    },
  };

  monaco.editor.defineTheme(monacoThemeName(theme), data);
}
