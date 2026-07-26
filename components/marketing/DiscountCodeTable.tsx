"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, Edit, Trash2, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import DiscountCodeModal from './DiscountCodeModal';

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

const DiscountCodeTable = () => {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchCode, setSearchCode] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<DiscountCode | null>(null);

  const fetchCodes = async () => {
    setIsLoading(true);
    try {
      const url = new URL('/api/discount-codes', window.location.origin);
      if (searchCode) url.searchParams.append('code', searchCode);
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al cargar códigos');
      
      const data = await res.json();
      setCodes(Array.isArray(data) ? data : (data.data || []));
    } catch (err: any) {
      toast.error(err.message || 'Error al cargar los códigos de descuento');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, [searchCode]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Estás seguro de eliminar este código?')) return;
    
    try {
      const res = await fetch(`/api/discount-codes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Código eliminado');
      fetchCodes();
    } catch (err: any) {
      toast.error(err.message || 'No se pudo eliminar el código');
    }
  };

  const handleEdit = (code: DiscountCode) => {
    setSelectedCode(code);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedCode(null);
    setIsModalOpen(true);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
        <div className="flex gap-4 items-center">
          <Input 
            placeholder="Buscar código..." 
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            className="w-64"
          />
          <Button variant="ghost" onClick={fetchCodes} title="Refrescar">
            <RefreshCcw size={18} className="text-foreground-muted" />
          </Button>
        </div>
        <Button variant="primary" onClick={handleCreate}>
          + Nuevo Código
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/40 border-b border-border text-xs uppercase text-foreground-muted">
              <th className="p-4 font-semibold">Código</th>
              <th className="p-4 font-semibold">Descuento</th>
              <th className="p-4 font-semibold">Vigencia</th>
              <th className="p-4 font-semibold">Usos</th>
              <th className="p-4 font-semibold">Estado</th>
              <th className="p-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-foreground-muted">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={20} />
                    <span>Cargando códigos...</span>
                  </div>
                </td>
              </tr>
            ) : codes.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-foreground-muted">
                  No se encontraron códigos de descuento.
                </td>
              </tr>
            ) : (
              codes.map(code => (
                <tr key={code.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="p-4 font-bold text-foreground font-mono uppercase">{code.code}</td>
                  <td className="p-4 text-emerald-600 font-semibold">{parseFloat(code.discountPercent)}%</td>
                  <td className="p-4 text-xs text-foreground-muted">
                    {code.validFrom || code.validUntil ? (
                      <>
                        <div className="text-foreground">Desde: {formatDate(code.validFrom)}</div>
                        <div className="text-foreground">Hasta: {formatDate(code.validUntil)}</div>
                      </>
                    ) : (
                      'Sin límite de fecha'
                    )}
                  </td>
                  <td className="p-4 text-sm text-foreground">
                    <span className="font-semibold">{code.currentUses}</span> 
                    {code.maxUses ? ` / ${code.maxUses}` : ' (Ilimitado)'}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${code.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {code.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" className="p-2 h-auto" onClick={() => handleEdit(code)}>
                        <Edit size={16} className="text-blue-600" />
                      </Button>
                      <Button variant="ghost" className="p-2 h-auto hover:bg-red-50 hover:border-red-100" onClick={() => handleDelete(code.id)}>
                        <Trash2 size={16} className="text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <DiscountCodeModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchCodes}
        initialData={selectedCode}
      />
    </div>
  );
};

export default DiscountCodeTable;
