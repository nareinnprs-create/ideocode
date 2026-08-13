import type { Theme } from "./theme-registry";

export interface ThemeColors {
  bg: string;
  bgSecondary: string;
  bgTertiary: string;
  bgElevated: string;
  bgHover: string;
  fg: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSecondary: string;
  accentTertiary: string;
  accentHover: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  borderSubtle: string;
  borderDefault: string;
  selection: string;
  glow: string;
}

// Hex values must stay in sync with the [data-theme="..."] blocks in
// src/styles/globals.css.
export const THEME_COLORS: Record<Theme, ThemeColors> = {
  ideo_dark: {
    bg: "#0a0b0f", bgSecondary: "#14151a", bgTertiary: "#1e2027", bgElevated: "#26282f", bgHover: "#1a1b22",
    fg: "#e6e8ef", textSecondary: "#a5aab8", textMuted: "#5d6272",
    accent: "#6366f1", accentSecondary: "#8b5cf6", accentTertiary: "#22d3ee", accentHover: "#7c7ff2",
    success: "#34d399", warning: "#fbbf24", error: "#f87171", info: "#818cf8",
    borderSubtle: "#1c1e26", borderDefault: "#2a2d38", selection: "#6366f133", glow: "#6366f140",
  },
  ideo_light: {
    bg: "#fafafb", bgSecondary: "#f1f1f4", bgTertiary: "#e6e6eb", bgElevated: "#d8d8df", bgHover: "#ececf0",
    fg: "#17181d", textSecondary: "#3f4050", textMuted: "#71727f",
    accent: "#5b5fe7", accentSecondary: "#7c3aed", accentTertiary: "#0891b2", accentHover: "#474cd1",
    success: "#059669", warning: "#d97706", error: "#dc2626", info: "#6366f1",
    borderSubtle: "#e9e9ee", borderDefault: "#d3d4dd", selection: "#5b5fe733", glow: "#5b5fe733",
  },
  midnight: {
    bg: "#0a0a0f", bgSecondary: "#17171d", bgTertiary: "#27272c", bgElevated: "#36363c", bgHover: "#202026",
    fg: "#e8e8f0", textSecondary: "#b3b3c2", textMuted: "#6a6a82",
    accent: "#6366f1", accentSecondary: "#8b5cf6", accentTertiary: "#a78bfa", accentHover: "#8385f1",
    success: "#22c55e", warning: "#f59e0b", error: "#ef4444", info: "#7761f4",
    borderSubtle: "#222232", borderDefault: "#3a3a54", selection: "#6366f14d", glow: "#6366f14d",
  },
  dark: {
    bg: "#1e1e2e", bgSecondary: "#292a39", bgTertiary: "#363746", bgElevated: "#434453", bgHover: "#313141",
    fg: "#d8dee9", textSecondary: "#a7afbe", textMuted: "#646e82",
    accent: "#89b4fa", accentSecondary: "#81a1c1", accentTertiary: "#b48ead", accentHover: "#9cbef6",
    success: "#a3be8c", warning: "#ebcb8b", error: "#bf616a", info: "#85abde",
    borderSubtle: "#2d3040", borderDefault: "#3c4252", selection: "#89b4fa4d", glow: "#89b4fa4d",
  },
  light: {
    bg: "#ffffff", bgSecondary: "#f1f1f2", bgTertiary: "#e1e1e4", bgElevated: "#d1d1d5", bgHover: "#e8e8ea",
    fg: "#1a1a2e", textSecondary: "#3c3c51", textMuted: "#6a6a82",
    accent: "#6366f1", accentSecondary: "#7c3aed", accentTertiary: "#8b5cf6", accentHover: "#5154c2",
    success: "#16a34a", warning: "#d97706", error: "#dc2626", info: "#7050ef",
    borderSubtle: "#e4e5ee", borderDefault: "#c8cadc", selection: "#6366f14d", glow: "#6366f14d",
  },
  monokai: {
    bg: "#272822", bgSecondary: "#34342e", bgTertiary: "#42433d", bgElevated: "#51524c", bgHover: "#3c3d37",
    fg: "#f8f8f2", textSecondary: "#c1bfb4", textMuted: "#75715e",
    accent: "#a6e22e", accentSecondary: "#66d9ef", accentTertiary: "#ae81ff", accentHover: "#bae75d",
    success: "#a6e22e", warning: "#ffff00", error: "#f92672", info: "#86de8f",
    borderSubtle: "#38382a", borderDefault: "#484832", selection: "#a6e22e4d", glow: "#a6e22e4d",
  },
  dracula: {
    bg: "#282a36", bgSecondary: "#343641", bgTertiary: "#43454e", bgElevated: "#52535c", bgHover: "#3d3f49",
    fg: "#f8f8f2", textSecondary: "#b9c0d1", textMuted: "#6272a4",
    accent: "#ff79c6", accentSecondary: "#bd93f9", accentTertiary: "#50fa7b", accentHover: "#fd97d1",
    success: "#50fa7b", warning: "#ffb86c", error: "#ff5555", info: "#de86e0",
    borderSubtle: "#363948", borderDefault: "#44475a", selection: "#ff79c64d", glow: "#ff79c64d",
  },
  nord: {
    bg: "#2e3440", bgSecondary: "#393f4b", bgTertiary: "#474c57", bgElevated: "#545964", bgHover: "#414752",
    fg: "#eceff4", textSecondary: "#a9afba", textMuted: "#4c566a",
    accent: "#88c0d0", accentSecondary: "#81a1c1", accentTertiary: "#b48ead", accentHover: "#a0cbd9",
    success: "#a3be8c", warning: "#ebcb8b", error: "#bf616a", info: "#85b1c9",
    borderSubtle: "#353b49", borderDefault: "#3b4252", selection: "#88c0d04d", glow: "#88c0d04d",
  },
  solarized: {
    bg: "#002b36", bgSecondary: "#0f3740", bgTertiary: "#21454c", bgElevated: "#335459", bgHover: "#193f47",
    fg: "#fdf6e3", textSecondary: "#cacdc3", textMuted: "#839496",
    accent: "#268bd2", accentSecondary: "#2aa198", accentTertiary: "#859900", accentHover: "#5aa5d6",
    success: "#268bd2", warning: "#b58900", error: "#dc322f", info: "#2896b5",
    borderSubtle: "#04313c", borderDefault: "#073642", selection: "#268bd24d", glow: "#268bd24d",
  },
  one_dark: {
    bg: "#282c34", bgSecondary: "#30343c", bgTertiary: "#393d46", bgElevated: "#424750", bgHover: "#353942",
    fg: "#abb2bf", textSecondary: "#8a919e", textMuted: "#5c6370",
    accent: "#61afef", accentSecondary: "#c678dd", accentTertiary: "#98c379", accentHover: "#73b0e3",
    success: "#98c379", warning: "#e5c07b", error: "#e06c75", info: "#9494e6",
    borderSubtle: "#313640", borderDefault: "#393f4b", selection: "#61afef4d", glow: "#61afef4d",
  },
  github_dark: {
    bg: "#0d1117", bgSecondary: "#181d23", bgTertiary: "#252a30", bgElevated: "#33373e", bgHover: "#20242a",
    fg: "#c9d1d9", textSecondary: "#a3abb4", textMuted: "#6e7681",
    accent: "#58a6ff", accentSecondary: "#d299eb", accentTertiary: "#79c077", accentHover: "#73b0f6",
    success: "#79c077", warning: "#d299eb", error: "#f85149", info: "#95a0f5",
    borderSubtle: "#1f242a", borderDefault: "#30363d", selection: "#58a6ff4d", glow: "#58a6ff4d",
  },
  neon_city: {
    bg: "#0a0a14", bgSecondary: "#091922", bgTertiary: "#092a33", bgElevated: "#083b43", bgHover: "#09232c",
    fg: "#00ffff", textSecondary: "#15a9b1", textMuted: "#323246",
    accent: "#00ffff", accentSecondary: "#ff00ff", accentTertiary: "#8b5cf6", accentHover: "#00ffff",
    success: "#00ff80", warning: "#ffc800", error: "#ff3232", info: "#8080ff",
    borderSubtle: "#141423", borderDefault: "#1e1e32", selection: "#00ffff4d", glow: "#00ffff4d",
  },
  synthwave: {
    bg: "#190a28", bgSecondary: "#270f2f", bgTertiary: "#371636", bgElevated: "#471c3e", bgHover: "#301333",
    fg: "#ff6496", textSecondary: "#be4f89", textMuted: "#643278",
    accent: "#ff00c8", accentSecondary: "#00c8ff", accentTertiary: "#ffc800", accentHover: "#ff18bc",
    success: "#00ff96", warning: "#ffc800", error: "#ff3264", info: "#8064e4",
    borderSubtle: "#260f3c", borderDefault: "#321450", selection: "#ff00c84d", glow: "#ff00c84d",
  },
  matrix: {
    bg: "#000a00", bgSecondary: "#001900", bgTertiary: "#002a00", bgElevated: "#003b00", bgHover: "#002300",
    fg: "#00ff00", textSecondary: "#00b600", textMuted: "#005000",
    accent: "#00ff00", accentSecondary: "#00c800", accentTertiary: "#009600", accentHover: "#00ff00",
    success: "#00ff00", warning: "#c8ff00", error: "#ff0000", info: "#00e400",
    borderSubtle: "#001900", borderDefault: "#002800", selection: "#00ff004d", glow: "#00ff004d",
  },
  tron: {
    bg: "#050a0f", bgSecondary: "#0b151d", bgTertiary: "#11232e", bgElevated: "#18303f", bgHover: "#0f1d27",
    fg: "#64c8ff", textSecondary: "#4f9ed3", textMuted: "#326496",
    accent: "#00c8ff", accentSecondary: "#ff9600", accentTertiary: "#64c8ff", accentHover: "#18c8ff",
    success: "#00ff64", warning: "#ff9600", error: "#ff3232", info: "#80af80",
    borderSubtle: "#122335", borderDefault: "#1e3c5a", selection: "#00c8ff4d", glow: "#00c8ff4d",
  },
  glassmorphism: {
    bg: "#0f0f14", bgSecondary: "#1b1b21", bgTertiary: "#2a2a2f", bgElevated: "#38383e", bgHover: "#242429",
    fg: "#dcdce6", textSecondary: "#a1a1af", textMuted: "#505064",
    accent: "#6496ff", accentSecondary: "#9664ff", accentTertiary: "#64c896", accentHover: "#81a7f9",
    success: "#64c896", warning: "#ffc864", error: "#ff6464", info: "#7d7dff",
    borderSubtle: "#1c1c23", borderDefault: "#282832", selection: "#6496ff4d", glow: "#6496ff4d",
  },
  retro: {
    bg: "#32281e", bgSecondary: "#3b3025", bgTertiary: "#463a2c", bgElevated: "#504434", bgHover: "#413629",
    fg: "#c8b48c", textSecondary: "#9e8a6a", textMuted: "#64503c",
    accent: "#ff9632", accentSecondary: "#c86432", accentTertiary: "#966432", accentHover: "#f29d48",
    success: "#96c864", warning: "#ffc832", error: "#c85050", info: "#e47d32",
    borderSubtle: "#413223", borderDefault: "#503c28", selection: "#ff96324d", glow: "#ff96324d",
  },
};

export function getThemeColors(theme: Theme): ThemeColors {
  return THEME_COLORS[theme];
}
