import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("renders unchecked", () => {
    render(<Checkbox checked={false} onCheckedChange={() => {}} label="Accept terms" />);
    const input = screen.getByRole("checkbox") as HTMLInputElement;
    expect(input.checked).toBe(false);
  });

  it("renders checked", () => {
    render(<Checkbox checked={true} onCheckedChange={() => {}} label="Accept terms" />);
    const input = screen.getByRole("checkbox") as HTMLInputElement;
    expect(input.checked).toBe(true);
  });
});
