"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

export function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [justCameOnline, setJustCameOnline] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setJustCameOnline(true);
      setShowBanner(true);

      const timer = setTimeout(() => {
        setShowBanner(false);
        setJustCameOnline(false);
      }, 3500);

      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setJustCameOnline(false);
      setShowBanner(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check: if already offline on load
    if (!navigator.onLine) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={() => setShowBanner(false)}
      style={{
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 16px",
        borderRadius: "9999px",
        backgroundColor: justCameOnline
          ? "rgba(22, 101, 52, 0.95)"
          : "rgba(30, 41, 59, 0.95)",
        color: "#ffffff",
        border: `1px solid ${justCameOnline ? "rgba(34, 197, 94, 0.4)" : "rgba(234, 179, 8, 0.4)"}`,
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        fontSize: "12px",
        fontWeight: 600,
        cursor: "pointer",
        userSelect: "none",
        animation: "fadeIn 0.2s ease-out",
        transition: "all 0.3s ease",
      }}
      title="Klik untuk menyembunyikan pemberitahuan"
    >
      {justCameOnline ? (
        <>
          <Wifi style={{ width: "15px", height: "15px", color: "#4ade80" }} />
          <span>Koneksi kembali online</span>
        </>
      ) : (
        <>
          <WifiOff style={{ width: "15px", height: "15px", color: "#facc15" }} />
          <span>Mode Offline • Membaca buku tetap lancar tanpa internet</span>
        </>
      )}
    </div>
  );
}
