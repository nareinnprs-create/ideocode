import { isFilePath } from "./MarkdownRenderer";
import { describe, expect, it } from "vitest";

describe("isFilePath", () => {
  it("detects extension-bearing file names", () => {
    expect(isFilePath("main.rs")).toBe(true);
    expect(isFilePath("Cargo.toml")).toBe(true);
  });

  it("detects paths with separators", () => {
    expect(isFilePath("src/components/App.tsx")).toBe(true);
    expect(isFilePath("crates/ideocode/src/lib.rs")).toBe(true);
    expect(isFilePath("C:\\repo\\src\\main.ts")).toBe(true);
  });

  it("rejects prose and code", () => {
    expect(isFilePath("hello world")).toBe(false);
    expect(isFilePath("fn main")).toBe(false);
    expect(isFilePath("")).toBe(false);
  });
});
