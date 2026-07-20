"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useLicense, type LicenseTier } from "@/hooks/useLicense";

export interface UserSession {
  id: number;
  name: string;
  role: string;
}

interface ModuleContextType {
  isModuleEnabled: (moduleId: string) => boolean;
  modules: Record<string, boolean>;
  businessProfile: string;
  storageMode: string;
  isLoading: boolean;
  refresh: () => Promise<void>;
  currentUser: UserSession | null;
  loginUser: (user: UserSession) => void;
  logout: () => void;
  supabaseLastSync: string;
  hasSupabaseConfig: boolean;
  tier: LicenseTier;
  isPro: boolean;
  isFree: boolean;
}

const FREE_MODULES = new Set([
  'productos', 'ventas', 'caja', 'stock_alertas', 'dashboard',
  'roles', 'venta_fraccionada', 'exportar_csv', 'clientes_basico',
]);

const PRO_MODULES = new Set([
  'productos', 'ventas', 'caja', 'stock_alertas', 'dashboard',
  'clientes', 'vendedores', 'combos_promociones', 'compras',
  'analiticas', 'roles', 'cuenta_corriente', 'venta_fraccionada',
  'whatsapp', 'exportar_csv', 'backup', 'clientes_basico',
]);

const ModuleContext = createContext<ModuleContextType | undefined>(undefined);

export const ModuleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tier, isPro, isFree, isLoading: licenseLoading } = useLicense();
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const [businessProfile, setBusinessProfile] = useState<string>("custom");
  const [storageMode, setStorageMode] = useState<string>("local");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [supabaseLastSync, setSupabaseLastSync] = useState<string>("");
  const [hasSupabaseConfig, setHasSupabaseConfig] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("clinpos-user");
      if (stored) {
        try { setCurrentUser(JSON.parse(stored)); } catch { localStorage.removeItem("clinpos-user"); }
      }
    }
  }, []);

  const loginUser = (user: UserSession) => {
    setCurrentUser(user);
    localStorage.setItem("clinpos-user", JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("clinpos-user");
  };

  const fetchModules = useCallback(async () => {
    try {
      const res = await fetch("/api/config");
      if (!res.ok) throw new Error("Error fetching config");
      const data = await res.json();

      const parsedModules: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(data)) {
        if (key.startsWith("module_")) {
          const moduleId = key.replace("module_", "");
          parsedModules[moduleId] = value === "true";
        }
      }
      setModules(parsedModules);
      if (data.business_profile) setBusinessProfile(data.business_profile);
      if (data.storage_mode) setStorageMode(data.storage_mode);
      setSupabaseLastSync(data.supabase_last_sync || "");
      setHasSupabaseConfig(!!data.supabase_url && !!data.supabase_anon_key);
    } catch (error) {
      console.error("Error loading modules context:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  useEffect(() => {
    if (!licenseLoading) setIsLoading(false);
  }, [licenseLoading]);

  const isModuleEnabled = useCallback(
    (moduleId: string) => {
      return true;
    },
    []
  );

  return (
    <ModuleContext.Provider
      value={{
        isModuleEnabled, modules, businessProfile, storageMode,
        isLoading, refresh: fetchModules, currentUser, loginUser, logout,
        supabaseLastSync, hasSupabaseConfig, tier, isPro, isFree,
      }}
    >
      {children}
    </ModuleContext.Provider>
  );
};

export const useModules = () => {
  const context = useContext(ModuleContext);
  if (context === undefined) {
    throw new Error("useModules must be used within a ModuleProvider");
  }
  return context;
};
