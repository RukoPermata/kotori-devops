"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface SafariNavigator extends Navigator {
  standalone?: boolean;
}
export function InstallPromptButton({ language = "ID" }: { language?: "ID" | "EN" }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect if running in standalone mode (already installed as PWA)
    const nav = window.navigator as SafariNavigator;
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      nav.standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  if (isInstalled || !deferredPrompt) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <button
      onClick={handleInstall}
      aria-label="Install App"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        borderRadius: "10px",
        backgroundColor: "var(--kb-primary)",
        color: "#ffffff",
        fontSize: "12px",
        fontWeight: 700,
        border: "none",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(99, 102, 241, 0.25)",
        transition: "all 0.15s ease",
      }}
      title={language === "ID" ? "Pasang aplikasi Kotori ke perangkat Anda" : "Install Kotori app on your device"}
    >
      <Download style={{ width: "13px", height: "13px" }} />
      <span>{language === "ID" ? "Pasang Aplikasi" : "Install App"}</span>
    </button>
  );
}
