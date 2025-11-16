// backend/db.js (ESM)
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function openDb() {
  return open({
    filename: path.join(__dirname, "attendance.db"),
    driver: sqlite3.Database,
  });
}

/**
 * Initialize DB: attendance table + users table
 * attendance.timestamp has default datetime('now','localtime') to avoid NOT NULL errors
 */
export async function init() {
  const db = await openDb();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT NOT NULL,
      device_id TEXT NOT NULL,
      timestamp TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  // optional indexes for faster queries
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp);`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_attendance_device ON attendance(device_id);`);

  console.log("✅ Database initialized.");
}

/* -------------------------
   Attendance helpers
   ------------------------- */

export async function insertRecord(barcode, device_id = "unknown") {
  const db = await openDb();
  const result = await db.run(
    "INSERT INTO attendance (barcode, device_id) VALUES (?, ?)",
    [barcode, device_id]
  );
  return db.get("SELECT * FROM attendance WHERE id = ?", [result.lastID]);
}

/**
 * Get most recent records
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getRecent(limit = 100) {
  const db = await openDb();
  return db.all(
    "SELECT * FROM attendance ORDER BY timestamp DESC LIMIT ?",
    [limit]
  );
}

/* -------------------------
   User helpers (for auth)
   ------------------------- */

/**
 * Create a user (username must be unique)
 * Returns the created user (id, username, role, created_at) — NOT password_hash
 */
export async function createUser(username, password_hash, role = "user") {
  const db = await openDb();
  const res = await db.run(
    "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
    [username, password_hash, role]
  );
  return db.get("SELECT id, username, role, created_at FROM users WHERE id = ?", [res.lastID]);
}

export async function getUserByUsername(username) {
  const db = await openDb();
  return db.get("SELECT * FROM users WHERE username = ?", [username]); // includes password_hash
}

export async function getUsers(limit = 200) {
  const db = await openDb();
  return db.all("SELECT id, username, role, created_at FROM users ORDER BY id DESC LIMIT ?", [limit]);
}

/* -------------------------
   Utility / stats / devices
   ------------------------- */

export async function getDevices() {
  const db = await openDb();
  return db.all("SELECT DISTINCT device_id FROM attendance ORDER BY device_id");
}

/**
 * Return stats object, e.g. { total: X, total_today: Y }
 */
export async function getStats() {
  const db = await openDb();
  const totalRow = await db.get("SELECT COUNT(*) AS total FROM attendance");
  const todayRow = await db.get(
    "SELECT COUNT(*) AS total_today FROM attendance WHERE date(timestamp) = date('now','localtime')"
  );
  const weekRow = await db.get(
    "SELECT COUNT(*) AS total_week FROM attendance WHERE date(timestamp) >= date('now','-7 days','localtime')"
  );
  const uniqueToday = await db.get(
    "SELECT COUNT(DISTINCT barcode) AS unique_today FROM attendance WHERE date(timestamp) = date('now','localtime')"
  );
  const activeDevice = await db.get(`
    SELECT device_id, COUNT(*) AS cnt
    FROM attendance
    WHERE date(timestamp) >= date('now','-1 days','localtime')
    GROUP BY device_id
    ORDER BY cnt DESC
    LIMIT 1
  `);

  return {
    total: totalRow?.total || 0,
    total_today: todayRow?.total_today || 0,
    total_week: weekRow?.total_week || 0,
    unique_today: uniqueToday?.unique_today || 0,
    most_active_device: activeDevice?.device_id || "N/A",
  };
}

/* -------------------------
   User management helpers
   ------------------------- */

/**
 * Update user's password
 * @param {string} username - user whose password to change
 * @param {string} new_hash - already-hashed password
 */
export async function updatePassword(username, new_hash) {
  const db = await openDb();
  const result = await db.run(
    "UPDATE users SET password_hash = ? WHERE username = ?",
    [new_hash, username]
  );
  return result.changes > 0; // returns true if password updated
}

/**
 * Delete a user (cannot delete self ideally)
 * @param {string} username
 */
export async function deleteUser(username) {
  const db = await openDb();
  const result = await db.run("DELETE FROM users WHERE username = ?", [username]);
  return result.changes > 0; // true if deleted
}

export default {
  openDb,
  init,
  insertRecord,
  getRecent,
  createUser,
  getUserByUsername,
  getUsers,
  updatePassword,
  deleteUser,
  getDevices,
  getStats,
};
