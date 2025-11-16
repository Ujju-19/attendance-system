import React, { useEffect } from "react";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
const DEVICE_SECRET = import.meta.env.VITE_DEVICE_SECRET || "projectbar2006";

export default function BarcodeScanner() {
  useEffect(() => {
    let scanner;

    async function initScanner() {
      try {
        const { Html5QrcodeScanner } = await import("html5-qrcode");

        scanner = new Html5QrcodeScanner(
          "reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          false
        );

        scanner.render(onScanSuccess, onScanError);
      } catch (err) {
        console.error("❌ Failed to init scanner:", err);
      }
    }

    async function onScanSuccess(decodedText) {
      console.log("✅ Correct Scan:", decodedText);
      try {
        const res = await fetch(`${BACKEND}/api/attendance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            barcode: decodedText,
            device_id: "mobile_scanner",
            secret: DEVICE_SECRET,
          }),
        });
        const data = await res.json();
        console.log("📤 Sent to backend:", data);
      } catch (err) {
        console.error("❌ Failed to send:", err);
      }
    }

    function onScanError(err) {
      // ignore errors
    }

    initScanner();

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, []);

  return (
    <div
      id="reader"
      style={{
        width: "100%",
        maxWidth: 400,
        margin: "40px auto",
        display: "flex",
        justifyContent: "center",
      }}
    ></div>
  );
}
