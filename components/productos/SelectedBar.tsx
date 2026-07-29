"use client";

import React from 'react';
import Button from '@/components/ui/Button';
import { X, Edit } from 'lucide-react';

interface SelectedBarProps {
  count: number;
  onClear: () => void;
  onBatchUpdate: () => void;
  onPublishWeb?: () => void;
  onHideWeb?: () => void;
}

const SelectedBar: React.FC<SelectedBarProps> = ({ count, onClear, onBatchUpdate, onPublishWeb, onHideWeb }) => {
  if (count === 0) return null;

  return (
    <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex flex-wrap items-center justify-between gap-2 shadow-sm">
      <span className="text-sm font-medium text-foreground">
        {count} producto{count !== 1 ? 's' : ''} seleccionado{count !== 1 ? 's' : ''}
      </span>
      <div className="flex flex-wrap gap-2">
        {onPublishWeb && (
          <Button variant="outline" size="sm" onClick={onPublishWeb} className="border-emerald-600 text-emerald-700 hover:bg-emerald-50">
            🌐 Publicar en Web
          </Button>
        )}
        {onHideWeb && (
          <Button variant="outline" size="sm" onClick={onHideWeb} className="border-gray-400 text-gray-700 hover:bg-gray-100">
            🚫 Ocultar de Web
          </Button>
        )}
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
