"use client";

import React, { useState, useMemo } from "react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import { X, Loader2, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatCurrency } from "@/lib/formatCurrency";
import toast from "react-hot-toast";
import type { Supplier } from "@/types";

interface AlertProduct {
  id: number;
  name: string;
  quantityStock: number;
  stockMinAlert: number | null;
  pricePurchase: number | null;
  unitType: string | null;
  supplier?: { id: number; name: string } | null;
}

interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  purchasePrice: number;
}

interface CreatePurchaseModalProps {
  isOpen: boolean;
  products: AlertProduct[];
  suppliers: Supplier[];
  onClose: () => void;
  onSuccess: () => void;
  activePurchaseId?: number | null;
}

const CreatePurchaseModal: React.FC<CreatePurchaseModalProps> = ({
  isOpen, products, suppliers, onClose, onSuccess, activePurchaseId,
}) => {
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const commonSupplierId = useMemo(() => {
    const ids = products.map(p => p.supplier?.id).filter(Boolean) as number[];
    if (ids.length === 0) return null;
    return ids.every(id => id === ids[0]) ? String(ids[0]) : null;
  }, [products]);

  // Sincronizar ítems, notas y proveedor cuando se abre el modal
  React.useEffect(() => {
    if (isOpen) {
      setItems(
        products.map(p => ({
          productId: p.id,
          productName: p.name,
          quantity: Math.max(1, (p.stockMinAlert ?? 0) - p.quantityStock),
          purchasePrice: p.pricePurchase ?? 0,
        }))
      );
      setSupplierId(commonSupplierId || "");
      setNotes("");
    }
  }, [isOpen, products, commonSupplierId]);

  const filteredSuppliers = useMemo(() => {
    const productSupplierIds = new Set(products.map(p => p.supplier?.id).filter(Boolean));
    if (productSupplierIds.size === 0) return suppliers;
    return suppliers.filter(s => productSupplierIds.has(s.id));
  }, [products, suppliers]);

  const total = useMemo(() =>
    items.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0),
    [items]
  );

  const handleQuantityChange = (productId: number, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return;
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity: num } : i));
  };

  const handlePriceChange = (productId: number, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return;
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, purchasePrice: num } : i));
  };

  const handleSubmit = async () => {
    if (!supplierId) { toast.error("Seleccioná un proveedor."); return; }
    const validItems = items.filter(i => i.quantity > 0);
    if (validItems.length === 0) { toast.error("Agregá al menos un producto con cantidad > 0."); return; }

    setIsSubmitting(true);
    try {
      const url = activePurchaseId ? `/api/compras/${activePurchaseId}` : "/api/compras";
      const method = activePurchaseId ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: parseInt(supplierId),
          status: "ORDERED",
          notes: notes.trim() || null,
          items: validItems.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            purchasePrice: i.purchasePrice,
          })),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Error al ${activePurchaseId ? 'actualizar' : 'crear'} la orden de compra.`);
      }
      toast.success(activePurchaseId ? "¡Orden de compra actualizada con éxito!" : "¡Orden de compra creada exitosamente!");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-muted rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <ShoppingCart size={20} className="text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Nueva Orden de Compra</h2>
              </div>
              <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-border transition-colors text-foreground-muted hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <Select
                label="Proveedor *"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
              >
                <option value="">Seleccionar proveedor...</option>
                {(commonSupplierId ? filteredSuppliers : suppliers).map(s => (
                  <option key={s.id} value={String(s.id)}>{s.name}</option>
                ))}
              </Select>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="p-2 text-xs font-semibold text-foreground-muted">Producto</th>
                      <th className="p-2 text-xs font-semibold text-foreground-muted text-center">Stock</th>
                      <th className="p-2 text-xs font-semibold text-foreground-muted text-center">Mín</th>
                      <th className="p-2 text-xs font-semibold text-foreground-muted text-center">Cantidad</th>
                      <th className="p-2 text-xs font-semibold text-foreground-muted text-center">Precio</th>
                      <th className="p-2 text-xs font-semibold text-foreground-muted text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => {
                      const product = products.find(p => p.id === item.productId);
                      return (
                        <tr key={item.productId} className="border-b border-border/50">
                          <td className="p-2 text-sm text-foreground font-medium">{item.productName}</td>
                          <td className="p-2 text-sm text-center text-destructive font-semibold">
                            {product?.quantityStock}{product?.unitType === 'WEIGHT' ? ' kg' : product?.unitType === 'VOLUME' ? ' L' : ''}
                          </td>
                          <td className="p-2 text-sm text-center text-foreground-muted">
                            {product?.stockMinAlert}{product?.unitType === 'WEIGHT' ? ' kg' : product?.unitType === 'VOLUME' ? ' L' : ''}
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="0"
                              step={product?.unitType && product.unitType !== 'UNIT' ? '0.001' : '1'}
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                              className="w-20 text-center rounded-md border border-border bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.purchasePrice}
                              onChange={(e) => handlePriceChange(item.productId, e.target.value)}
                              className="w-24 text-center rounded-md border border-border bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                          </td>
                          <td className="p-2 text-sm text-right font-medium text-foreground">
                            {formatCurrency(item.quantity * item.purchasePrice)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div>
                <label htmlFor="order-notes" className="block text-sm font-medium text-foreground-muted mb-1.5">Notas (Opcional)</label>
                <textarea
                  id="order-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                  className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-sm text-foreground-muted">{items.length} producto{items.length !== 1 ? 's' : ''}</span>
                <span className="text-lg font-bold text-foreground">Total: {formatCurrency(total)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-5 border-t border-border bg-background/50 rounded-b-xl">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="button" variant="primary" onClick={handleSubmit} disabled={isSubmitting || !supplierId}>
                {isSubmitting ? <Loader2 className="animate-spin mr-2" size={16} /> : <ShoppingCart size={16} className="mr-1.5" />}
                {isSubmitting ? "Creando..." : "Confirmar Pedido"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreatePurchaseModal;
