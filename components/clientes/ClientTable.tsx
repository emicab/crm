// components/clientes/ClientTable.tsx
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import type { Client } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input'; // Importamos Input para el buscador
import { Edit3, Trash2, Loader2, AlertCircle, Search } from 'lucide-react'; // Importamos Search
import { useRouter } from 'next/navigation';

const ClientTable = () => {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  
  // --- Estado para el término de búsqueda ---
  const [searchTerm, setSearchTerm] = useState('');

  const fetchClients = useCallback(async () => {
    // No hacemos setLoading(true) aquí para una búsqueda más fluida
    // El loading se manejará por separado
    const params = new URLSearchParams();
    if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
    }
    const queryString = params.toString();

    try {
      const response = await fetch(`/api/clients?${queryString}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }
      setClients(await response.json());
    } catch (err: any) {
      setError(err.message || 'Error al cargar los clientes.');
      console.error(err);
    } finally {
      setLoading(false); // Desactivar el loading inicial/principal
    }
  }, [searchTerm]); // La función depende del término de búsqueda

  // Efecto para la carga inicial
  useEffect(() => {
    setLoading(true);
    fetchClients();
  }, [fetchClients]);

  // Handler para cuando el usuario escribe en el input de búsqueda
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setLoading(true); // Activar un indicador de carga mientras se busca
  };


  const handleDelete = async (clientId: number) => {
    try {
        const response = await fetch(`/api/clients/${clientId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error al eliminar: ${response.statusText} (${response.status})`);
        }

        setClients(prevClients => prevClients.filter(client => client.id !== clientId));
        
      } catch (err: any) {
        console.error('Error al eliminar el cliente:', err);
        setActionError(err.message);
        alert(`Error: ${err.message}`);
      }
  };

  const handleEdit = (clientId: number) => {
    router.push(`/clientes/${clientId}/editar`);
  };
  
  // ... (resto del componente: loading, error) ...
  if (loading && clients.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="ml-2 text-foreground-muted">Cargando clientes...</p>
      </div>
    );
  }

  if (error) {
    return (
        <div className="text-center text-destructive p-4 bg-destructive/10 rounded-md my-4">
            <AlertCircle size={20} className="inline-block mr-2" />
            {error}
        </div>
    );
  }

  return (
    <div className="bg-muted p-4 sm:p-6 rounded-lg shadow">
      {/* --- Sección de Búsqueda --- */}
      <div className="mb-6">
        <Input 
            type="text"
            placeholder="Buscar por nombre, apellido, email o teléfono..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="max-w-sm"
            // icon={<Search size={16} />} // Si tu componente Input soporta iconos
        />
      </div>

      {loading && <div className="text-center py-4"><Loader2 size={24} className="animate-spin text-primary" /></div>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left">
          <thead className="border-b border-border">
            <tr>
              <th className="p-3 sm:p-4 text-sm font-semibold text-foreground">Nombre Completo</th>
              <th className="p-3 sm:p-4 text-sm font-semibold text-foreground">Email</th>
              <th className="p-3 sm:p-4 text-sm font-semibold text-foreground">Teléfono</th>
              <th className="p-3 sm:p-4 text-sm font-semibold text-foreground">Dirección</th>
              <th className="p-3 sm:p-4 text-sm font-semibold text-foreground text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!loading && clients.length === 0 ? (
                <tr>
                    <td colSpan={5} className="text-center text-foreground-muted py-8">
                        {searchTerm ? `No se encontraron clientes para "${searchTerm}".` : "No hay clientes registrados."}
                    </td>
                </tr>
            ) : (
                clients.map((client) => (
                <tr key={client.id} className="border-b border-border last:border-b-0 hover:bg-background transition-colors">
                    <td className="p-3 sm:p-4 text-sm text-foreground font-medium">
                    {`${client.firstName} ${client.lastName || ''}`.trim()}
                    </td>
                    <td className="p-3 sm:p-4 text-sm text-foreground-muted">{client.email || '-'}</td>
                    <td className="p-3 sm:p-4 text-sm text-foreground-muted">{client.phone || '-'}</td>
                    <td className="p-3 sm:p-4 text-sm text-foreground-muted">{client.address || '-'}</td>
                    <td className="p-3 sm:p-4 text-sm text-center">
                    <div className="flex justify-center items-center space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(client.id)} title="Editar">
                        <Edit3 size={16} className="text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(client.id)} title="Eliminar">
                        <Trash2 size={16} className="text-destructive" />
                        </Button>
                    </div>
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientTable;