import { describe, it, expect } from "vitest";
import { getErrorMessage } from "@/api/client";

function axiosError(detail, message = "Request failed") {
  return { response: { data: { detail } }, message };
}

describe("getErrorMessage", () => {
  it("returns string details as-is (401/409/429 style)", () => {
    expect(getErrorMessage(axiosError("Invalid credentials"))).toBe("Invalid credentials");
    expect(getErrorMessage(axiosError("Email already registered"))).toBe("Email already registered");
    expect(getErrorMessage(axiosError("Too many attempts. Please try again later."))).toBe(
      "Too many attempts. Please try again later."
    );
  });

  it("flattens FastAPI 422 validation arrays into readable text", () => {
    const err = axiosError([
      {
        type: "url_parsing",
        loc: ["body", "target_url"],
        msg: "Input should be a valid URL, relative URL without a base",
        input: "github.com/dashboard",
      },
    ]);
    const msg = getErrorMessage(err, "Could not create the link");
    // MUST be a plain string — rendering objects crashes React (#31)
    expect(typeof msg).toBe("string");
    expect(msg).toContain("target_url");
    expect(msg).toContain("valid URL");
  });

  it("joins multiple 422 errors", () => {
    const err = axiosError([
      { type: "missing", loc: ["body", "target_url"], msg: "Field required", input: {} },
      { type: "string_too_short", loc: ["body", "username"], msg: "String should have at least 2 characters", input: "" },
    ]);
    const msg = getErrorMessage(err);
    expect(msg).toContain("target_url: Field required");
    expect(msg).toContain("username: String should have at least 2 characters");
  });

  it("stringifies object details instead of returning them raw", () => {
    const err = axiosError({ weird: true });
    expect(typeof getErrorMessage(err)).toBe("string");
  });

  it("falls back to error.message then the fallback", () => {
    expect(getErrorMessage({ message: "Network Error" })).toBe("Network Error");
    expect(getErrorMessage({}, "Login failed")).toBe("Login failed");
  });
});
