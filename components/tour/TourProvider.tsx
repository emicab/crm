"use client";

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { tourSteps } from './tourSteps';
import type { TourStep } from './tourSteps';

const COMPLETED_KEY = 'tour-completed';
const STEP_KEY = 'tour-step-index';

function getStepsForRoute(currentRoute: string, startIndex: number): TourStep[] {
  const result: TourStep[] = [];
  for (let i = startIndex; i < tourSteps.length; i++) {
    const step = tourSteps[i];
    if (step.route === currentRoute) {
      result.push(step);
    } else if (result.length > 0) {
      break;
    }
  }
  return result;
}

function findNextRoute(afterIndex: number): string | null {
  for (let i = afterIndex; i < tourSteps.length; i++) {
    if (i > afterIndex && tourSteps[i].route !== tourSteps[afterIndex].route) {
      return tourSteps[i].route;
    }
  }
  return null;
}

export default function TourProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const completedCleanlyRef = useRef(false);

  useEffect(() => {
    const done = localStorage.getItem(COMPLETED_KEY);
    if (done) return;

    const savedStep = parseInt(localStorage.getItem(STEP_KEY) || '0', 10);
    const stepsHere = getStepsForRoute(pathname || '', savedStep);
    if (stepsHere.length === 0) return;

    completedCleanlyRef.current = false;

    const driverObj = driver({
      showProgress: true,
      allowClose: true,
      steps: stepsHere.map((s) => ({
        element: s.element,
        popover: s.popover,
      })),
      onDoneClick: () => {
        completedCleanlyRef.current = true;
      },
      onDestroyed: () => {
        const lastGlobalIndex = savedStep + stepsHere.length - 1;

        if (!completedCleanlyRef.current) {
          localStorage.setItem(COMPLETED_KEY, 'true');
          localStorage.removeItem(STEP_KEY);
          return;
        }

        if (lastGlobalIndex >= tourSteps.length - 1) {
          localStorage.setItem(COMPLETED_KEY, 'true');
          localStorage.removeItem(STEP_KEY);
          return;
        }

        const nextRoute = findNextRoute(lastGlobalIndex + 1);
        if (nextRoute && nextRoute !== pathname) {
          localStorage.setItem(STEP_KEY, (lastGlobalIndex + 1).toString());
          router.push(nextRoute);
        }
      },
    });

    driverRef.current = driverObj;
    driverObj.drive();

    return () => {
      try { driverObj.destroy(); } catch { /* ignore */ }
    };
  }, [pathname, router]);

  return <>{children}</>;
}
