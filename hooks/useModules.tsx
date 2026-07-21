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
  plan: 'basico' | 'pro';
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

const ModuleContext = createContext<ModuleContextType | undefined>(undefined);

export const ModuleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tier, isPro, isFree, isLoading: licenseLoading } = useLicense();
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const [businessProfile, setBusinessProfile] = useState<string>("general");
  const [storageMode, setStorageMode] = useState<string>("local");
  const [plan, setPlan] = useState<'basico' | 'pro'>("basico");
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
      
      const isProPlan = data.app_plan === 'pro' || data.plan_type === 'pro' || data.unlocked_plan_pro === 'true' || data.storage_mode === 'seguro';
      setPlan(isProPlan ? 'pro' : 'basico');

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
      // Módulos exclusivos del Plan Pro
      if (['cuenta_corriente', 'analiticas', 'roles', 'backup_nube'].includes(moduleId)) {
        return plan === 'pro';
      }
      // Venta fraccionada según Rubro
      if (moduleId === 'venta_fraccionada') {
        if (modules['venta_fraccionada'] !== undefined) return modules['venta_fraccionada'];
        return ['fiambreria', 'verduleria', 'panaderia', 'carniceria', 'granel'].includes(businessProfile);
      }
      // Módulos básicos (Ventas, Caja, Stock, Clientes, ARCA, Gastos, Vendedores, Compras, Combos)
      return true;
    },
    [plan, modules, businessProfile]
  );

  return (
    <ModuleContext.Provider
      value={{
        isModuleEnabled, modules, businessProfile, storageMode, plan,
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
