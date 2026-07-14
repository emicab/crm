"use client";

import React, { useState } from "react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import type { Seller } from "@/types";

interface CajaModalProps {
  isOpen: boolean;
  sellers: Seller[];
  isOpening: boolean;
  onOpen: (sellerId: string, initialBalance: string) => void;
  onCancel: () => void;
}

const CajaModal: React.FC<CajaModalProps> = ({ isOpen, sellers, isOpening, onOpen, onCancel }) => {
  const [sellerId, setSellerId] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-muted text-foreground rounded-lg shadow-xl w-full max-w-md m-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-1">No tenés una caja abierta</h3>
        <p className="text-sm text-foreground-muted mb-4">
          Para registrar una venta necesitás tener una caja abierta. Seleccioná el vendedor y el saldo inicial.
        </p>
        <div className="space-y-4">
          <Select label="Vendedor *" value={sellerId} onChange={(e) => setSellerId(e.target.value)} required>
            <option value="">Selecciona un vendedor</option>
            {sellers.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
          </Select>
          <Input label="Saldo Inicial ($)" type="number" step="0.01" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isOpening}>Cancelar</Button>
          <Button type="button" variant="primary" onClick={() => onOpen(sellerId, initialBalance)} disabled={isOpening || !sellerId}>
            {isOpening ? 'Abriendo...' : 'Abrir Caja'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CajaModal;
