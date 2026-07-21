"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Key,
  Trash2,
  Users,
  Shield,
  Loader2,
  Lock,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import toast from "react-hot-toast";

interface User {
  id: number;
  name: string;
  role: "ADMIN" | "SUPERVISOR" | "CASHIER";
  createdAt: string;
}

export default function UsuariosPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Formulario Agregar Usuario
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "SUPERVISOR" | "CASHIER">("CASHIER");
  const [newPin, setNewPin] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Formulario Cambiar PIN
  const [currentPin, setCurrentPin] = useState("");
  const [editPin, setEditPin] = useState("");
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        setUsers(await res.json());
      } else {
        toast.error("Error al cargar usuarios.");
      }
    } catch {
      toast.error("Error de conexión al cargar usuarios.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPin.trim()) {
      toast.error("Complete todos los campos.");
      return;
    }
    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      toast.error("El PIN debe tener exactamente 4 números.");
      return;
    }

    setIsAdding(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        setNewName("");
        setNewPin("");
        setNewRole("CASHIER");
        fetchUsers();
      } else {
        toast.error(data.message || "Error al agregar usuario.");
      }
    } catch {
      toast.error("Error al conectar con el servidor.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (currentPin.length !== 4 || isNaN(Number(currentPin))) {
      toast.error("Por favor ingresá el PIN Actual de 4 dígitos.");
      return;
    }
    if (editPin.length !== 4 || isNaN(Number(editPin))) {
      toast.error("El Nuevo PIN debe tener exactamente 4 números.");
      return;
    }

    setIsUpdatingPin(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPin: currentPin.trim(),
          pin: editPin.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`PIN de "${selectedUser.name}" actualizado con éxito.`);
        setShowPinModal(false);
        setEditPin("");
        setCurrentPin("");
        setSelectedUser(null);
      } else {
        toast.error(data.message || "Error al cambiar PIN.");
      }
    } catch {
      toast.error("Error al conectar con el servidor.");
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.name === "Administrador") {
      toast.error("El Administrador principal no se puede eliminar.");
      return;
    }

    const confirmDelete = confirm(
      `¿Está seguro de que desea eliminar al usuario "${user.name}"? Esta acción no se puede deshacer.`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Usuario eliminado correctamente.");
        fetchUsers();
      } else {
        toast.error(data.message || "Error al eliminar usuario.");
      }
    } catch {
      toast.error("Error al conectar con el servidor.");
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-blue-100 text-blue-800 font-extrabold uppercase";
      case "SUPERVISOR":
        return "bg-purple-100 text-purple-800 font-bold uppercase";
      default:
        return "bg-slate-100 text-slate-800 font-medium uppercase";
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "Administrador";
      case "SUPERVISOR":
        return "Supervisor";
      default:
        return "Cajero";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <button
            onClick={() => router.push("/configuracion")}
            className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground hover:underline transition-all mb-2"
          >
            <ArrowLeft size={14} /> Volver a Configuración
          </button>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="text-primary" size={24} /> Usuarios y Permisos
          </h1>
          <p className="text-xs text-foreground-muted">
            Administrá el personal autorizado para utilizar el punto de venta y sus roles de acceso.
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="rounded-xl h-10 text-xs">
          <Plus size={16} className="mr-1.5" /> Nuevo Usuario
        </Button>
      </div>

      {/* Main List */}
      <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-foreground-muted">
            <Loader2 size={32} className="animate-spin text-primary mb-2" />
            <p className="text-sm">Cargando personal...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-foreground-muted/60 text-center">
            <Users size={48} className="text-foreground-muted/30 mb-2" />
            <p className="text-sm font-semibold">No hay usuarios registrados</p>
            <p className="text-xs mt-1">Haga clic en 'Nuevo Usuario' para registrar personal.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="p-4 text-xs font-bold text-foreground uppercase">Usuario</th>
                <th className="p-4 text-xs font-bold text-foreground uppercase">Nivel de Acceso</th>
                <th className="p-4 text-xs font-bold text-foreground uppercase">Fecha de Alta</th>
                <th className="p-4 text-xs font-bold text-foreground text-center w-36 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-semibold text-foreground align-middle flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Shield size={16} />
                    </div>
                    {user.name}
                  </td>
                  <td className="p-4 align-middle">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full ${getRoleBadgeStyle(user.role)}`}>
                      {getRoleDisplayName(user.role)}
                    </span>
                  </td>
                  <td className="p-4 text-foreground-muted align-middle">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 align-middle text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowPinModal(true);
                        }}
                        className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                        title="Cambiar PIN"
                      >
                        <Key size={15} />
                      </button>
                      {user.name !== "Administrador" ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user)}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar Usuario"
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : (
                        <button
                          disabled
                          className="p-1.5 text-foreground-muted/40 cursor-not-allowed"
                          title="No se puede eliminar al Administrador principal"
                        >
                          <Lock size={15} />
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

      {/* MODAL: Agregar Usuario */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <h3 className="text-lg font-bold text-foreground">Agregar Nuevo Usuario</h3>
            <form onSubmit={handleAddUser} className="space-y-3">
              <Input
                label="Nombre de Usuario *"
                type="text"
                placeholder="Ej: Juan Perez"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />

              <Select
                label="Rol / Permisos *"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                required
              >
                <option value="CASHIER">Cajero (Solo Ventas y Caja)</option>
                <option value="SUPERVISOR">Supervisor (Ventas, Caja y Stock)</option>
                <option value="ADMIN">Administrador (Acceso Total)</option>
              </Select>

              <Input
                label="PIN de Acceso (4 dígitos) *"
                type="password"
                maxLength={4}
                placeholder="Ej: 1234"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                required
              />

              <div className="pt-3 border-t border-border flex justify-end gap-2 text-xs">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  disabled={isAdding}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isAdding}>
                  {isAdding ? "Registrando..." : "Registrar Usuario"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Cambiar PIN */}
      {showPinModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <h3 className="text-lg font-bold text-foreground">
              Cambiar PIN de "{selectedUser.name}"
            </h3>
            <form onSubmit={handleUpdatePin} className="space-y-3">
              <Input
                label="PIN Actual (4 dígitos) *"
                type="password"
                maxLength={4}
                placeholder="Ej: 1234"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                required
              />

              <Input
                label="Nuevo PIN de 4 dígitos *"
                type="password"
                maxLength={4}
                placeholder="Ej: 9876"
                value={editPin}
                onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ""))}
                required
              />

              <div className="pt-3 border-t border-border flex justify-end gap-2 text-xs">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPinModal(false);
                    setEditPin("");
                    setCurrentPin("");
                    setSelectedUser(null);
                  }}
                  disabled={isUpdatingPin}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isUpdatingPin || currentPin.length !== 4 || editPin.length !== 4}>
                  {isUpdatingPin ? "Guardando..." : "Actualizar PIN"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
