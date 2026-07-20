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
      if (typeof window !== 'undefined' && window.licenseAPI) {
        try {
          const result = await window.licenseAPI.check();
          setTier(result.tier === 'free' ? 'free' : 'pro');
        } catch {
          setTier('pro');
        }
      } else {
        setTier('pro');
      }
      setIsLoading(false);
    };
    check();
  }, []);

  return { tier, isPro: tier === 'pro', isFree: tier === 'free', isLoading };
}
