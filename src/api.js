import { auth } from "./firebase";

// Strip any trailing slash(es) — VITE_API_URL="https://host.com/" would
// otherwise produce a double-slash URL ("https://host.com//api/...") that
// doesn't match any Express route and fails silently.
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/+$/, "");

async function request(path, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Login required.");
  const idToken = await user.getIdToken();

  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed. Please try again.");
  return data;
}

export const api = {
  get: (path) => request(path, { method: "GET" }),
  post: (path, body) => request(path, { method: "POST", body }),
};
