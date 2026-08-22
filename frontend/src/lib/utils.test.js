import { describe, expect, it } from "vitest";
import {
  buildUtmUrl,
  cn,
  formatCount,
  getDomain,
} from "@/lib/utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, undefined, "b")).toBe("a b");
  });

  it("merges conflicting tailwind classes (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});

describe("formatCount", () => {
  it.each([
    [0, "0"],
    [42, "42"],
    [999, "999"],
    [1500, "1.5k"],
    [12_345, "12.3k"],
    [2_500_000, "2.5M"],
  ])("formats %d as %s", (input, expected) => {
    expect(formatCount(input)).toBe(expected);
  });

  it("handles bad input", () => {
    expect(formatCount(undefined)).toBe("0");
    expect(formatCount(NaN)).toBe("0");
  });
});

describe("buildUtmUrl", () => {
  it("appends provided utm parameters", () => {
    const out = buildUtmUrl("https://example.com/page", {
      source: "twitter",
      medium: "social",
      campaign: "launch",
    });
    expect(out).toBe("https://example.com/page?utm_source=twitter&utm_medium=social&utm_campaign=launch");
  });

  it("skips empty values and keeps the base url intact", () => {
    expect(buildUtmUrl("https://example.com", { source: "  " })).toBe("https://example.com/");
  });

  it("returns the original string for invalid urls", () => {
    expect(buildUtmUrl("not a url", { source: "x" })).toBe("not a url");
  });
});

describe("getDomain", () => {
  it("extracts hostname without www", () => {
    expect(getDomain("https://www.example.com/path?q=1")).toBe("example.com");
  });

  it("returns null for invalid urls", () => {
    expect(getDomain("nope")).toBeNull();
  });
});