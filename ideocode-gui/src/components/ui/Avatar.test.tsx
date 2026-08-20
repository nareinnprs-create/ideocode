import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("renders with name initials", () => {
    render(<Avatar name="John Doe" />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("renders with single word name", () => {
    render(<Avatar name="Alice" />);
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("renders with two-word name", () => {
    render(<Avatar name="Bob Smith" />);
    expect(screen.getByText("BS")).toBeInTheDocument();
  });

  it("has correct size classes", () => {
    const { container } = render(<Avatar name="Test" size="lg" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar).toHaveClass("w-10", "h-10");
  });

  it("applies custom className", () => {
    const { container } = render(<Avatar name="Test" className="custom" />);
    expect(container.querySelector(".custom")).toBeTruthy();
  });

  it("has aria-label", () => {
    render(<Avatar name="John Doe" />);
    expect(screen.getByLabelText("John Doe")).toBeInTheDocument();
  });
});
