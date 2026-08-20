import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("renders with aria-hidden", () => {
    const { container } = render(<Skeleton lines={3} />);
    expect(container.querySelector("[aria-hidden='true']")).toBeTruthy();
  });

  it("renders correct number of lines", () => {
    const { container } = render(<Skeleton lines={5} />);
    const lines = container.querySelectorAll(".h-3");
    expect(lines.length).toBe(5);
  });
});
