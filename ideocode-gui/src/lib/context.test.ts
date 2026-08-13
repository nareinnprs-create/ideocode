import { describe, expect, it } from "vitest";
import { buildFileContext, MAX_FILE_CONTEXT_CHARS } from "./context";

describe("buildFileContext", () => {
  it("returns null without an active file", () => {
    expect(buildFileContext("hi", null, undefined)).toBeNull();
  });

  it("returns null when file content is not loaded", () => {
    expect(buildFileContext("hi", "src/main.ts", undefined)).toBeNull();
  });

  it("wraps content in a context block", () => {
    const ctx = buildFileContext("Fix this", "src/main.ts", "const x = 1;")!;
    expect(ctx.payload).toContain('<context file="src/main.ts">');
    expect(ctx.payload).toContain("```ts");
    expect(ctx.payload).toContain("const x = 1;");
    expect(ctx.payload).toContain("Fix this");
  });

  it("truncates oversized file content", () => {
    const big = "a".repeat(MAX_FILE_CONTEXT_CHARS + 100);
    const ctx = buildFileContext("hi", "big.rs", big)!;
    expect(ctx.payload).toContain("file context truncated");
    expect(ctx.payload.length).toBeLessThan(MAX_FILE_CONTEXT_CHARS + 500);
  });

  it("strips the context block from echoed responses", () => {
    const ctx = buildFileContext("hello", "src/app.tsx", "export const App = () => null;")!;
    const echoed = `${ctx.payload}\nHere is the fix`;
    const stripped = ctx.strip(echoed);
    expect(stripped).not.toContain("<context");
    expect(stripped).not.toContain("export const App");
    expect(stripped).toContain("Here is the fix");
  });
});
