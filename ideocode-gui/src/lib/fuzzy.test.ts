import { describe, expect, it } from "vitest";
import { fuzzySearch } from "./fuzzy";

describe("fuzzySearch", () => {
  it("matches subsequences", () => {
    expect(fuzzySearch("nwc", "New Chat")).not.toBeNull();
    expect(fuzzySearch("set", "Open Settings")).not.toBeNull();
  });

  it("returns null when not a subsequence", () => {
    expect(fuzzySearch("xyz", "Open Settings")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(fuzzySearch("SETTINGS", "open settings")).not.toBeNull();
  });

  it("splits query into tokens matching separate words", () => {
    const m = fuzzySearch("open git", "Open Git Panel");
    expect(m).not.toBeNull();
    expect(m!.score).toBeGreaterThan(0);
  });

  it("scores word-start matches higher", () => {
    const wordStart = fuzzySearch("oe", "Open Git Panel");
    const midWord = fuzzySearch("pe", "Open Git Panel");
    expect(wordStart!.score).toBeGreaterThan(midWord!.score);
  });

  it("handles empty query", () => {
    expect(fuzzySearch("", "anything")).toBeNull();
    expect(fuzzySearch("  ", "anything")).toBeNull();
  });
});
