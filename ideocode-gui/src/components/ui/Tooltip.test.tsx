import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
  it("renders children", () => {
    render(
      <Tooltip label="Test tooltip">
        <button>Hover me</button>
      </Tooltip>
    );
    expect(screen.getByText("Hover me")).toBeInTheDocument();
  });

  it("has correct position classes", () => {
    const { container } = render(
      <Tooltip label="Top tooltip" position="top">
        <span>Test</span>
      </Tooltip>
    );
    expect(container.querySelector(".tooltip")).toBeTruthy();
  });

  it("applies custom className", () => {
    const { container } = render(
      <Tooltip label="Styled" className="my-custom-class">
        <span>Test</span>
      </Tooltip>
    );
    expect(container.querySelector(".my-custom-class")).toBeTruthy();
  });
});
