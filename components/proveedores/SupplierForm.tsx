// components/proveedores/SupplierForm.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Supplier } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

interface SupplierFormData {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

interface SupplierFormProps {
  initialSupplierData?: Supplier | null;
}

const SupplierForm: React.FC<SupplierFormProps> = ({ initialSupplierData }) => {
  const router = useRouter();
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '', contactPerson: '', email: '', phone: '', address: '', notes: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialSupplierData) {
      setFormData({
        name: initialSupplierData.name || '',
        contactPerson: initialSupplierData.contactPerson || '',
        email: initialSupplierData.email || '',
        phone: initialSupplierData.phone || '',
        address: initialSupplierData.address || '',
        notes: initialSupplierData.notes || '',
      });
    }
  }, [initialSupplierData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.name.trim()) {
      toast.error('El nombre del proveedor es obligatorio.');
      setIsLoading(false);
      return;
    }

    const method = initialSupplierData ? 'PUT' : 'POST';
    const apiUrl = initialSupplierData 
      ? `/api/proveedores/${initialSupplierData.id}` 
      : '/api/proveedores';
      
    const dataToSend = {
        name: formData.name.trim(),
        contactPerson: formData.contactPerson.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null,
    };

    try {
      const response = await fetch(apiUrl, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      toast.success(initialSupplierData ? '¡Proveedor actualizado!' : '¡Proveedor creado!');
      
      router.push('/proveedores');
      router.refresh();

    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-muted p-6 sm:p-8 rounded-lg shadow space-y-6 max-w-2xl mx-auto">
        <Input label="Nombre del Proveedor *" name="name" value={formData.name} onChange={handleChange} required />
        <Input label="Persona de Contacto (Opcional)" name="contactPerson" value={formData.contactPerson} onChange={handleChange} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Email (Opcional)" name="email" type="email" value={formData.email} onChange={handleChange} />
            <Input label="Teléfono (Opcional)" name="phone" type="tel" value={formData.phone} onChange={handleChange} />
        </div>
        <Input label="Dirección (Opcional)" name="address" value={formData.address} onChange={handleChange} />
        <div>
            <label htmlFor="notes" className="block text-sm font-medium text-foreground-muted mb-1.5">Notas</label>
            <textarea id="notes" name="notes" rows={3} value={formData.notes} onChange={handleChange} className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div className="flex justify-end pt-4 space-x-3">
            <Button type="button" variant="outline" onClick={() => router.push('/proveedores')} disabled={isLoading}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
                {isLoading && <Loader2 size={18} className="animate-spin mr-2" />}
                {isLoading ? (initialSupplierData ? 'Actualizando...' : 'Guardando...') : (initialSupplierData ? 'Actualizar Proveedor' : 'Guardar Proveedor')}
            </Button>
        </div>
    </form>
  );
};

export default SupplierForm;