import { describe, expect, it } from "vitest";
import { COMMANDS, getCommandsByCategory } from "./commands";

describe("command registry", () => {
  it("has unique ids", () => {
    const ids = COMMANDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every command has a run handler", () => {
    for (const cmd of COMMANDS) {
      expect(typeof cmd.run, cmd.id).toBe("function");
    }
  });

  it("every command is labeled and categorized", () => {
    for (const cmd of COMMANDS) {
      expect(cmd.label.length).toBeGreaterThan(0);
      expect(cmd.category.length).toBeGreaterThan(0);
    }
  });

  it("groups commands by category preserving registration order", () => {
    const groups = getCommandsByCategory();
    const seen = new Set<string>();
    for (const g of groups) {
      expect(seen.has(g.category)).toBe(false);
      seen.add(g.category);
      expect(g.commands.length).toBeGreaterThan(0);
    }
    expect(seen.has("Panels")).toBe(true);
    expect(seen.has("View")).toBe(true);
  });

  it("change-theme and new-chat are registered", () => {
    const ids = COMMANDS.map((c) => c.id);
    expect(ids).toContain("change-theme");
    expect(ids).toContain("new-chat");
    expect(ids).toContain("toggle-sidebar");
  });
});
