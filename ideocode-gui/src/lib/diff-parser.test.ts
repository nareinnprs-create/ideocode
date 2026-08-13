import { describe, expect, it } from "vitest";
import { parseUnifiedDiff } from "./diff-parser";

const SAMPLE = `--- a/src/lib.rs
+++ b/src/lib.rs
@@ -1,3 +1,3 @@
 fn main() {
-    println!("old");
+    println!("new");
 }
`;

describe("parseUnifiedDiff", () => {
  it("extracts original and modified sides", () => {
    const result = parseUnifiedDiff(SAMPLE)!;
    expect(result.original).toBe('fn main() {\n    println!("old");\n}');
    expect(result.modified).toBe('fn main() {\n    println!("new");\n}');
  });

  it("keeps context lines in both sides", () => {
    const result = parseUnifiedDiff(SAMPLE)!;
    expect(result.original).toContain("fn main() {");
    expect(result.modified).toContain("fn main() {");
  });

  it("ignores file headers and hunk lines", () => {
    const result = parseUnifiedDiff(SAMPLE)!;
    expect(result.original).not.toContain("--- a/src/lib.rs");
    expect(result.original).not.toContain("@@");
  });

  it("handles CRLF line endings", () => {
    const result = parseUnifiedDiff(SAMPLE.replace(/\n/g, "\r\n"))!;
    expect(result.modified).toContain("println!(\"new\");");
  });

  it("returns null for empty or non-diff text", () => {
    expect(parseUnifiedDiff("")).toBeNull();
    expect(parseUnifiedDiff("   ")).toBeNull();
    expect(parseUnifiedDiff("just some text\nno diff here")).toBeNull();
  });

  it("returns null for binary diffs", () => {
    expect(parseUnifiedDiff("Binary files a/x and b/x differ")).toBeNull();
  });

  it("handles multiple hunks", () => {
    const multi = `@@ -1,1 +1,1 @@
-old
+new
@@ -10,1 +10,1 @@
-foo
+bar
`;
    const result = parseUnifiedDiff(multi)!;
    expect(result.original).toBe("old\nfoo");
    expect(result.modified).toBe("new\nbar");
  });
});
