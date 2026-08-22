import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import StatsCards from "@/components/dashboard/StatsCards";

const LINKS = [
  { id: 1, short_code: "aaa", clicks: 120 },
  { id: 2, short_code: "bbb", clicks: 30 },
  { id: 3, short_code: "ccc", clicks: 50 },
];

describe("StatsCards", () => {
  it("renders aggregate stats from links", () => {
    render(<StatsCards links={LINKS} loading={false} />);

    expect(screen.getByText("Total Links")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument(); // total clicks
    expect(screen.getByText("67")).toBeInTheDocument(); // avg rounded
    expect(screen.getByText("aaa")).toBeInTheDocument(); // top link hint
  });

  it("renders zeros for an empty account", () => {
    render(<StatsCards links={[]} loading={false} />);

    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("No links yet")).toBeInTheDocument();
  });

  it("shows skeletons while loading", () => {
    const { container } = render(<StatsCards links={[]} loading={true} />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});