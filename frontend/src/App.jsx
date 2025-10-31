import React, { useState, useEffect } from "react";
import LiveTable from "./components/LiveTable.jsx";
import LoginPage from "./components/LoginPage.jsx";
import AdminPage from "./components/AdminPage.jsx";
import "./global.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("live");

  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  if (!user) return <LoginPage onLogin={setUser} />;

  return (
    <div className="main-container">
      {/* --- Top Navigation Bar --- */}
      <div className="top-bar">
        <div className="top-bar-left">
          {user.role === "admin" && (
            <>
              <button
                className={`top-btn live ${view === "live" ? "active" : ""}`}
                onClick={() => setView("live")}
              >
                Live
              </button>
              <button
                className={`top-btn admin ${view === "admin" ? "active" : ""}`}
                onClick={() => setView("admin")}
              >
                Admin
              </button>
            </>
          )}
        </div>

        <div className="top-bar-right">
          <span className="username">{user.username}</span>
          <button className="top-btn logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* --- Main View --- */}
      <div className="dashboard-container-wrapper">
        {view === "admin" && user.role === "admin" ? (
          <AdminPage user={user} />
        ) : (
          <LiveTable />
        )}
      </div>
    </div>
  );
}
