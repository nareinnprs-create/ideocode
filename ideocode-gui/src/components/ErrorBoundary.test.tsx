import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

function ThrowingComponent(): React.ReactNode {
  throw new Error("Test error");
}

describe("ErrorBoundary", () => {
  it("renders children normally", () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("catches errors and shows fallback UI", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Reload")).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it("panel variant shows compact fallback", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary variant="panel">
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText("Panel crashed")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});
