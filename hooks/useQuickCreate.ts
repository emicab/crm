import { useState } from 'react';
import toast from 'react-hot-toast';

interface UseQuickCreateOptions {
  apiEndpoint: string;
  label: string;
  onCreated: (item: { id: number; name: string }) => void;
  onFieldSelect: (id: string) => void;
}

export function useQuickCreate({ apiEndpoint, label, onCreated, onFieldSelect }: UseQuickCreateOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Error al crear ${label}.`);
      }
      const created = await res.json();
      onCreated(created as { id: number; name: string });
      onFieldSelect(String(created.id));
      toast.success(`¡${label.charAt(0).toUpperCase() + label.slice(1)} creada exitosamente!`);
      setIsOpen(false);
      setName('');
    } catch (err: any) {
      toast.error(err.message || `Error al crear ${label}.`);
    } finally {
      setIsCreating(false);
    }
  };

  return { isOpen, setIsOpen, name, setName, isCreating, handleCreate };
}
