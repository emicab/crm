"use client";

import { useState, useEffect, useCallback } from "react";

// Estado de conectividad + operaciones pendientes del outbox para el banner offline.
export function useSyncStatus() {
  const [online, setOnline] = useState<boolean>(true);
  const [pendingSync, setPendingSync] = useState<number>(0);
  const [lastSync, setLastSync] = useState<string>("");

  useEffect(() => {
    const isOnline = () =>
      typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
        ? navigator.onLine
        : true;
    setOnline(isOnline());

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/sync/status");
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.pendingSync === "number") setPendingSync(data.pendingSync);
      if (typeof data.lastSync === "string") setLastSync(data.lastSync);
    } catch {
      // sin red: mantener estado actual
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 60000);
    const onSyncCompleted = () => refreshStatus();
    window.addEventListener("sync-completed", onSyncCompleted);
    return () => {
      clearInterval(interval);
      window.removeEventListener("sync-completed", onSyncCompleted);
    };
  }, [refreshStatus]);

  return { online, pendingSync, lastSync, refreshStatus };
}
