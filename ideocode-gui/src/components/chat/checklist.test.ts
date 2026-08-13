import { describe, expect, it } from "vitest";
import { parseChecklist } from "./Checklist";

describe("parseChecklist", () => {
  it("parses checked and unchecked items", () => {
    const items = parseChecklist("- [ ] Setup repo\n- [x] Create branch");
    expect(items).toEqual([
      { text: "Setup repo", checked: false },
      { text: "Create branch", checked: true },
    ]);
  });

  it("supports asterisk bullets and uppercase X", () => {
    expect(parseChecklist("* [X] done")).toEqual([{ text: "done", checked: true }]);
    expect(parseChecklist("* [ ] todo")).toEqual([{ text: "todo", checked: false }]);
  });

  it("ignores non-checklist lines", () => {
    const items = parseChecklist("Some text\n- [ ] one\nmore prose");
    expect(items).toEqual([{ text: "one", checked: false }]);
  });

  it("returns null when no checklist items exist", () => {
    expect(parseChecklist("Just prose, no tasks")).toBeNull();
    expect(parseChecklist("")).toBeNull();
  });

  it("trims item text", () => {
    expect(parseChecklist("- [ ]   spaced item  ")).toEqual([{ text: "spaced item", checked: false }]);
  });
});
