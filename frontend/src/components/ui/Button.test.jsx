import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders children and handles clicks", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save changes</Button>);

    const button = screen.getByRole("button", { name: /save changes/i });
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled with the disabled attribute", async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Nope</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies variant classes", () => {
    const { rerender } = render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole("button").className).toMatch(/destructive/);

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole("button").className).toMatch(/border/);
  });

  it("applies size classes", () => {
    render(<Button size="lg">Big</Button>);
    expect(screen.getByRole("button").className).toMatch(/px-8/);
  });
});