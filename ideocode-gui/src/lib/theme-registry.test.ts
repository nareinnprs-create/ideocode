import { describe, expect, it } from "vitest";
import { THEMES, THEME_IDS, isTheme } from "./theme-registry";

describe("theme-registry", () => {
  it("exposes at least one theme per tier", () => {
    const tiers = new Set(THEMES.map((t) => t.tier));
    expect(tiers).toEqual(new Set(["Default", "Classic", "Cyberpunk", "Minimal"]));
  });

  it("has unique ids and matching THEME_IDS", () => {
    const ids = THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(THEME_IDS).toEqual(ids);
  });

  it("every theme provides a full color set", () => {
    for (const theme of THEMES) {
      expect(theme.bg.startsWith("#")).toBe(true);
      expect(theme.bgSecondary.startsWith("#")).toBe(true);
      expect(theme.accent.startsWith("#")).toBe(true);
      expect(theme.text.startsWith("#")).toBe(true);
    }
  });

  it("isTheme validates known ids and rejects unknown values", () => {
    expect(isTheme("midnight")).toBe(true);
    expect(isTheme("dracula")).toBe(true);
    expect(isTheme("neon_city")).toBe(true);
    expect(isTheme("not-a-theme")).toBe(false);
    expect(isTheme(42)).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });
});
