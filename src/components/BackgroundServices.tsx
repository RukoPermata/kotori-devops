"use client";

import { useEffect } from "react";
import { DictionaryPrewarmer } from "@/components/DictionaryPrewarmer";
import { WebMcpTools } from "@/components/WebMcpTools";
import { NetworkStatusBanner } from "@/components/NetworkStatusBanner";

function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            // Auto-check for updates
            reg.update();
          })
          .catch((err) => {
            console.warn("[SW] Registration error:", err);
          });
      });
    }
  }, []);
  return null;
}

export function BackgroundServices() {
  return (
    <>
      <ServiceWorkerRegister />
      <NetworkStatusBanner />
      <DictionaryPrewarmer />
      <WebMcpTools />
    </>
  );
}
