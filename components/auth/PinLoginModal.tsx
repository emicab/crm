"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Lock, 
  ChevronLeft, 
  Delete, 
  Loader2, 
  ShieldAlert 
} from "lucide-react";
import toast from "react-hot-toast";
import { UserSession } from "@/hooks/useModules";

interface UserOption {
  id: number;
  name: string;
  role: string;
}

export default function PinLoginModal({ 
  isOpen, 
  onLoginSuccess 
}: { 
  isOpen: boolean; 
  onLoginSuccess: (user: UserSession) => void 
}) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingUsers, setIsFetchingUsers] = useState(true);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      setIsFetchingUsers(true);
      try {
        const res = await fetch("/api/users");
        if (!res.ok) throw new Error();
        const data = await res.json();
        setUsers(data);
      } catch {
        toast.error("Error al cargar usuarios de seguridad.");
      } finally {
        setIsFetchingUsers(false);
      }
    };
    fetchUsers();
  }, [isOpen]);

  // Escuchar teclado físico (Teclado numérico / Numpad USB / números superiores)
  useEffect(() => {
    if (!isOpen || !selectedUser || isLoading) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape') {
        setSelectedUser(null);
        setPin('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedUser, pin, isLoading]);

  // Si no está abierto el modal de PIN, no renderiza nada
  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const verifyPin = async (enteredPin: string) => {
    if (!selectedUser) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          pin: enteredPin,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "PIN Incorrecto");
      }

      const data = await res.json();
      toast.success(`Sesión iniciada: ${data.user.name}`);
      onLoginSuccess(data.user);
      // Reset
      setSelectedUser(null);
      setPin("");
    } catch (err: any) {
      toast.error(err.message || "Error al verificar PIN.");
      // Microanimación de sacudida (shaking)
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPin("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAdminPin = async () => {
    try {
      const res = await fetch("/api/users/reset-admin", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "PIN del Administrador restablecido a 1234");
      } else {
        toast.error(data.message || "Error al restablecer PIN");
      }
    } catch {
      toast.error("Error al conectar con el servidor.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-lg p-4">
      <div className="bg-muted border border-border text-foreground rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 flex flex-col items-center">
        {/* Logo/Icono Principal */}
        <div className="flex flex-col items-center text-center">
          <div className="bg-primary/10 text-primary p-3 rounded-full mb-3 shadow-inner">
            <Lock size={28} className="animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold uppercase tracking-tight">Acceso de Seguridad</h2>
          <p className="text-xs text-foreground-muted mt-1.5 max-w-[280px]">
            {selectedUser 
              ? `Ingresá el código PIN de 4 dígitos para ${selectedUser.name}` 
              : "Seleccioná tu cuenta para iniciar sesión en ClinPOS"}
          </p>
        </div>

        {/* CONTENIDO 1: Lista de perfiles de usuario */}
        {!selectedUser && (
          <div className="w-full space-y-3">
            {isFetchingUsers ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <Loader2 size={24} className="animate-spin text-primary" />
                <span className="text-xs text-foreground-muted">Cargando perfiles...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center text-xs text-foreground-muted bg-white border rounded-xl p-4">
                <ShieldAlert size={28} className="text-destructive mb-2" />
                <p className="font-semibold">Sin perfiles configurados</p>
                <p className="text-[10px] mt-1">Contactá al administrador para inicializar cuentas.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => { setSelectedUser(u); setPin(""); }}
                      className="flex items-center gap-3 bg-white border border-border hover:border-primary hover:shadow p-3.5 rounded-xl transition-all text-left group"
                    >
                      <div className="bg-primary/10 text-primary p-2.5 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                        <Users size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{u.name}</h4>
                        <p className="text-[10px] font-bold text-foreground-muted/65 uppercase tracking-wide mt-0.5">
                          Rol: {u.role === "ADMIN" ? "Administrador" : u.role === "SUPERVISOR" ? "Supervisor" : "Cajero"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleResetAdminPin}
                    className="text-xs text-primary hover:underline font-semibold cursor-pointer"
                  >
                    ¿Olvidaste el PIN del Administrador? Restablecer a 1234
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* CONTENIDO 2: Numpad / Teclado PIN */}
        {selectedUser && (
          <div className="w-full space-y-6 flex flex-col items-center">
            {/* Botón de Atrás */}
            <button
              onClick={() => { setSelectedUser(null); setPin(""); }}
              className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground self-start font-semibold transition-colors"
            >
              <ChevronLeft size={14} /> Elegir otro usuario
            </button>

            {/* Display de Puntos PIN */}
            <div className={`flex gap-4 justify-center items-center h-12 w-full transition-transform ${isShaking ? "animate-shake" : ""}`}>
              {[0, 1, 2, 3].map((idx) => {
                const filled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`h-4.5 w-4.5 rounded-full border border-border transition-all duration-150 ${
                      filled ? "bg-primary scale-110 shadow" : "bg-white"
                    }`}
                  />
                );
              })}
            </div>

            {/* Teclado Numérico */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] pt-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleKeyPress(num)}
                  className="h-14 w-full rounded-full border border-border bg-white text-lg font-bold text-foreground hover:bg-primary-light hover:text-primary active:scale-95 transition-all flex items-center justify-center shadow-sm disabled:opacity-50"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                className="h-14 w-full rounded-full flex items-center justify-center invisible"
              />
              <button
                key="0"
                type="button"
                disabled={isLoading}
                onClick={() => handleKeyPress("0")}
                className="h-14 w-full rounded-full border border-border bg-white text-lg font-bold text-foreground hover:bg-primary-light hover:text-primary active:scale-95 transition-all flex items-center justify-center shadow-sm disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                disabled={isLoading || pin.length === 0}
                onClick={handleDelete}
                className="h-14 w-full rounded-full text-foreground hover:bg-muted active:scale-95 transition-all flex items-center justify-center disabled:opacity-40"
                title="Borrar dígito"
              >
                <Delete size={20} />
              </button>
            </div>

            {isLoading && (
              <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                <Loader2 size={14} className="animate-spin" /> Verificando PIN...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Estilos inline para sacudida (shake animation) */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}
