import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("renders with default label", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Loading");
  });

  it("renders with custom label", () => {
    render(<Spinner label="Saving..." />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Saving...");
  });

  it("has spinning animation", () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("animate-spin");
  });
});
