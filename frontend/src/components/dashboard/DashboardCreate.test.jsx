import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// jsdom lacks matchMedia; polyfill before anything renders
beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = () => ({ matches: false, media: "", addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() });
  }
});
import { MemoryRouter } from "react-router-dom";

// Payload shaped exactly like the production LinkResponse
const PROD_LINK = {
  id: 1,
  target_url: "https://github.com/dashboard",
  short_code: "git-shortcut",
  custom_slug: "git-shortcut",
  title: "my github",
  clicks: 0,
  expires_at: "2026-08-31T15:08:00",
  created_at: "2026-08-22T12:00:00",
  owner_id: 2,
};

const apiMock = vi.hoisted(() => ({
  get: vi.fn(async () => ({ data: [] })),
  post: vi.fn(async () => ({ data: PROD_LINK })),
  delete: vi.fn(async () => ({ data: {} })),
}));

vi.mock("@/api/client", () => ({
  default: apiMock,
  getErrorMessage: (e, fallback) => fallback,
}));

vi.mock("@/context/AuthContext", async (importOriginal) => ({
  ...(await importOriginal()),
  useAuth: () => ({ token: "t", user: { email: "x@x.com" }, isAuthenticated: true, login: vi.fn(), logout: vi.fn() }),
}));

import Dashboard from "@/pages/Dashboard";

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Dashboard />
    </MemoryRouter>
  );
}

describe("Dashboard: creating a link must not crash", () => {
  beforeEach(() => {
    apiMock.get.mockClear();
    apiMock.get.mockImplementation(async () => ({ data: [] }));
    apiMock.post.mockClear();
  });

  it("renders dashboard initially", async () => {
    renderDashboard();
    expect(screen.getByText("No links yet")).toBeTruthy();
  });

  it("survives the full create-link flow (regression: white screen)", async () => {
    const { container } = renderDashboard();
    await waitFor(() => expect(screen.getByTestId("nav-create")).toBeTruthy());

    // Open the dialog
    fireEvent.click(screen.getByTestId("nav-create"));
    expect(screen.getByTestId("create-link-form")).toBeTruthy();

    // Fill the form exactly like the failing session
    fireEvent.change(screen.getByLabelText(/destination url/i), {
      target: { value: "https://github.com/dashboard" },
    });
    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "my github" } });
    fireEvent.change(screen.getByLabelText(/custom slug/i), { target: { value: "git-shortcut" } });
    fireEvent.change(screen.getByLabelText(/expires at/i), {
      target: { value: "2026-08-31T15:08" },
    });

    // Submit
    fireEvent.submit(screen.getByTestId("create-link-form"));

    // Row appears and page did NOT go blank
    await waitFor(() => expect(container.querySelector("[data-testid='links-table']")).toBeTruthy());
    expect(container.textContent).toContain("git-shortcut");
    // If React crashed, the root would be empty
    expect(container.innerHTML.length).toBeGreaterThan(500);
  });
});
