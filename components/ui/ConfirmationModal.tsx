// components/ui/ConfirmationModal.tsx
"use client";

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import Button from "./Button"; // Reutilizamos nuestro componente Button
import { AlertTriangle, X } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode; // Para el mensaje descriptivo
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean; // Para mostrar estado de carga en el botón de confirmar
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isLoading = false,
}) => {
  // useEffect para manejar el cierre con la tecla Escape (opcional pero buena UX)
  React.useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
    }
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          // Overlay de fondo
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose} // Cerrar al hacer clic en el fondo
        >
          <motion.div
            // Contenido del Modal
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-muted text-foreground rounded-lg shadow-xl w-full max-w-md m-4"
            onClick={(e) => e.stopPropagation()} // Evitar que el clic en el modal se propague al fondo
          >
            <div className="p-6">
              <div className="flex items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-destructive/10 sm:mx-0 sm:h-10 sm:w-10">
                  <AlertTriangle
                    className="h-6 w-6 text-destructive"
                    aria-hidden="true"
                  />
                </div>
                <div className="ml-4 text-left flex-grow">
                  <h3
                    className="text-lg font-semibold leading-6 text-foreground"
                    id="modal-title"
                  >
                    {title}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-foreground-muted">{children}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-border transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="bg-background px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 rounded-b-lg">
              <Button
                variant="destructive"
                onClick={onConfirm}
                disabled={isLoading}
                className="w-full sm:ml-3 sm:w-auto"
              >
                {isLoading ? "Procesando..." : confirmText}
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="mt-3 w-full sm:mt-0 sm:w-auto"
              >
                {cancelText}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;
