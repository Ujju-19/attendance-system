// frontend/src/components/LoginPage.jsx
import React, { useState } from "react";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #a8edea, #fed6e3)", // soothing pastel gradient
        fontFamily: "Arial, sans-serif",
        margin: 0,
      }}
    >
      <div
        style={{
          background: "#1f1f1f",
          padding: "40px",
          borderRadius: "15px",
          boxShadow: "0 6px 25px rgba(0, 0, 0, 0.3)",
          textAlign: "center",
          width: "320px",
        }}
      >
        <h2
          style={{
            color: "white",
            marginBottom: "20px",
            fontWeight: "bold",
            letterSpacing: "0.5px",
          }}
        >
          Login
        </h2>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              background: "#2b2b2b",
              color: "white",
              fontSize: "14px",
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              background: "#2b2b2b",
              color: "white",
              fontSize: "14px",
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px",
              backgroundColor: "#00c896",
              border: "none",
              borderRadius: "8px",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "background 0.3s ease",
              fontSize: "15px",
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#00a87a")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#00c896")}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          {error && (
            <div style={{ color: "#ff7675", marginTop: "10px", fontSize: "14px" }}>
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
