"use client";

import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { X, Loader2, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Supplier } from '@/types';

interface AlertProduct {
  id: number;
  name: string;
  quantityStock: number;
  stockMinAlert: number | null;
  pricePurchase: number | null;
  unitType: string | null;
  supplier?: { id: number; name: string } | null;
}

interface AddProductToOrderModalProps {
  isOpen: boolean;
  product: AlertProduct | null;
  suppliers: Supplier[];
  isSaving: boolean;
  onConfirm: (data: { supplierId: number; quantity: number; purchasePrice: number }) => void;
  onClose: () => void;
  activeOrderSupplierId?: number;
}

const AddProductToOrderModal: React.FC<AddProductToOrderModalProps> = ({
  isOpen,
  product,
  suppliers,
  isSaving,
  onConfirm,
  onClose,
  activeOrderSupplierId,
}) => {
  const [supplierId, setSupplierId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');

  useEffect(() => {
    if (isOpen && product) {
      if (product.supplier) {
        setSupplierId(String(product.supplier.id));
      } else if (activeOrderSupplierId) {
        setSupplierId(String(activeOrderSupplierId));
      } else {
        setSupplierId('');
      }

      const suggestedQty = Math.max(1, (product.stockMinAlert ?? 0) - product.quantityStock);
      setQuantity(String(suggestedQty));
      setPurchasePrice(String(product.pricePurchase ?? 0));
    }
  }, [isOpen, product, activeOrderSupplierId]);

  if (!isOpen || !product) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) return;
    const qty = parseFloat(quantity);
    const price = parseFloat(purchasePrice);
    if (isNaN(qty) || qty <= 0) return;
    if (isNaN(price) || price < 0) return;

    onConfirm({
      supplierId: parseInt(supplierId),
      quantity: qty,
      purchasePrice: price,
    });
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
            className="bg-muted text-foreground rounded-lg shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleConfirm}>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4 border-b border-border pb-2">
                  <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                    <ShoppingCart size={20} />
                    Agregar a Pedido
                  </h3>
                  <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-border transition-colors text-foreground-muted hover:text-foreground">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="block text-xs font-semibold text-foreground-muted uppercase mb-1">Producto</span>
                    <p className="text-sm font-bold text-foreground bg-background px-3 py-2 rounded-lg border border-border">
                      {product.name}
                    </p>
                  </div>

                  {product.supplier ? (
                    <div>
                      <span className="block text-xs font-semibold text-foreground-muted uppercase mb-1">Proveedor</span>
                      <p className="text-sm font-semibold text-foreground-muted bg-background/50 px-3 py-2 rounded-lg border border-border">
                        {product.supplier.name}
                      </p>
                    </div>
                  ) : (
                    <Select
                      label="Seleccionar Proveedor *"
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      required
                      disabled={!!activeOrderSupplierId}
                    >
                      <option value="">Selecciona un proveedor...</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={String(s.id)}>{s.name}</option>
                      ))}
                    </Select>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label={`Cantidad a Pedir * ${product.unitType === 'WEIGHT' ? '(kg)' : product.unitType === 'VOLUME' ? '(L)' : ''}`}
                      type="number"
                      step={product.unitType && product.unitType !== 'UNIT' ? '0.001' : '1'}
                      min="0.001"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                      autoFocus
                    />
                    <Input
                      label="Precio de Compra *"
                      type="number"
                      step="0.01"
                      min="0"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="bg-background px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 rounded-b-lg gap-2">
                <Button type="submit" variant="primary" disabled={isSaving || !supplierId} className="w-full sm:w-auto">
                  {isSaving ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                  Confirmar
                </Button>
                <Button type="button" variant="outline" onClick={onClose} disabled={isSaving} className="w-full sm:w-auto">
                  Cancelar
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddProductToOrderModal;
