
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ClientForm from '@/components/clientes/ClientForm';
import type { Client } from '@/types';
import { Loader2, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';

const EditarClientePage = () => {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clientId) {
      const fetchClientData = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/clients/${clientId}`);
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Cliente no encontrado o error al cargar (${response.status})`);
          }
          const data: Client = await response.json();
          setClient(data);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchClientData();
    } else {
        setError("ID de cliente no especificado.");
        setLoading(false);
    }
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="mt-2 text-foreground-muted">Cargando datos del cliente...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center">
        <AlertCircle size={48} className="text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error al cargar el cliente</h2>
        <p className="text-foreground-muted mb-4">{error}</p>
        <Button variant="outline" onClick={() => router.push('/clientes')}>
          Volver a la lista de Clientes
        </Button>
      </div>
    );
  }

  if (!client) {
    return <p className="text-center text-foreground-muted">No se encontraron datos para el cliente.</p>;
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">Editar Cliente</h1>
        <p className="mt-1 text-foreground-muted">
          Modifica los detalles del cliente: <span className="font-medium text-primary">{client.firstName} {client.lastName || ''}</span>
        </p>
      </div>
      <ClientForm initialClientData={client} />
    </>
  );
};

export default EditarClientePage;