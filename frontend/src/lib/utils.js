import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Format large numbers compactly: 12345 -> "12.3k" */
export function formatCount(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/** Build a URL with UTM campaign parameters appended. */
export function buildUtmUrl(baseUrl, utm = {}) {
  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    return baseUrl;
  }
  const mapping = {
    source: "utm_source",
    medium: "utm_medium",
    campaign: "utm_campaign",
    term: "utm_term",
    content: "utm_content",
  };
  for (const [key, param] of Object.entries(mapping)) {
    const value = (utm[key] || "").trim();
    if (value) url.searchParams.set(param, value);
  }
  return url.toString();
}

/** Extract the domain from an arbitrary URL string, or null when invalid. */
export function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}