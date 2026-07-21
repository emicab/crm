'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Plus,
  Key,
  Trash2,
  Lock,
  Loader2,
  Delete,
  X,
  CheckCircle2,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import toast from 'react-hot-toast';

interface User {
  id: number;
  name: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'CASHIER';
  createdAt: string;
}

export default function ConfigUsuariosTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Formulario Agregar Usuario
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'SUPERVISOR' | 'CASHIER'>('CASHIER');
  const [newPin, setNewPin] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Formulario Cambiar PIN
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [editPin, setEditPin] = useState('');
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        setUsers(await res.json());
      } else {
        toast.error('Error al cargar usuarios.');
      }
    } catch {
      toast.error('Error de conexión al cargar usuarios.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Escuchar teclado físico para el modal de PIN
  useEffect(() => {
    if (!showPinModal || !selectedUser || isUpdatingPin) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        if (editPin.length < 4) {
          setEditPin((prev) => (prev + e.key).slice(0, 4));
        }
      } else if (e.key === 'Backspace') {
        setEditPin((prev) => prev.slice(0, -1));
      } else if (e.key === 'Escape') {
        setShowPinModal(false);
        setEditPin('');
        setCurrentPinInput('');
        setSelectedUser(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPinModal, selectedUser, editPin, isUpdatingPin]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPin.trim()) {
      toast.error('Complete todos los campos.');
      return;
    }
    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      toast.error('El PIN debe tener exactamente 4 números.');
      return;
    }

    setIsAdding(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          role: newRole,
          pin: newPin.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Usuario "${data.name}" agregado con éxito.`);
        setShowAddModal(false);
        setNewName('');
        setNewPin('');
        setNewRole('CASHIER');
        fetchUsers();
      } else {
        toast.error(data.message || 'Error al agregar usuario.');
      }
    } catch {
      toast.error('Error al conectar con el servidor.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdatePin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedUser) return;
    if (currentPinInput.length !== 4 || isNaN(Number(currentPinInput))) {
      toast.error('Por favor ingresá el PIN Actual de 4 dígitos.');
      return;
    }
    if (editPin.length !== 4 || isNaN(Number(editPin))) {
      toast.error('El Nuevo PIN debe tener exactamente 4 números.');
      return;
    }

    setIsUpdatingPin(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPin: currentPinInput.trim(),
          pin: editPin.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`PIN de "${selectedUser.name}" actualizado con éxito.`);
        setShowPinModal(false);
        setEditPin('');
        setCurrentPinInput('');
        setSelectedUser(null);
      } else {
        toast.error(data.message || 'Error al cambiar PIN.');
      }
    } catch {
      toast.error('Error al conectar con el servidor.');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.name === 'Administrador') {
      toast.error('El Administrador principal no se puede eliminar.');
      return;
    }

    const confirmDelete = confirm(
      `¿Está seguro de que desea eliminar al usuario "${user.name}"? Esta acción no se puede deshacer.`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Usuario eliminado correctamente.');
        fetchUsers();
      } else {
        toast.error(data.message || 'Error al eliminar usuario.');
      }
    } catch {
      toast.error('Error al conectar con el servidor.');
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 font-extrabold uppercase';
      case 'SUPERVISOR':
        return 'bg-purple-100 text-purple-800 font-bold uppercase';
      default:
        return 'bg-slate-100 text-slate-800 font-medium uppercase';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrador';
      case 'SUPERVISOR':
        return 'Supervisor';
      default:
        return 'Cajero';
    }
  };

  return (
    <div className="space-y-8">
      {/* Explicación de Roles */}
      <section className="bg-muted p-6 rounded-xl shadow space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Users size={20} className="text-primary" /> Gestión de Roles y Permisos
            </h2>
            <p className="text-sm text-foreground-muted mt-1">
              Administrá los usuarios del sistema y asigná sus niveles de acceso con clave PIN numérica.
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="shrink-0 font-bold text-sm">
            <Plus size={16} className="mr-1.5" /> Agregar Nuevo Usuario
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="p-4 bg-background border border-border rounded-xl space-y-1.5">
            <span className="font-extrabold text-blue-600 uppercase text-[11px]">👑 Administrador</span>
            <p className="text-foreground-muted leading-relaxed">
              Acceso total al sistema: Ventas, Caja, Productos, Compras, Clientes, Analíticas Avanzadas y Configuración General.
            </p>
          </div>

          <div className="p-4 bg-background border border-border rounded-xl space-y-1.5">
            <span className="font-bold text-purple-600 uppercase text-[11px]">⭐ Supervisor</span>
            <p className="text-foreground-muted leading-relaxed">
              Gestión operativa: Ventas, Caja Diaria, Productos, Alertas de Stock, Clientes y Compras. Sin acceso a Configuración sensible.
            </p>
          </div>

          <div className="p-4 bg-background border border-border rounded-xl space-y-1.5">
            <span className="font-semibold text-slate-700 uppercase text-[11px]">🛒 Cajero</span>
            <p className="text-foreground-muted leading-relaxed">
              Acceso exclusivo de cobro: Registrar Nueva Venta, visualizar Caja Diaria e Historial de Ventas.
            </p>
          </div>
        </div>
      </section>

      {/* Lista de Usuarios */}
      <section className="bg-muted p-6 rounded-xl shadow space-y-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <Shield size={18} className="text-primary" /> Personal Autorizado ({users.length})
        </h3>

        <div className="bg-background border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-foreground-muted">
              <Loader2 size={28} className="animate-spin text-primary mb-2" />
              <p className="text-sm">Cargando personal...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-foreground-muted text-center">
              <Users size={40} className="text-foreground-muted/30 mb-2" />
              <p className="text-sm font-semibold">No hay usuarios registrados</p>
              <p className="text-xs mt-1">Hacé clic en 'Agregar Nuevo Usuario' para comenzar.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/60 border-b border-border">
                <tr>
                  <th className="p-4 text-xs font-bold text-foreground uppercase">Nombre de Usuario</th>
                  <th className="p-4 text-xs font-bold text-foreground uppercase">Nivel de Acceso</th>
                  <th className="p-4 text-xs font-bold text-foreground uppercase">Fecha de Alta</th>
                  <th className="p-4 text-xs font-bold text-foreground text-center w-36 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-semibold text-foreground align-middle flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                        <Shield size={18} />
                      </div>
                      <div>
                        <span className="text-base">{user.name}</span>
                        {user.name === 'Administrador' && (
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold ml-2">
                            Principal
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <span className={`text-[11px] px-3 py-1 rounded-full ${getRoleBadgeStyle(user.role)}`}>
                        {getRoleDisplayName(user.role)}
                      </span>
                    </td>
                    <td className="p-4 text-foreground-muted align-middle text-xs font-mono">
                      {new Date(user.createdAt).toLocaleDateString('es-AR')}
                    </td>
                    <td className="p-4 align-middle text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(user);
                            setEditPin('');
                            setShowPinModal(true);
                          }}
                          className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="Cambiar PIN"
                        >
                          <Key size={14} /> Cambiar PIN
                        </button>
                        {user.name !== 'Administrador' ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar Usuario"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <button
                            disabled
                            className="p-2 text-foreground-muted/40 cursor-not-allowed"
                            title="No se puede eliminar al Administrador principal"
                          >
                            <Lock size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* MODAL: Agregar Usuario */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-background border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 text-foreground">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Users size={20} className="text-primary" /> Agregar Nuevo Usuario
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-foreground-muted hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <Input
                label="Nombre de Usuario *"
                type="text"
                placeholder="Ej: Juan Pérez"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />

              <Select
                label="Rol / Nivel de Permisos *"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                required
              >
                <option value="CASHIER">Cajero (Solo Ventas y Caja)</option>
                <option value="SUPERVISOR">Supervisor (Ventas, Caja y Stock)</option>
                <option value="ADMIN">Administrador (Acceso Total)</option>
              </Select>

              <Input
                label="Clave PIN de Acceso (4 dígitos) *"
                type="password"
                maxLength={4}
                placeholder="Ej: 1234"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                required
              />

              <div className="pt-4 border-t border-border/60 flex justify-end gap-3 text-sm">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  disabled={isAdding}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isAdding} className="font-bold">
                  {isAdding ? 'Registrando...' : 'Registrar Usuario'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Cambiar PIN con Teclado Numérico */}
      {showPinModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-background border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 text-center text-foreground">
            <div className="flex justify-between items-center pb-3 border-b border-border text-left">
              <div>
                <h3 className="text-lg font-bold text-foreground">Cambiar Clave PIN</h3>
                <p className="text-xs text-foreground-muted">Usuario: <strong>{selectedUser.name}</strong></p>
              </div>
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setEditPin('');
                  setSelectedUser(null);
                }}
                className="text-foreground-muted hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-left pt-2">
              <Input
                label="PIN Actual (4 dígitos) *"
                type="password"
                maxLength={4}
                placeholder="Ej: 1234"
                value={currentPinInput}
                onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
                required
              />

              <Input
                label="Nuevo PIN (4 dígitos) *"
                type="password"
                maxLength={4}
                placeholder="Ej: 9876"
                value={editPin}
                onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>

            <p className="text-[11px] text-foreground-muted">
              Por seguridad, debés ingresar tu PIN actual antes de definir la nueva clave de acceso.
            </p>

            <div className="pt-4 border-t border-border flex justify-end gap-3 text-sm">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPinModal(false);
                  setEditPin('');
                  setCurrentPinInput('');
                  setSelectedUser(null);
                }}
                disabled={isUpdatingPin}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => handleUpdatePin()}
                disabled={isUpdatingPin || currentPinInput.length !== 4 || editPin.length !== 4}
                className="font-bold"
              >
                {isUpdatingPin ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-1.5" /> Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} className="mr-1.5" /> Guardar Nuevo PIN
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
