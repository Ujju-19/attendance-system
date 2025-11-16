// backend/server.js
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
  createUser,
  getUserByUsername,
  getUsers,
  getDevices,
  getStats,
  openDb,
  deleteUser,
} from "./db.js";

dotenv.config();
await init();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// ---------------------- Middleware ----------------------
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin.startsWith("http://localhost") ||
        origin.startsWith("http://192.") ||
        origin.startsWith("http://10.") ||
        origin.startsWith("https://frontend-") // for your deployed Vercel frontend
      ) {
        callback(null, true);
      } else {
        console.error("🚫 CORS blocked:", origin);
        callback(new Error("CORS not allowed for this origin: " + origin));
      }
    },
  })
);
app.use(express.json());

// ---------------------- JWT ----------------------
const JWT_SECRET = process.env.JWT_SECRET || "qwertujjwal19@2006";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

const signToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const verifyTokenMiddleware = (req, res, next) => {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Missing token" });
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin")
    return res.status(403).json({ error: "Admins only" });
  next();
};

// ---------------------- Root ----------------------
app.get("/", (req, res) => {
  res.send("✅ Backend API running successfully!");
});

// ---------------------- Auth ----------------------
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
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

app.post("/api/auth/register", verifyTokenMiddleware, requireAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "Missing username or password" });

    const existing = await getUserByUsername(username);
    if (existing) return res.status(409).json({ error: "User exists" });

    const hash = await bcrypt.hash(password, 10);
    const newUser = await createUser(username, hash, role || "user");
    res.json({ success: true, user: newUser });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/users", verifyTokenMiddleware, requireAdmin, async (_, res) => {
  res.json(await getUsers());
});

app.delete("/api/users/:username", verifyTokenMiddleware, requireAdmin, async (req, res) => {
  try {
    const success = await deleteUser(req.params.username);
    if (!success) return res.status(404).json({ error: "User not found" });
    res.json({ success });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------- Attendance ----------------------
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

app.get("/api/attendance-range", async (req, res) => {
  try {
    const { start, end, device } = req.query;
    const db = await openDb();
    let query = "SELECT * FROM attendance WHERE 1=1";
    const params = [];

    if (start) {
      query += " AND date(timestamp) >= date(?)";
      params.push(start);
    }
    if (end) {
      query += " AND date(timestamp) <= date(?)";
      params.push(end);
    }
    if (device && device !== "all") {
      query += " AND device_id = ?";
      params.push(device);
    }

    query += " ORDER BY timestamp DESC";
    const rows = await db.all(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Attendance-range error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Insert from ESP32 or other devices
app.post("/api/attendance", async (req, res) => {
  try {
    console.log("Incoming scan:", req.body);
    const { barcode, device_id, secret } = req.body;

    if (secret !== process.env.DEVICE_SECRET)
      return res.status(401).json({ error: "Invalid device secret" });

    if (!barcode)
      return res.status(400).json({ error: "Missing barcode" });

    const record = await insertRecord(barcode, device_id || "unknown");
    io.emit("new-scan", record);
    res.json({ success: true, record });
  } catch (err) {
    console.error("Insert error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------- Device & Stats ----------------------
app.get("/api/devices", async (_, res) => {
  const rows = await getDevices();
  res.json(rows.map((r) => r.device_id));
});

app.get("/api/stats", async (_, res) => {
  res.json(await getStats());
});

app.get("/api/device-activity", async (_, res) => {
  try {
    const db = await openDb();
    const rows = await db.all(`
      SELECT device_id, COUNT(*) AS scans_today
      FROM attendance
      WHERE date(timestamp) = date('now','localtime')
      GROUP BY device_id
      ORDER BY scans_today DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Device activity error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------- Socket.IO ----------------------
io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);
  socket.on("disconnect", () => console.log("socket disconnected:", socket.id));
});

// ---------------------- Start Server ----------------------
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
}

export default app;
