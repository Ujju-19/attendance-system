// frontend/src/utils/api.js
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(
    `${import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"}${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    }
  );

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Request failed (${res.status})`);
  }

  try {
    return await res.json();
  } catch {
    return {};
  }
}
