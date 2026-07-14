"use client";

import React from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QuickCreateModalProps {
  isOpen: boolean;
  title: string;
  value: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
  isOpen, title, value, isLoading, onChange, onSubmit, onClose,
}) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-muted text-foreground rounded-lg shadow-xl w-full max-w-md m-4"
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={onSubmit}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-border transition-colors text-foreground-muted hover:text-foreground">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <Input
                  label={`Nombre de ${title} *`}
                  type="text"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>
            <div className="bg-background px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 rounded-b-lg gap-2">
              <Button type="submit" variant="primary" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                Guardar
              </Button>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="w-full sm:w-auto">
                Cancelar
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default QuickCreateModal;
