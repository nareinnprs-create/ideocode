import { describe, expect, it } from "vitest";
import { parseUnifiedDiff } from "./diff-parser";

describe("parseUnifiedDiff", () => {
  it("returns null for empty input", () => {
    expect(parseUnifiedDiff("")).toBeNull();
    expect(parseUnifiedDiff("   ")).toBeNull();
  });

  it("returns null for binary diffs", () => {
    expect(
      parseUnifiedDiff("Binary files a/foo.png and b/foo.png differ"),
    ).toBeNull();
  });

  it("parses context, removed and added lines", () => {
    const diff = [
      "@@ -1,3 +1,4 @@",
      " context",
      "-old line",
      "+new line",
      " trailing",
    ].join("\n");

    const parsed = parseUnifiedDiff(diff);
    expect(parsed).toEqual({
      original: "context\nold line\ntrailing",
      modified: "context\nnew line\ntrailing",
    });
  });

  it("returns null when a hunk has no content", () => {
    expect(parseUnifiedDiff("@@ -1,1 +1,1 @@\n")).toBeNull();
  });

  it("tolerates CRLF line endings and no-newline markers", () => {
    const diff = [
      "@@ -1,1 +1,1 @@",
      "-a",
      "\\ No newline at end of file",
      "+b",
    ].join("\r\n");

    const parsed = parseUnifiedDiff(diff);
    expect(parsed).toEqual({ original: "a", modified: "b" });
  });

  it("returns null when the hunk header is malformed", () => {
    const parsed = parseUnifiedDiff("@@ not a hunk @@\n+content");
    expect(parsed).toBeNull();
  });
});
