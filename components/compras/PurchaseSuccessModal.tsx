"use client";

import React from "react";
import { CheckCircle, MessageSquare } from "lucide-react";
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/formatCurrency";
import type { Purchase } from "@/types";

interface PurchaseSuccessModalProps {
  purchase: Purchase | null;
  supplierPhone: string;
  onGoToPurchases: () => void;
  onMarkAsOrdered: () => void;
  onSendWhatsApp: () => void;
}

const PurchaseSuccessModal: React.FC<PurchaseSuccessModalProps> = ({
  purchase,
  supplierPhone,
  onGoToPurchases,
  onMarkAsOrdered,
  onSendWhatsApp,
}) => {
  if (!purchase) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-muted text-foreground rounded-lg shadow-xl w-full max-w-lg m-4 p-6">
        <h3 className="text-lg font-semibold mb-1">¡Compra #{purchase.id} registrada!</h3>
        <p className="text-sm text-foreground-muted mb-4">
          {supplierPhone
            ? '¿Querés enviar el pedido al proveedor por WhatsApp?'
            : 'El proveedor no tiene teléfono registrado. Podés ver la compra en el historial.'}
        </p>

        <div className="bg-background rounded-lg border border-border p-4 mb-4 max-h-48 overflow-y-auto text-sm">
          {purchase.items.map((item, i) => (
            <div key={i} className="flex justify-between py-1">
              <span>{item.product?.name || `#${item.productId}`}</span>
              <span className="font-medium">x{item.quantity}</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 mt-2 border-t border-border font-bold">
            <span>Total</span>
            <span>{formatCurrency(purchase.totalAmount)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onGoToPurchases}>
            Ir a Compras
          </Button>
          <Button type="button" variant="primary" onClick={onMarkAsOrdered}>
            <CheckCircle size={16} className="mr-2" />
            Marcar como Enviada
          </Button>
          {supplierPhone && (
            <Button type="button" variant="whatsapp" onClick={onSendWhatsApp}>
              <MessageSquare size={16} className="mr-2" />
              Enviar Pedido (WhatsApp)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseSuccessModal;
