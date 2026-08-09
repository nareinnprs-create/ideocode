import { basename, closeTab, openTab } from "./tabs";
import { describe, expect, it } from "vitest";

describe("openTab", () => {
  it("appends a new path and activates it", () => {
    const next = openTab({ openFiles: ["a"], activeFile: "a" }, "b");
    expect(next).toEqual({ openFiles: ["a", "b"], activeFile: "b" });
  });

  it("keeps order when re-opening an existing tab", () => {
    const next = openTab({ openFiles: ["a", "b"], activeFile: "a" }, "b");
    expect(next).toEqual({ openFiles: ["a", "b"], activeFile: "b" });
  });
});

describe("closeTab", () => {
  it("activates the next tab when closing the active one", () => {
    const next = closeTab({ openFiles: ["a", "b", "c"], activeFile: "a" }, "a");
    expect(next).toEqual({ openFiles: ["b", "c"], activeFile: "b" });
  });

  it("activates the previous tab when the active one is last", () => {
    const next = closeTab({ openFiles: ["a", "b", "c"], activeFile: "c" }, "c");
    expect(next).toEqual({ openFiles: ["a", "b"], activeFile: "b" });
  });

  it("leaves a non-active tab untouched", () => {
    const next = closeTab({ openFiles: ["a", "b"], activeFile: "b" }, "a");
    expect(next).toEqual({ openFiles: ["b"], activeFile: "b" });
  });

  it("clears activeFile when closing the last tab", () => {
    const next = closeTab({ openFiles: ["a"], activeFile: "a" }, "a");
    expect(next).toEqual({ openFiles: [], activeFile: null });
  });
});

describe("basename", () => {
  it("handles posix and windows separators", () => {
    expect(basename("/a/b/c.rs")).toBe("c.rs");
    expect(basename("C:\\repo\\src\\main.ts")).toBe("main.ts");
  });
});
