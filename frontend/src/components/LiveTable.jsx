import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { apiFetch } from "../utils/api.js";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function LiveTable() {
  const [records, setRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [devices, setDevices] = useState([]);
  const [deviceFilter, setDeviceFilter] = useState("");
  const [stats, setStats] = useState({});
  const [newScan, setNewScan] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlighted, setHighlighted] = useState(null);
  const socketRef = useRef(null);
  const audioRef = useRef(new Audio("/beep.mp3"));

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

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

  const loadDevices = async () => {
    const data = await apiFetch("/api/devices");
    setDevices(data || []);
  };

  const loadStats = async () => {
    const data = await apiFetch("/api/stats");
    setStats(data || {});
  };

  /* Socket + Initialization */
  useEffect(() => {
    loadRecords();
    loadDevices();
    loadStats();

    socketRef.current = io(BACKEND);

    socketRef.current.on("new-scan", (rec) => {
      setRecords((prev) => [rec, ...prev].slice(0, 200));

      setHighlighted(rec.timestamp);
      setTimeout(() => setHighlighted(null), 2000);

      try {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      } catch {}

      setNewScan(true);
      setTimeout(() => setNewScan(false), 2000);
    });

    return () => socketRef.current.disconnect();
  }, []);

  useEffect(() => {
    loadRecords(selectedDate, deviceFilter);
  }, [selectedDate, deviceFilter]);

  const clearFilter = () => {
    setSelectedDate("");
    setDeviceFilter("");
    setSearchQuery("");
    loadRecords();
    loadStats();
  };

  const downloadCSV = () => {
    if (!records.length) return alert("No records to export.");
    const header = "Timestamp,Barcode,Device\n";
    const rows = records
      .map((r) => `${formatDate(r.timestamp)},${r.barcode},${r.device_id}`)
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance_export.csv";
    a.click();
  };

  return (
    <div className="main-container">
      <div className="dashboard-container">

        {/* ✅ CLEAN CENTER HEADER */}
        <div className="dashboard-header flex flex-col items-center text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-cyan-400">
            Attendance Dashboard
          </h2>

          <div className="flex items-center gap-3 text-gray-400 text-sm">
            <div>{records.length} Records</div>
            <div
              className={`px-3 py-1 rounded-md ${
                newScan ? "bg-cyan-700 text-cyan-100" : "bg-gray-800 text-gray-500"
              }`}
            >
              {newScan ? "New Scan!" : "Live"}
            </div>
          </div>
        </div>

        {/* ✅ FILTER BAR */}
        <div className="filter-bar">
          <input
            type="text"
            placeholder="Search…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
          />

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
              <option key={d}>{d}</option>
            ))}
          </select>

          <button className="btn-danger" onClick={clearFilter}>
            Clear
          </button>

          <button className="btn-secondary" onClick={downloadCSV}>
            Export CSV
          </button>
        </div>

        {/* ✅ TABLE */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th className="text-base">Time</th>
                <th className="text-base">Barcode</th>
                <th className="text-base">Device</th>
              </tr>
            </thead>

            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center text-gray-500 py-6">
                    No records found
                  </td>
                </tr>
              ) : (
                records
                  .filter(
                    (r) =>
                      !searchQuery ||
                      r.barcode?.toLowerCase().includes(searchQuery) ||
                      r.device_id?.toLowerCase().includes(searchQuery)
                  )
                  .map((r, i) => (
                    <tr
                      key={r.id || `${i}-${r.timestamp}`}
                      className={
                        highlighted === r.timestamp ? "bg-cyan-900/30" : ""
                      }
                    >
                      <td>{formatDate(r.timestamp)}</td>
                      <td className="font-mono">{r.barcode}</td>
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
