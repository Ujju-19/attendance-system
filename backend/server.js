// backend/server.js — full version with auth (fixed imports)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import {
  init,
  insertRecord,
  getRecent,
  createUser,
  getUserByUsername,
  getUsers,
  getDevices,
  getStats,
  openDb,
  updatePassword,
  deleteUser,
} from "./db.js";


dotenv.config();
await init();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || "*" },
});

// --- Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

// --- JWT helpers
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyTokenMiddleware(req, res, next) {
  try {
    const auth = req.headers["authorization"] || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin")
    return res.status(403).json({ error: "Admins only" });
  next();
}

// --- AUTH routes ---
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "username & password required" });

    const user = await getUserByUsername(username);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post(
  "/api/auth/register",
  verifyTokenMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const { username, password, role } = req.body;
      if (!username || !password)
        return res
          .status(400)
          .json({ error: "username & password required" });

      const existing = await getUserByUsername(username);
      if (existing) return res.status(409).json({ error: "User exists" });

      const hash = await bcrypt.hash(password, 10);
      const newUser = await createUser(username, hash, role || "user");
      res.json({ success: true, user: newUser });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// List users (admin only)
app.get("/api/users", verifyTokenMiddleware, requireAdmin, async (req, res) => {
  const rows = await getUsers();
  res.json(rows);
});
/* -------------------------
   Change Password
   ------------------------- */
app.post("/api/change-password", verifyTokenMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const username = req.user.username; // from JWT

    if (!oldPassword || !newPassword)
      return res.status(400).json({ error: "Missing fields" });

    const user = await getUserByUsername(username);
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Old password incorrect" });

    const new_hash = await bcrypt.hash(newPassword, 10);
    const success = await updatePassword(username, new_hash);

    res.json({ success });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* -------------------------
   Delete User (Admin only)
   ------------------------- */
app.delete("/api/users/:username", verifyTokenMiddleware, requireAdmin, async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) return res.status(400).json({ error: "Username required" });

    const success = await deleteUser(username);
    if (!success) return res.status(404).json({ error: "User not found" });

    res.json({ success });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Attendance API ---
app.get("/api/attendance", async (req, res) => {
  try {
    const { date, device } = req.query;
    let query = "SELECT * FROM attendance";
    const params = [];

    if (date || device) {
      query += " WHERE";
      if (date) {
        query += " date(timestamp) = date(?)";
        params.push(date);
      }
      if (device) {
        if (date) query += " AND";
        query += " device_id = ?";
        params.push(device);
      }
    }

    query += " ORDER BY timestamp DESC LIMIT 200";
    const db = await openDb();
    const rows = await db.all(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Attendance fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/attendance", async (req, res) => {
  try {
    const { barcode, device_id, secret } = req.body;
    if (secret !== process.env.DEVICE_SECRET)
      return res.status(401).json({ error: "Invalid device secret" });
    if (!barcode) return res.status(400).json({ error: "Missing barcode" });

    const record = await insertRecord(barcode, device_id || "unknown");
    io.emit("new-scan", record);
    res.json({ success: true, record });
  } catch (err) {
    console.error("Insert error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Devices & Stats ---
app.get("/api/devices", async (req, res) => {
  const rows = await getDevices();
  res.json(rows.map((r) => r.device_id));
});

app.get("/api/stats", async (req, res) => {
  const stats = await getStats();
  res.json(stats);
});

// --- Socket.IO setup ---
io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);
  socket.on("disconnect", () => console.log("socket disconnected:", socket.id));
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
// --- Change own password (for any logged-in user)
app.post("/api/auth/change-password", verifyTokenMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword)
      return res.status(400).json({ error: "Old and new password required" });

    const user = await getUserByUsername(req.user.username);
    if (!user) return res.status(404).json({ error: "User not found" });

    const match = await bcrypt.compare(oldPassword, user.password_hash);
    if (!match) return res.status(401).json({ error: "Old password incorrect" });

    const newHash = await bcrypt.hash(newPassword, 10);
    const db = await openDb();
    await db.run("UPDATE users SET password_hash = ? WHERE username = ?", [
      newHash,
      req.user.username,
    ]);

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

