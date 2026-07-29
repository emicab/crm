import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface CreditCardPromotion {
  id: number;
  bank: string;
  installments: string;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  active: boolean;
}

export default function ConfigPromocionesTarjetasTab() {
  const [promotions, setPromotions] = useState<CreditCardPromotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<number | null>(null);

  // Form State
  const [form, setForm] = useState({
    bank: "",
    installments: "",
    startDate: "",
    endDate: "",
    notes: "",
    active: true,
  });

  const fetchPromotions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/credit-card-promotions");
      if (res.ok) {
        const data = await res.json();
        setPromotions(data);
      }
    } catch (error) {
      console.error("Error fetching promotions:", error);
      toast.error("Error al cargar promociones.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleEditClick = (promo: CreditCardPromotion) => {
    setIsEditing(promo.id);
    setForm({
      bank: promo.bank,
      installments: promo.installments,
      startDate: promo.startDate ? promo.startDate.split("T")[0] : "",
      endDate: promo.endDate ? promo.endDate.split("T")[0] : "",
      notes: promo.notes || "",
      active: promo.active,
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(null);
    setForm({
      bank: "",
      installments: "",
      startDate: "",
      endDate: "",
      notes: "",
      active: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bank || !form.installments) {
      toast.error("El banco y las cuotas son obligatorios.");
      return;
    }

    try {
      const url = isEditing 
        ? `/api/credit-card-promotions/${isEditing}` 
        : "/api/credit-card-promotions";
      
      const method = isEditing ? "PUT" : "POST";

      const payload = {
        ...form,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();

      toast.success(isEditing ? "Promoción actualizada." : "Promoción creada.");
      handleCancelEdit();
      fetchPromotions();
    } catch (error) {
      toast.error("Error al guardar la promoción.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Estás seguro de eliminar esta promoción?")) return;
    try {
      const res = await fetch(`/api/credit-card-promotions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Promoción eliminada.");
      fetchPromotions();
    } catch (error) {
      toast.error("Error al eliminar la promoción.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-foreground mb-4">
          {isEditing ? "Editar Promoción Bancaria" : "Nueva Promoción Bancaria"}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Banco / Tarjeta *"
            name="bank"
            placeholder="Ej: Banco Galicia"
            value={form.bank}
            onChange={handleInputChange}
            required
          />
          <Input
            label="Cuotas *"
            name="installments"
            placeholder="Ej: 3 y 6 sin interés"
            value={form.installments}
            onChange={handleInputChange}
            required
          />
          <Input
            label="Fecha Inicio (Opcional)"
            name="startDate"
            type="date"
            value={form.startDate}
            onChange={handleInputChange}
          />
          <Input
            label="Fecha Fin (Opcional)"
            name="endDate"
            type="date"
            value={form.endDate}
            onChange={handleInputChange}
          />
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-foreground-muted mb-1 uppercase tracking-wider">
              Notas Adicionales (Opcional)
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleInputChange as any}
              placeholder="Ej: Solo aplica a indumentaria..."
              className="block w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              rows={2}
            />
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              name="active"
              checked={form.active}
              onChange={handleInputChange as any}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
            />
            <label htmlFor="active" className="text-sm font-medium text-foreground">
              Promoción Activa
            </label>
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 mt-2">
            {isEditing && (
              <Button type="button" variant="outline" onClick={handleCancelEdit}>
                Cancelar
              </Button>
            )}
            <Button type="submit" className="gap-2">
              {isEditing ? <Edit2 size={16} /> : <Plus size={16} />}
              {isEditing ? "Guardar Cambios" : "Agregar Promoción"}
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Calendar size={16} className="text-primary" />
            Promociones Cargadas
          </h2>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center text-foreground-muted">Cargando...</div>
        ) : promotions.length === 0 ? (
          <div className="p-8 text-center text-foreground-muted">
            No hay promociones cargadas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/50 border-b border-border text-foreground-muted text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-bold">Banco / Tarjeta</th>
                  <th className="px-4 py-3 font-bold">Cuotas</th>
                  <th className="px-4 py-3 font-bold">Vigencia</th>
                  <th className="px-4 py-3 font-bold">Estado</th>
                  <th className="px-4 py-3 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {promotions.map((promo) => {
                  const now = new Date();
                  const isExpired = promo.endDate && new Date(promo.endDate) < now;
                  
                  return (
                    <tr key={promo.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{promo.bank}</td>
                      <td className="px-4 py-3">{promo.installments}</td>
                      <td className="px-4 py-3 text-xs text-foreground-muted">
                        {promo.startDate ? new Date(promo.startDate).toLocaleDateString() : "-"} a {" "}
                        {promo.endDate ? new Date(promo.endDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3">
                        {!promo.active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                            Inactiva
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                            Vencida
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Activa
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleEditClick(promo)}
                          className="text-slate-400 hover:text-primary transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(promo.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
