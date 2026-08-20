import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Toggle } from "./Toggle";

describe("Toggle", () => {
  it("renders with label", () => {
    render(<Toggle checked={false} onCheckedChange={() => {}} label="Dark mode" />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("calls onCheckedChange when clicked", () => {
    const handleChange = vi.fn();
    render(<Toggle checked={false} onCheckedChange={handleChange} label="Test" />);
    fireEvent.click(screen.getByRole("switch"));
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it("has correct aria-checked when checked", () => {
    render(<Toggle checked={true} onCheckedChange={() => {}} label="Test" />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });
});
