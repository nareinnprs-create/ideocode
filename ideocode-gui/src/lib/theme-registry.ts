export type Theme =
  | "ideo_dark"
  | "ideo_light"
  | "midnight"
  | "dark"
  | "light"
  | "monokai"
  | "dracula"
  | "nord"
  | "solarized"
  | "one_dark"
  | "github_dark"
  | "neon_city"
  | "synthwave"
  | "matrix"
  | "tron"
  | "retro";

export type ThemeTier = "Default" | "Classic" | "Cyberpunk" | "Minimal";

export interface ThemeInfo {
  id: Theme;
  label: string;
  description: string;
  tier: ThemeTier;
  bg: string;
  bgSecondary: string;
  accent: string;
  text: string;
}

export const THEMES: ThemeInfo[] = [
  { id: "ideo_dark", label: "Ideo Dark", description: "Signature Ideo 2027 dark theme", tier: "Default", bg: "#0e0f10", bgSecondary: "#141517", accent: "#5e6ad2", text: "#f7f8f8" },
  { id: "ideo_light", label: "Ideo Light", description: "Signature Ideo 2027 light theme", tier: "Default", bg: "#fafafb", bgSecondary: "#f1f1f4", accent: "#5b5fe7", text: "#17181d" },
  { id: "midnight", label: "Midnight Noir", description: "Dark with indigo accents", tier: "Default", bg: "#0a0a0f", bgSecondary: "#17171d", accent: "#6366f1", text: "#e8e8f0" },
  { id: "dark", label: "Dark", description: "Classic dark theme", tier: "Default", bg: "#1e1e2e", bgSecondary: "#292a39", accent: "#89b4fa", text: "#d8dee9" },
  { id: "light", label: "Light", description: "Clean light theme", tier: "Default", bg: "#ffffff", bgSecondary: "#f1f1f2", accent: "#6366f1", text: "#1a1a2e" },
  { id: "monokai", label: "Monokai", description: "Vivid green and magenta", tier: "Classic", bg: "#272822", bgSecondary: "#34342e", accent: "#a6e22e", text: "#f8f8f2" },
  { id: "dracula", label: "Dracula", description: "Dark with pink and purple", tier: "Classic", bg: "#282a36", bgSecondary: "#343641", accent: "#ff79c6", text: "#f8f8f2" },
  { id: "nord", label: "Nord", description: "Frosty polar blues", tier: "Classic", bg: "#2e3440", bgSecondary: "#393f4b", accent: "#88c0d0", text: "#eceff4" },
  { id: "solarized", label: "Solarized", description: "Earthy teal and gold", tier: "Classic", bg: "#002b36", bgSecondary: "#0f3740", accent: "#268bd2", text: "#fdf6e3" },
  { id: "one_dark", label: "One Dark", description: "Atom's signature palette", tier: "Classic", bg: "#282c34", bgSecondary: "#30343c", accent: "#61afef", text: "#abb2bf" },
  { id: "github_dark", label: "GitHub Dark", description: "Deep GitHub night", tier: "Classic", bg: "#0d1117", bgSecondary: "#181d23", accent: "#58a6ff", text: "#c9d1d9" },
  { id: "neon_city", label: "Neon City", description: "Cyan and magenta glow", tier: "Cyberpunk", bg: "#0a0a14", bgSecondary: "#091922", accent: "#00ffff", text: "#00ffff" },
  { id: "synthwave", label: "Synthwave", description: "Retro synth sunset", tier: "Cyberpunk", bg: "#190a28", bgSecondary: "#270f2f", accent: "#ff00c8", text: "#ff6496" },
  { id: "matrix", label: "Matrix", description: "Digital green rain", tier: "Cyberpunk", bg: "#000a00", bgSecondary: "#001900", accent: "#00ff00", text: "#00ff00" },
  { id: "tron", label: "Tron", description: "Glowing electric grid", tier: "Cyberpunk", bg: "#050a0f", bgSecondary: "#0b151d", accent: "#00c8ff", text: "#64c8ff" },
  { id: "retro", label: "Retro", description: "Warm amber terminal", tier: "Minimal", bg: "#32281e", bgSecondary: "#3b3025", accent: "#ff9632", text: "#c8b48c" },
];

export const THEME_IDS: readonly Theme[] = THEMES.map((t) => t.id);

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}
