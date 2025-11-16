// frontend/src/utils/api.js

// Use environment variable for backend URL.
// Default to localhost only during local development.
const API_BASE =
  import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:3000";
console.log("Backend URL:", import.meta.env.VITE_BACKEND_URL);

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Request failed (${res.status})`);
    }

    // Try to parse JSON, fallback to empty object
    try {
      return await res.json();
    } catch {
      return {};
    }
  } catch (err) {
    console.error(`❌ API fetch error for ${path}:`, err.message);
    throw err;
  }
}
