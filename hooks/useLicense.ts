"use client";

import { useState, useEffect } from 'react';

export type LicenseTier = 'free' | 'pro';

interface LicenseState {
  tier: LicenseTier;
  isPro: boolean;
  isFree: boolean;
  isLoading: boolean;
}

export function useLicense(): LicenseState {
  const [tier, setTier] = useState<LicenseTier>('pro');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const config = await res.json();
          setTier(config.app_plan === 'pro' || config.unlocked_plan_pro === 'true' ? 'pro' : 'free');
        } else {
          setTier('free');
        }
      } catch {
        setTier('free');
      }
      setIsLoading(false);
    };
    check();
  }, []);

  return { tier, isPro: tier === 'pro', isFree: tier === 'free', isLoading };
}
