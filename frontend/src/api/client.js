import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach the JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nexuslinks_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on expired/invalid tokens
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("nexuslinks_token");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

/** Normalise axios errors into a human-readable, renderable STRING.
 * FastAPI 422 responses carry `detail` as an ARRAY of objects
 * ({type, loc, msg, input}) — rendering that directly crashes React
 * ("Objects are not valid as a React child"), so flatten it here. */
export function getErrorMessage(error, fallback = "Something went wrong") {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail)) {
    const parts = detail.map((d) => {
      if (typeof d === "string") return d;
      const where = Array.isArray(d?.loc)
        ? d.loc.filter((p) => p !== "body").join(".")
        : "";
      const msg = d?.msg || JSON.stringify(d);
      return where ? `${where}: ${msg}` : msg;
    });
    const joined = parts.join("; ");
    if (joined) return joined;
  }
  if (detail && typeof detail === "object") {
    try {
      return JSON.stringify(detail);
    } catch {
      /* fall through */
    }
  }
  if (typeof error?.message === "string" && error.message) return error.message;
  return fallback;
}

export default api;