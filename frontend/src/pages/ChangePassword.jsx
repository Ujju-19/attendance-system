import React, { useState } from "react";
import { apiFetch } from "../utils/api.js";

export default function ChangePassword({ token }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");

  const handleChange = async () => {
    if (newPassword !== confirm) {
      setMessage("❌ New passwords do not match");
      return;
    }

    try {
      const res = await apiFetch("/api/change-password", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      if (res.success) {
        setMessage("✅ Password updated successfully!");
        setOldPassword("");
        setNewPassword("");
        setConfirm("");
      } else {
        setMessage(`❌ ${res.error || "Something went wrong"}`);
      }
    } catch (err) {
      console.error("Change password error:", err);
      setMessage("❌ Server error");
    }
  };

  return (
    <div className="main-container">
      <h2>Change Password</h2>
      <div className="form-group">
        <label>Old Password:</label>
        <input
          type="password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>New Password:</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Confirm New Password:</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>

      <button className="btn-primary" onClick={handleChange}>
        Update Password
      </button>

      {message && <p style={{ marginTop: "12px" }}>{message}</p>}
    </div>
  );
}
