"use client";

import React from "react";
import { useModules } from "@/hooks/useModules";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import PinLoginModal from "@/components/auth/PinLoginModal";

export default function GlobalGateways() {
  const { businessProfile, isLoading, isModuleEnabled, currentUser, loginUser } = useModules();

  // Si la configuración cargó y no hay rubro configurado, mostramos onboarding bloqueante
  const showOnboarding = !isLoading && businessProfile === "unset";

  // Si el módulo de roles está activo y no hay sesión iniciada, mostramos bloqueo de PIN
  const showPinLock = !isLoading && !showOnboarding && isModuleEnabled("roles") && !currentUser;

  return (
    <>
      <OnboardingModal isOpen={showOnboarding} onClose={() => {}} />
      <PinLoginModal isOpen={showPinLock} onLoginSuccess={loginUser} />
    </>
  );
}
