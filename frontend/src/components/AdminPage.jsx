import React, { useEffect, useState } from "react";
import { apiFetch } from "../utils/api.js";

export default function AdminPage({ user }) {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    role: "user",
  });
function ChangeOwnPassword() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword)
      return alert("Enter both old and new passwords.");
    try {
      setLoading(true);
      const res = await apiFetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      if (res.success) {
        alert("✅ Password changed successfully.");
        setOldPassword("");
        setNewPassword("");
      } else {
        alert(`❌ ${res.error || "Failed to change password"}`);
      }
    } catch (err) {
      console.error("Change password error:", err);
      alert("Server error while changing password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <input
        type="password"
        placeholder="old password"
        value={oldPassword}
        onChange={(e) => setOldPassword(e.target.value)}
        style={{
          padding: 8,
          borderRadius: 6,
          border: "1px solid #333",
          background: "#222",
          color: "#fff",
        }}
      />
      <input
        type="password"
        placeholder="new password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        style={{
          padding: 8,
          borderRadius: 6,
          border: "1px solid #333",
          background: "#222",
          color: "#fff",
        }}
      />
      <button
        onClick={handleChangePassword}
        disabled={loading}
        style={{
          padding: "8px 14px",
          background: "#ffc107",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          color: "#000",
          fontWeight: "bold",
        }}
      >
        {loading ? "Changing..." : "Change Password"}
      </button>
    </div>
  );
}

  const [loading, setLoading] = useState(false);
  const [resetUser, setResetUser] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const token = localStorage.getItem("token");

  // Fetch all users
  const loadUsers = async () => {
    try {
      const data = await apiFetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(data);
    } catch (err) {
      console.error("loadUsers:", err);
      alert("Failed to load users (admin only).");
    }
  };

  // Add new user
  const addUser = async () => {
    if (!newUser.username || !newUser.password)
      return alert("Username and password required");

    try {
      setLoading(true);
      await apiFetch("/api/auth/register", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUser),
      });
      setNewUser({ username: "", password: "", role: "user" });
      await loadUsers();
      alert("✅ User created successfully");
    } catch (err) {
      console.error("addUser:", err);
      alert("❌ Failed to create user — maybe username already exists?");
    } finally {
      setLoading(false);
    }
  };

  // Delete a user
  const deleteUser = async (username) => {
    if (username === user.username) {
      alert("❌ You cannot delete your own account.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${username}"?`))
      return;
    try {
      setLoading(true);
      const res = await apiFetch(`/api/users/${username}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.success) {
        alert(`✅ Deleted user: ${username}`);
        loadUsers();
      } else {
        alert(`❌ ${res.error || "Failed to delete user"}`);
      }
    } catch (err) {
      console.error("deleteUser:", err);
      alert("Server error while deleting user.");
    } finally {
      setLoading(false);
    }
  };

  // Reset password for a user
  const resetPassword = async () => {
    if (!resetUser || !newPassword) {
      alert("Please select a user and enter a new password.");
      return;
    }
    try {
      setLoading(true);
      const res = await apiFetch(`/api/users/${resetUser}/password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newPassword }),
      });
      if (res.success) {
        alert(`✅ Password changed for ${resetUser}`);
        setResetUser("");
        setNewPassword("");
      } else {
        alert(`❌ ${res.error || "Failed to change password"}`);
      }
    } catch (err) {
      console.error("resetPassword:", err);
      alert("Server error while changing password.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  if (user.role !== "admin")
    return (
      <div style={{ textAlign: "center", marginTop: 40 }}>
        Access denied — Admins only.
      </div>
    );

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "90vh",
        background: "#0e0e0e",
        color: "#fff",
      }}
    >
      <div
        style={{
          width: "92%",
          maxWidth: 900,
          padding: 20,
          background: "#111",
          borderRadius: 10,
          boxShadow: "0 0 20px rgba(0,0,0,0.4)",
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: 20 }}>
          👑 Admin — Manage Users
        </h2>

        {/* Add new user */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 20,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            placeholder="username"
            value={newUser.username}
            onChange={(e) =>
              setNewUser({ ...newUser, username: e.target.value })
            }
            style={{
              padding: 8,
              borderRadius: 6,
              border: "1px solid #333",
              background: "#222",
              color: "#fff",
            }}
          />
          <input
            type="password"
            placeholder="password"
            value={newUser.password}
            onChange={(e) =>
              setNewUser({ ...newUser, password: e.target.value })
            }
            style={{
              padding: 8,
              borderRadius: 6,
              border: "1px solid #333",
              background: "#222",
              color: "#fff",
            }}
          />
          <select
            value={newUser.role}
            onChange={(e) =>
              setNewUser({ ...newUser, role: e.target.value })
            }
            style={{
              padding: 8,
              borderRadius: 6,
              border: "1px solid #333",
              background: "#222",
              color: "#fff",
            }}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={addUser}
            disabled={loading}
            style={{
              padding: "8px 14px",
              background: "#007bff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              color: "#fff",
            }}
          >
            {loading ? "Creating..." : "Add"}
          </button>
        </div>
{/* Change my own password */}
<div
  style={{
    marginBottom: 25,
    background: "#181818",
    padding: 12,
    borderRadius: 8,
  }}
>
  <h3 style={{ marginBottom: 10 }}>🧍 Change My Password</h3>
  <ChangeOwnPassword />
</div>

        {/* Reset Password */}
        <div
          style={{
            marginBottom: 25,
            background: "#181818",
            padding: 12,
            borderRadius: 8,
          }}
        >
          <h3 style={{ marginBottom: 10 }}>🔑 Reset User Password</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <select
              value={resetUser}
              onChange={(e) => setResetUser(e.target.value)}
              style={{
                padding: 8,
                borderRadius: 6,
                border: "1px solid #333",
                background: "#222",
                color: "#fff",
              }}
            >
              <option value="">Select user</option>
              {users.map((u) => (
                <option key={u.username} value={u.username}>
                  {u.username}
                </option>
              ))}
            </select>
            <input
              type="password"
              placeholder="new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{
                padding: 8,
                borderRadius: 6,
                border: "1px solid #333",
                background: "#222",
                color: "#fff",
              }}
            />
            <button
              onClick={resetPassword}
              disabled={loading}
              style={{
                padding: "8px 14px",
                background: "#28a745",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                color: "#fff",
              }}
            >
              {loading ? "Saving..." : "Change Password"}
            </button>
          </div>
        </div>

        {/* Users Table */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#222" }}>
              <th style={{ padding: 8 }}>ID</th>
              <th>Username</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                style={{ textAlign: "center", borderBottom: "1px solid #333" }}
              >
                <td style={{ padding: 6 }}>{u.id}</td>
                <td>{u.username}</td>
                <td>{u.role}</td>
                <td>{u.created_at}</td>
                <td>
                  <button
                    onClick={() => deleteUser(u.username)}
                    style={{
                      background: "#dc3545",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "4px 10px",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr>
                <td colSpan={5} style={{ padding: 12, color: "#777" }}>
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
