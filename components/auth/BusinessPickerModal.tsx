"use client";

import React, { useState, useEffect } from "react";
import {
  Store,
  ChefHat,
  ShoppingBag,
  Plus,
  Loader2,
  CheckCircle2,
  Building2,
  Trash2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import toast from "react-hot-toast";
import { useModules } from "@/hooks/useModules";

export interface BusinessProfileDto {
  id: string;
  name: string;
  businessSector: string;
  dbFile: string;
  deletable?: boolean;
}

const SECTOR_LABEL: Record<string, string> = {
  GASTRONOMIA: "Gastronomía / Comida",
  INDUMENTARIA: "Indumentaria / Ropa",
  MINIMARKET: "Minimarket",
  RETAIL_GENERAL: "Comercio general",
};

function SectorIcon({ sector }: { sector: string }) {
  if (sector === "GASTRONOMIA") return <ChefHat size={20} />;
  if (sector === "INDUMENTARIA") return <ShoppingBag size={20} />;
  return <Store size={20} />;
}

export default function BusinessPickerModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose?: () => void;
}) {
  const { currentUser } = useModules();
  const canCreate = !currentUser || currentUser.role === "ADMIN";
  const canDelete = canCreate;
  const [legacyBusiness, setLegacyBusiness] = useState<{ name: string; businessSector: string } | null>(null);
  const [profiles, setProfiles] = useState<BusinessProfileDto[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSector, setNewSector] = useState("GASTRONOMIA");

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const [res, cfgRes] = await Promise.all([
        fetch("/api/profiles"),
        fetch("/api/config"),
      ]);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProfiles(data.profiles || []);
      setActiveProfileId(data.activeProfileId || null);

      const cfg = cfgRes.ok ? await cfgRes.json() : {};
      if (!data.profiles || data.profiles.length === 0) {
        const profile = cfg.business_profile || "";
        const sector =
          profile === "boutique"
            ? "INDUMENTARIA"
            : profile === "gastronomia" ||
                profile === "kiosco" ||
                profile === "fiambreria"
              ? "GASTRONOMIA"
              : "RETAIL_GENERAL";
        setLegacyBusiness({
          name: cfg.businessName || "Mi Negocio",
          businessSector: sector,
        });
      } else {
        setLegacyBusiness(null);
      }
    } catch {
      toast.error("No se pudieron cargar los negocios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchProfiles();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = async (id: string) => {
    setActivatingId(id);
    try {
      const res = await fetch("/api/profiles/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Error al cambiar de negocio.");
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("clinpos_active_business_ack", id);
      }
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Error al cambiar de negocio.");
      setActivatingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error("Ingresá el nombre del negocio.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), businessSector: newSector }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Error al crear el negocio.");
      }
      const data = await res.json();
      if (typeof window !== "undefined") {
        localStorage.setItem("clinpos_active_business_ack", data.profile?.id || "");
      }
      toast.success("¡Negocio creado! Se abrirá la configuración inicial.");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Error al crear el negocio.");
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const name = profiles.find((p) => p.id === id)?.name || "este negocio";
    if (
      !window.confirm(
        `¿Eliminar "${name}"? Se borrará su base de datos local y no se puede deshacer.`,
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/profiles/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Error al eliminar el negocio.");
      }
      toast.success("Negocio eliminado.");
      const wasActive = activeProfileId === id;
      if (wasActive) {
        const remaining = profiles.filter((p) => p.id !== id);
        if (typeof window !== "undefined") {
          localStorage.setItem("clinpos_active_business_ack", remaining[0]?.id || "");
        }
        window.location.reload();
      } else {
        setDeletingId(null);
        fetchProfiles();
      }
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar el negocio.");
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/90 backdrop-blur-lg p-4">
      <div className="bg-muted border border-border text-foreground rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-border text-center shrink-0">
          <div className="bg-primary/10 text-primary p-3 rounded-full w-fit mx-auto mb-3">
            <Building2 size={28} />
          </div>
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Elegí tu negocio
          </h2>
          <p className="text-xs text-foreground-muted mt-1.5">
            Seleccioná el negocio en el que querés trabajar. Cada uno tiene su
            propio catálogo, caja y configuración.
          </p>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <Loader2 size={24} className="animate-spin text-primary" />
              <span className="text-xs text-foreground-muted">
                Cargando negocios...
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.length === 0 && legacyBusiness && (
                <div className="w-full flex items-center gap-3 p-4 rounded-xl border border-primary bg-primary/5 text-left">
                  <div className="bg-primary/10 text-primary p-2.5 rounded-lg shrink-0">
                    <SectorIcon sector={legacyBusiness.businessSector} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-foreground truncate">
                        {legacyBusiness.name}
                      </h4>
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-extrabold uppercase">
                        Activo
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground-muted mt-0.5">
                      {SECTOR_LABEL[legacyBusiness.businessSector] || "Comercio"}
                    </p>
                  </div>
                </div>
              )}

              {profiles.map((p) => {
                const isActive = activeProfileId === p.id;
                return (
                  <div
                    key={p.id}
                    className={`w-full flex items-center gap-2 p-4 rounded-xl border text-left transition-all ${
                      isActive
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-white hover:border-primary hover:shadow"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(p.id)}
                      disabled={activatingId !== null || creating || deletingId !== null}
                      className="flex-1 flex items-center gap-3 text-left disabled:opacity-60 min-w-0"
                    >
                      <div className="bg-primary/10 text-primary p-2.5 rounded-lg shrink-0">
                        <SectorIcon sector={p.businessSector} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-foreground truncate">
                            {p.name}
                          </h4>
                          {isActive && (
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-extrabold uppercase">
                              Activo
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-foreground-muted mt-0.5">
                          {SECTOR_LABEL[p.businessSector] || p.businessSector}
                        </p>
                      </div>
                      {activatingId === p.id ? (
                        <Loader2 size={18} className="animate-spin text-primary shrink-0" />
                      ) : (
                        <CheckCircle2 size={18} className="text-foreground-muted shrink-0" />
                      )}
                    </button>

                    {canDelete && p.deletable && (
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        disabled={deletingId !== null || activatingId !== null}
                        className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                        title="Eliminar negocio"
                        aria-label={`Eliminar ${p.name}`}
                      >
                        {deletingId === p.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}

              {canCreate && !showCreate && (
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-border bg-white/50 hover:border-primary hover:bg-primary/5 text-foreground-muted hover:text-primary transition-all"
                >
                  <Plus size={18} /> Crear nuevo negocio
                </button>
              )}
            </div>
          )}

          {!loading && showCreate && (
            <form onSubmit={handleCreate} className="mt-5 p-4 rounded-xl border border-border bg-white space-y-3">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Plus size={16} className="text-primary" /> Nuevo negocio
              </h3>
              <Input
                label="Nombre del negocio *"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="ej. Ropa Outlet"
              />
              <Select
                label="Rubro"
                value={newSector}
                onChange={(e) => setNewSector(e.target.value)}
              >
                <option value="GASTRONOMIA">Gastronomía / Comida</option>
                <option value="INDUMENTARIA">Indumentaria / Ropa</option>
                <option value="MINIMARKET">Minimarket</option>
                <option value="RETAIL_GENERAL">Comercio general</option>
              </Select>
              <div className="flex gap-2 justify-end pt-1">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={creating}>
                  {creating ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                  Crear negocio
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="p-4 border-t border-border shrink-0 flex items-center justify-end">
          {onClose && (
            <Button type="button" variant="ghost" onClick={onClose} disabled={activatingId !== null || creating || deletingId !== null}>
              Cancelar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
