import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button, Badge } from "@/presentation/components/ui";

describe("Button", () => {
  it("renders children and handles click", async () => {
    const user = userEvent.setup();
    let clicked = 0;
    render(<Button onClick={() => (clicked += 1)}>Run</Button>);
    const btn = screen.getByRole("button", { name: "Run" });
    await user.click(btn);
    expect(clicked).toBe(1);
  });

  it("is disabled when loading", () => {
    render(<Button loading>Run</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

describe("Badge", () => {
  it("renders its content", () => {
    render(<Badge tone="success">Scheduled</Badge>);
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
  });
});
