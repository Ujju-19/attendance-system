import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { apiFetch } from "../utils/api.js";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function LiveTable() {
  const [records, setRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [devices, setDevices] = useState([]);
  const [deviceFilter, setDeviceFilter] = useState("");
  const [stats, setStats] = useState({ total_today: 0 });
  const [newScan, setNewScan] = useState(false);
  const socketRef = useRef(null);

  /* --- Helper: Format date to DD-MM-YYYY HH:mm:ss --- */
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  };

  /* --- Fetch attendance records --- */
  const loadRecords = async (date = "", device = "") => {
    try {
      const params = [];
      if (date) params.push(`date=${encodeURIComponent(date)}`);
      if (device) params.push(`device=${encodeURIComponent(device)}`);
      const query = params.length ? `?${params.join("&")}` : "";
      const data = await apiFetch(`/api/attendance${query}`);
      setRecords(data || []);
    } catch (err) {
      console.error("loadRecords error:", err);
    }
  };

  /* --- Fetch devices and stats --- */
  const loadDevices = async () => {
    try {
      const data = await apiFetch("/api/devices");
      setDevices(data || []);
    } catch (err) {
      console.error("loadDevices error:", err);
    }
  };

  const loadStats = async () => {
    try {
      const data = await apiFetch("/api/stats");
      setStats(data || { total_today: 0 });
    } catch (err) {
      console.error("loadStats error:", err);
    }
  };

  /* --- Setup socket --- */
  useEffect(() => {
    loadRecords();
    loadDevices();
    loadStats();

    if (!socketRef.current) {
      socketRef.current = io(BACKEND);

      socketRef.current.on("new-scan", (rec) => {
        const today = new Date().toISOString().split("T")[0];
        const matchesDate = !selectedDate || selectedDate === today;
        const matchesDevice = !deviceFilter || deviceFilter === rec.device_id;

        if (matchesDate && matchesDevice) {
          setRecords((prev) => [rec, ...prev].slice(0, 200));
        }

        setNewScan(true);
        setTimeout(() => setNewScan(false), 2000);
      });
    }

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  /* --- Filter changes --- */
  useEffect(() => {
    loadRecords(selectedDate, deviceFilter);
  }, [selectedDate, deviceFilter]);

  const applyFilter = () => {
    loadRecords(selectedDate, deviceFilter);
  };

  const clearFilter = () => {
    setSelectedDate("");
    setDeviceFilter("");
    loadRecords();
    loadStats();
  };

  /* --- CSV Export --- */
  const downloadCSV = () => {
    if (!records.length) {
      alert("No records to export.");
      return;
    }

    const safeDate = selectedDate || new Date().toISOString().split("T")[0];
    const safeDevice = deviceFilter || "all";

    const header = "Timestamp,Barcode,Device\n";
    const rows = records
      .map(
        (r) =>
          `${formatDate(r.timestamp)},${r.barcode},${r.device_id}`
      )
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${safeDate}_${safeDevice}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* --- Render UI --- */
  return (
    <div className="main-container">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <h2>📊 Attendance Dashboard</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ color: "#aaa" }}>{records.length} records</div>
            <div
              style={{
                padding: "4px 10px",
                borderRadius: 8,
                fontSize: 13,
                background: newScan ? "#003f3f" : "#1b1b1b",
                color: newScan ? "#00ffdd" : "#aaa",
                transition: "all 0.2s ease",
              }}
            >
              {newScan ? "New Scan!" : "Live"}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
          >
            <option value="">All Devices</option>
            {devices.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <button className="btn-primary" onClick={applyFilter}>
            Apply
          </button>
          <button className="btn-danger" onClick={clearFilter}>
            Clear
          </button>
          <button className="btn-secondary" onClick={downloadCSV}>
            Export CSV
          </button>

          <div style={{ marginLeft: "auto", color: "#9aa", fontSize: 14 }}>
            Total Today: {stats.total_today || 0}
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Barcode</th>
                <th>Device</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    style={{
                      textAlign: "center",
                      padding: 14,
                      color: "#888",
                    }}
                  >
                    No records found
                  </td>
                </tr>
              ) : (
                records.map((r, i) => (
                  <tr key={r.id || `${r.timestamp}-${i}`}>
                    <td>{formatDate(r.timestamp)}</td>
                    <td style={{ fontFamily: "monospace" }}>{r.barcode}</td>
                    <td>{r.device_id}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
