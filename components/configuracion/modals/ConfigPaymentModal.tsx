'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface ConfigPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentItem: {
    key: string;
    name: string;
    price: number;
    callback?: () => void;
  } | null;
  onSuccessPayload: (payload: Record<string, string>) => void;
}

export default function ConfigPaymentModal({
  isOpen,
  onClose,
  paymentItem,
  onSuccessPayload,
}: ConfigPaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'mp' | 'card'>('mp');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  if (!isOpen || !paymentItem) return null;

  const handleConfirmPayment = async () => {
    setIsProcessingPayment(true);
    
    // Simular retraso de pasarela de pago (1.5 segundos)
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    try {
      const unlockKey = paymentItem.key;
      const bodyPayload: Record<string, string> = {
        [unlockKey]: 'true',
      };

      if (unlockKey === 'unlocked_plan_seguro') {
        bodyPayload.storage_mode = 'seguro';
      }

      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      if (!res.ok) throw new Error();
      
      toast.success(`¡Pago aprobado! Desbloqueado: ${paymentItem.name}`);
      onSuccessPayload(bodyPayload);
      onClose();

      if (paymentItem.callback) {
        paymentItem.callback();
      }
    } catch {
      toast.error('Error al procesar el pago ficticio.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 text-center">
        
        {/* Header / Logo de MP */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Pasarela de Pago Segura</span>
          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">Simulación</span>
        </div>

        <div className="space-y-2 py-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-foreground">Activar {paymentItem.name}</h3>
          <p className="text-xs text-foreground-muted">
            Para desbloquear este módulo e integrarlo a tu comercio de forma permanente, por favor realiza el pago simulado.
          </p>
        </div>

        {/* Factura / Precio */}
        <div className="bg-slate-50 border border-border rounded-xl p-4 space-y-2 text-xs text-left">
          <div className="flex justify-between font-medium">
            <span className="text-foreground-muted">Detalle:</span>
            <span className="text-foreground">{paymentItem.name}</span>
          </div>
          <div className="flex justify-between border-t border-border/60 pt-2 font-bold text-sm">
            <span className="text-foreground-muted">Total a Pagar:</span>
            <span className="text-primary font-mono">${paymentItem.price.toLocaleString("es-AR", { minimumFractionDigits: 2 })} ARS</span>
          </div>
        </div>

        {/* Método de Pago */}
        <div className="space-y-2.5 text-xs text-left">
          <span className="font-bold text-foreground block">Método de Pago Ficticio:</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod("mp")}
              className={`p-3 rounded-xl border text-center transition-all ${
                paymentMethod === "mp"
                  ? "border-primary bg-primary/5 ring-1 ring-primary font-semibold text-primary"
                  : "border-border bg-white text-foreground-muted hover:border-foreground-muted"
              }`}
            >
              Mercado Pago (Simulado)
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("card")}
              className={`p-3 rounded-xl border text-center transition-all ${
                paymentMethod === "card"
                  ? "border-primary bg-primary/5 ring-1 ring-primary font-semibold text-primary"
                  : "border-border bg-white text-foreground-muted hover:border-foreground-muted"
              }`}
            >
              Tarjeta Crédito (Simulada)
            </button>
          </div>
        </div>

        {/* Acciones */}
        <div className="pt-4 border-t border-border flex justify-end gap-2 text-xs">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            disabled={isProcessingPayment}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirmPayment}
            disabled={isProcessingPayment}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            {isProcessingPayment ? "Aprobando transacción..." : "Realizar Pago Simulado"}
          </Button>
        </div>

      </div>
    </div>
  );
}
