"use client";

import React, { useEffect, useState } from "react";
import { Loader2, X, ChefHat } from "lucide-react";
import { toast } from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

interface IngredientFormProps {
  initial?: any | null;
  onClose: () => void;
  onSaved: () => void;
}

const IngredientForm: React.FC<IngredientFormProps> = ({ initial, onClose, onSaved }) => {
  const [name, setName] = useState(initial?.name || "");
  const [unitType, setUnitType] = useState(initial?.unitType || "UNIT");
  const [quantityStock, setQuantityStock] = useState(
    initial ? String(initial.quantityStock ?? 0) : "",
  );
  const [stockMinAlert, setStockMinAlert] = useState(
    initial?.stockMinAlert != null ? String(initial.stockMinAlert) : "",
  );
  const [pricePurchase, setPricePurchase] = useState(
    initial?.pricePurchase != null ? String(initial.pricePurchase) : "",
  );
  const [supplierId, setSupplierId] = useState(
    initial?.supplierId ? String(initial.supplierId) : "",
  );
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/proveedores")
      .then((res) => res.json())
      .then((data) => setSuppliers(Array.isArray(data) ? data : []))
      .catch(() => setSuppliers([]))
      .finally(() => setIsLoadingSuppliers(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    const stock = parseFloat(quantityStock);
    if (isNaN(stock) || stock < 0) {
      setError("El stock inicial debe ser un número mayor o igual a 0.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        unitType,
        quantityStock: stock,
        stockMinAlert: stockMinAlert !== "" ? parseFloat(stockMinAlert) : null,
        pricePurchase: pricePurchase !== "" ? parseFloat(pricePurchase) : 0,
        supplierId: supplierId ? parseInt(supplierId) : null,
        isIngredient: true,
        isRecipe: false,
        priceSale: 0,
        isPublicWeb: false,
      };

      const res = initial
        ? await fetch(`/api/products/${initial.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Error al guardar el ingrediente.");
      }

      toast.success(initial ? "Ingrediente actualizado." : "Ingrediente creado.");
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || "No se pudo guardar el ingrediente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <ChefHat size={18} className="text-amber-600" />
            {initial ? "Editar Ingrediente" : "Nuevo Ingrediente"}
          </h3>
          <button onClick={onClose} className="text-foreground-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
          )}

          <Input
            label="Nombre *"
            placeholder="Ej. Tomate, Huevo, Queso..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Select label="Tipo de Unidad *" value={unitType} onChange={(e) => setUnitType(e.target.value)}>
              <option value="UNIT">Unidad</option>
              <option value="WEIGHT">Peso (kg)</option>
              <option value="VOLUME">Volumen (L)</option>
            </Select>
            <Input
              label={`Stock inicial * ${unitType === "WEIGHT" ? "(kg)" : unitType === "VOLUME" ? "(L)" : "(u)"}`}
              type="number"
              step="0.001"
              min="0"
              value={quantityStock}
              onChange={(e) => setQuantityStock(e.target.value)}
            />
          </div>

          <Input
            label={`Alerta Stock Mínimo ${unitType === "WEIGHT" ? "(kg)" : unitType === "VOLUME" ? "(L)" : "(u, opcional)"}`}
            type="number"
            step="0.001"
            min="0"
            value={stockMinAlert}
            onChange={(e) => setStockMinAlert(e.target.value)}
          />

          <Input
            label={`Costo / Precio de Compra ${unitType === "WEIGHT" ? "(por kg, opcional)" : unitType === "VOLUME" ? "(por L, opcional)" : "(por unidad, opcional)"}`}
            type="number"
            step="0.01"
            min="0"
            value={pricePurchase}
            onChange={(e) => setPricePurchase(e.target.value)}
            placeholder="Ej. 1500"
          />

          <Select
            label="Proveedor (Opcional)"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            disabled={isLoadingSuppliers}
          >
            <option value="">{isLoadingSuppliers ? "Cargando..." : "Sin proveedor"}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={String(s.id)}>{s.name}</option>
            ))}
          </Select>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              {saving ? "Guardando..." : initial ? "Guardar" : "Crear Ingrediente"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IngredientForm;
