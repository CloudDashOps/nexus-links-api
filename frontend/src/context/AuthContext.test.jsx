import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/context/AuthContext";

function HookProbe() {
  const { isAuthenticated, user, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth-state">{isAuthenticated ? "authenticated" : "anonymous"}</span>
      <span data-testid="auth-user">{user?.email || "none"}</span>
      <button onClick={() => login("tok-123", { email: "a@b.com", username: "a" })}>in</button>
      <button onClick={logout}>out</button>
    </div>
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("AuthContext", () => {
  it("starts anonymous without a stored token", () => {
    render(
      <AuthProvider>
        <HookProbe />
      </AuthProvider>
    );
    expect(screen.getByTestId("auth-state").textContent).toBe("anonymous");
    expect(screen.getByTestId("auth-user").textContent).toBe("none");
  });

  it("login stores the token and user, logout clears them", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    render(
      <AuthProvider>
        <HookProbe />
      </AuthProvider>
    );

    await user.click(screen.getByText("in"));

    await waitFor(() => expect(screen.getByTestId("auth-state").textContent).toBe("authenticated"));
    expect(localStorage.getItem("nexuslinks_token")).toBe("tok-123");
    expect(screen.getByTestId("auth-user").textContent).toBe("a@b.com");

    await user.click(screen.getByText("out"));
    expect(screen.getByTestId("auth-state").textContent).toBe("anonymous");
    expect(localStorage.getItem("nexuslinks_token")).toBeNull();
  });

  it("hydrates an authenticated session from a persisted token", () => {
    localStorage.setItem("nexuslinks_token", "stored-token");
    localStorage.setItem("nexuslinks_user", JSON.stringify({ email: "kept@b.com", username: "kept" }));

    render(
      <AuthProvider>
        <HookProbe />
      </AuthProvider>
    );

    expect(screen.getByTestId("auth-state").textContent).toBe("authenticated");
    expect(screen.getByTestId("auth-user").textContent).toBe("kept@b.com");
  });

  it("ignores corrupted cached user JSON", () => {
    localStorage.setItem("nexuslinks_token", "stored-token");
    localStorage.setItem("nexuslinks_user", "{not json");

    render(
      <AuthProvider>
        <HookProbe />
      </AuthProvider>
    );

    // Still authenticated via token; user fetch is triggered against /me
    expect(screen.getByTestId("auth-state").textContent).toBe("authenticated");
  });

  it("throws when useAuth is used outside the provider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Bad() {
      useAuth();
      return null;
    }
    expect(() => render(<Bad />)).toThrow(/useAuth must be used within an AuthProvider/);
    consoleSpy.mockRestore();
  });
});