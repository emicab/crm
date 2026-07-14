"use client";

import React from 'react';
import Button from '@/components/ui/Button';
import { X, Edit } from 'lucide-react';

interface SelectedBarProps {
  count: number;
  onClear: () => void;
  onBatchUpdate: () => void;
}

const SelectedBar: React.FC<SelectedBarProps> = ({ count, onClear, onBatchUpdate }) => {
  if (count === 0) return null;

  return (
    <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between shadow-sm">
      <span className="text-sm font-medium text-foreground">
        {count} producto{count !== 1 ? 's' : ''} seleccionado{count !== 1 ? 's' : ''}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onClear}>
          <X size={14} className="mr-1" /> Limpiar
        </Button>
        <Button variant="primary" size="sm" onClick={onBatchUpdate}>
          <Edit size={14} className="mr-1" /> Edición Masiva
        </Button>
      </div>
    </div>
  );
};

export default SelectedBar;
