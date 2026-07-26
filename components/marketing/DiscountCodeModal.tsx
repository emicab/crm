import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, CheckCircle, Tag } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface DiscountCode {
  id: number;
  code: string;
  discountPercent: string;
  validFrom: string | null;
  validUntil: string | null;
  maxUses: number | null;
  currentUses: number;
  isActive: boolean;
}

interface DiscountCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: DiscountCode | null;
}

const DiscountCodeModal: React.FC<DiscountCodeModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const [formData, setFormData] = useState({
    code: '',
    discountPercent: '',
    validFrom: '',
    validUntil: '',
    maxUses: '',
    isActive: true,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code,
        discountPercent: initialData.discountPercent.toString(),
        validFrom: initialData.validFrom ? new Date(initialData.validFrom).toISOString().slice(0, 16) : '',
        validUntil: initialData.validUntil ? new Date(initialData.validUntil).toISOString().slice(0, 16) : '',
        maxUses: initialData.maxUses !== null ? initialData.maxUses.toString() : '',
        isActive: initialData.isActive,
      });
    } else {
      setFormData({
        code: '',
        discountPercent: '',
        validFrom: '',
        validUntil: '',
        maxUses: '',
        isActive: true,
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.discountPercent) {
      toast.error('El código y el porcentaje son obligatorios');
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        ...formData,
        code: formData.code.trim().toUpperCase(),
        validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : null,
        validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : null,
      };

      const url = initialData 
        ? `/api/discount-codes/${initialData.id}` 
        : '/api/discount-codes';
      
      const method = initialData ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'Error al guardar el código');
      }

      toast.success(initialData ? 'Código actualizado' : 'Código creado');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error inesperado');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-background text-foreground border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/60">
          <div className="flex items-center gap-2 text-foreground font-bold text-base">
            <Tag size={20} className="text-primary" />
            {initialData ? 'Editar Código de Descuento' : 'Nuevo Código de Descuento'}
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-foreground-muted hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-4">
            <div>
              <Input
                label="Código (*)"
                name="code"
                placeholder="Ej: VERANO20"
                value={formData.code}
                onChange={handleChange}
                required
                className="uppercase font-semibold"
              />
            </div>

            <div>
              <Input
                label="Descuento % (*)"
                type="number"
                name="discountPercent"
                placeholder="Ej: 15"
                min="0"
                max="100"
                step="0.01"
                value={formData.discountPercent}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label="Válido Desde"
                  type="datetime-local"
                  name="validFrom"
                  value={formData.validFrom}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Input
                  label="Válido Hasta"
                  type="datetime-local"
                  name="validUntil"
                  value={formData.validUntil}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <Input
                label="Límite de Usos"
                type="number"
                name="maxUses"
                placeholder="Opcional (Ej: 100)"
                min="1"
                value={formData.maxUses}
                onChange={handleChange}
              />
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
              />
              <label htmlFor="isActive" className="text-sm font-semibold text-foreground cursor-pointer select-none">
                Código Activo
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              <CheckCircle size={18} />
              Guardar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DiscountCodeModal;
