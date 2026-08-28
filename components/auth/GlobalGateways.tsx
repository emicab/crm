"use client";

import React, { useState, useEffect } from "react";
import { useModules } from "@/hooks/useModules";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import PinLoginModal from "@/components/auth/PinLoginModal";
import BusinessPickerModal from "@/components/auth/BusinessPickerModal";

export default function GlobalGateways() {
  const { businessProfile, isLoading, isModuleEnabled, currentUser, loginUser } = useModules();
  const [pickerOpen, setPickerOpen] = useState(false);

  // Detectar multi-negocio al iniciar: si hay 2+ negocios y esta sesión aún no
  // confirmó cuál usar, mostramos el selector.
  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const count = (data.profiles || []).length;
        const acked =
          typeof window !== "undefined"
            ? localStorage.getItem("clinpos_active_business_ack")
            : null;
        if (count >= 2 && (!data.activeProfileId || acked !== data.activeProfileId)) {
          setPickerOpen(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = () => setPickerOpen(true);
    window.addEventListener("open-business-picker", handler);
    return () => window.removeEventListener("open-business-picker", handler);
  }, []);

  const showPicker = pickerOpen;
  const showOnboarding = !showPicker && !isLoading && businessProfile === "unset";
  const showPinLock =
    !showPicker && !isLoading && !showOnboarding && isModuleEnabled("roles") && !currentUser;

  return (
    <>
      <BusinessPickerModal isOpen={showPicker} onClose={() => setPickerOpen(false)} />
      <OnboardingModal isOpen={showOnboarding} onClose={() => {}} />
      <PinLoginModal isOpen={showPinLock} onLoginSuccess={loginUser} />
    </>
  );
}
