'use client';

import React from 'react';

interface ArcaWizardStepperProps {
  step: 1 | 2 | 3;
}

export default function ArcaWizardStepper({ step }: ArcaWizardStepperProps) {
  return (
    <div className="bg-muted/20 px-6 py-3.5 border-b border-border flex justify-between items-center text-sm font-semibold">
      <div className={`flex items-center gap-2.5 ${step >= 1 ? 'text-primary' : 'text-foreground-muted'}`}>
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground-muted'}`}>1</span>
        <span>Generar Solicitud</span>
      </div>
      <div className="w-10 h-px bg-border" />
      <div className={`flex items-center gap-2.5 ${step >= 2 ? 'text-primary' : 'text-foreground-muted'}`}>
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground-muted'}`}>2</span>
        <span>Tramitar en AFIP</span>
      </div>
      <div className="w-10 h-px bg-border" />
      <div className={`flex items-center gap-2.5 ${step >= 3 ? 'text-primary' : 'text-foreground-muted'}`}>
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground-muted'}`}>3</span>
        <span>Subir Certificado</span>
      </div>
    </div>
  );
}
