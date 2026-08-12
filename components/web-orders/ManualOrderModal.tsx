"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Search,
  Plus,
  Minus,
  Trash2,
  Package,
  Settings2,
  Loader2,
  Check,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { formatCurrency } from "@/lib/formatCurrency";
import toast from "react-hot-toast";

interface ManualItemModifier {
  groupName: string;
  optionName: string;
  priceExtra: number;
  colorHex?: string;
  ingredientId?: number | null;
  ingredientQty?: number;
}

interface ManualItem {
  key: number;
  productId: number;
  productName: string;
  quantity: number;
  priceSale: number;
  modifiers: ManualItemModifier[];
}

interface ModifierPickerState {
  itemKey: number;
  productName: string;
  groups: any[];
  selections: Record<number, ManualItemModifier[]>;
}

interface ManualOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const ORIGIN_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "PHONE", label: "Teléfono" },
  { value: "IN_STORE", label: "Presencial" },
  { value: "OTHER", label: "Otro" },
];

export default function ManualOrderModal({ isOpen, onClose, onCreated }: ManualOrderModalProps) {
  const [origin, setOrigin] = useState("WHATSAPP");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [deliveryType, setDeliveryType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [paymentMethod, setPaymentMethod] = useState("CASH_ON_DELIVERY");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ManualItem[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [picker, setPicker] = useState<ModifierPickerState | null>(null);
  const [pickerGroupsLoading, setPickerGroupsLoading] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [searchedClients, setSearchedClients] = useState<any[]>([]);
  const [clientSearchLoading, setClientSearchLoading] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClient, setNewClient] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: "",
  });
  const [creatingClient, setCreatingClient] = useState(false);
  const nextKeyRef = React.useRef(1);

  useEffect(() => {
    if (!isOpen) return;
    setOrigin("WHATSAPP");
    setClientName("");
    setClientPhone("");
    setClientEmail("");
    setShippingAddress("");
    setDeliveryType("PICKUP");
    setPaymentMethod("CASH_ON_DELIVERY");
    setNotes("");
    setItems([]);
    setProductSearch("");
    setPicker(null);
    setClientSearchTerm("");
    setSearchedClients([]);
    setShowNewClientForm(false);
    setNewClient({ firstName: "", lastName: "", phone: "", email: "", address: "" });
    nextKeyRef.current = 1;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingProducts(true);
    fetch("/api/products")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setAllProducts(Array.isArray(data) ? data : []))
      .catch(() => setAllProducts([]))
      .finally(() => setLoadingProducts(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || clientSearchTerm.trim() === "") {
      setSearchedClients([]);
      setClientSearchLoading(false);
      return;
    }
    setClientSearchLoading(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients?search=${encodeURIComponent(clientSearchTerm.trim())}`);
        const data = res.ok ? await res.json() : [];
        setSearchedClients(Array.isArray(data) ? data : []);
      } catch {
        setSearchedClients([]);
      } finally {
        setClientSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [clientSearchTerm, isOpen]);

  const searchedProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return [];
    return allProducts
      .filter((p: any) => {
        const name = String(p.name || "").toLowerCase();
        const sku = String(p.sku || "").toLowerCase();
        return name.includes(term) || sku.includes(term);
      })
      .slice(0, 10);
  }, [allProducts, productSearch]);

  const addItem = (p: any) => {
    setItems((prev) => [
      ...prev,
      {
        key: nextKeyRef.current++,
        productId: Number(p.id),
        productName: p.name,
        quantity: 1,
        priceSale: Number(p.priceSale) || 0,
        modifiers: [],
      },
    ]);
    setProductSearch("");
  };

  const handleProductSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const term = productSearch.trim();
    if (term === "") return;
    if (searchedProducts.length > 0) {
      addItem(searchedProducts[0]);
      return;
    }
    if (/^\d+$/.test(term) && items.length > 0) {
      const lastKey = items[items.length - 1].key;
      const qty = Math.max(1, Number(term));
      setItems((prev) => prev.map((i) => (i.key === lastKey ? { ...i, quantity: qty } : i)));
      setProductSearch("");
      toast.success(`Cantidad del último producto: ${qty}`);
    }
  };

  const removeItem = (key: number) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const setItemQty = (key: number, delta: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.key !== key) return i;
        const qty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: qty };
      }),
    );
  };

  const itemUnitPrice = (i: ManualItem) =>
    i.priceSale + i.modifiers.reduce((sum, m) => sum + (Number(m.priceExtra) || 0), 0);

  const totalAmount = items.reduce((sum, i) => sum + itemUnitPrice(i) * i.quantity, 0);

  const openPicker = async (item: ManualItem) => {
    setPickerGroupsLoading(true);
    try {
      const res = await fetch(`/api/products/${item.productId}/modifiers`);
      const groups = res.ok ? await res.json() : [];
      const selections: Record<number, ManualItemModifier[]> = {};
      for (const g of groups) {
        selections[g.id] = item.modifiers.filter((m) => m.groupName === g.name);
      }
      setPicker({ itemKey: item.key, productName: item.productName, groups, selections });
    } catch {
      toast.error("No se pudieron cargar los modificadores.");
    } finally {
      setPickerGroupsLoading(false);
    }
  };

  const pickerGroupSelected = (groupId: number) => picker?.selections[groupId] || [];

  const handlePickerSingle = (groupId: number, groupName: string, opt: any) => {
    if (!picker) return;
    const nextSelections = {
      ...picker.selections,
      [groupId]: [
        {
          groupName,
          optionName: opt.name,
          priceExtra: parseFloat(opt.priceExtra) || 0,
          colorHex: opt.colorHex,
          ingredientId: opt.ingredientId ?? null,
          ingredientQty: parseFloat(opt.ingredientQty) || 1,
        },
      ],
    };
    setPicker({ ...picker, selections: nextSelections });
  };

  const handlePickerMulti = (groupId: number, groupName: string, opt: any, isChecked: boolean) => {
    if (!picker) return;
    const current = picker.selections[groupId] || [];
    const nextList = isChecked
      ? [
          ...current,
          {
            groupName,
            optionName: opt.name,
            priceExtra: parseFloat(opt.priceExtra) || 0,
            colorHex: opt.colorHex,
            ingredientId: opt.ingredientId ?? null,
            ingredientQty: parseFloat(opt.ingredientQty) || 1,
          },
        ]
      : current.filter((o) => o.optionName !== opt.name);
    setPicker({ ...picker, selections: { ...picker.selections, [groupId]: nextList } });
  };

  const confirmPicker = () => {
    if (!picker) return;
    const picked = Object.values(picker.selections).flat();
    setItems((prev) => prev.map((i) => (i.key === picker.itemKey ? { ...i, modifiers: picked } : i)));
    setPicker(null);
  };

  const selectClient = (client: any) => {
    setClientName([client.firstName, client.lastName].filter(Boolean).join(" ").trim());
    setClientPhone(client.phone || "");
    setClientEmail(client.email || "");
    if (deliveryType === "DELIVERY" && client.address) {
      setShippingAddress(client.address);
    }
    setClientSearchTerm("");
    setSearchedClients([]);
    setShowNewClientForm(false);
  };

  const handleCreateClient = async () => {
    if (!newClient.firstName.trim()) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    setCreatingClient(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: newClient.firstName.trim(),
          lastName: newClient.lastName.trim() || undefined,
          phone: newClient.phone.trim() || undefined,
          email: newClient.email.trim() || undefined,
          address: newClient.address.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Error al crear el cliente.");
      }
      toast.success("Cliente creado.");
      selectClient(data);
    } catch (err: any) {
      toast.error(err.message || "Error al crear el cliente.");
    } finally {
      setCreatingClient(false);
    }
  };

  const handleSubmit = async () => {
    if (!clientName.trim() || !clientPhone.trim()) {
      toast.error("Nombre y teléfono del cliente son obligatorios.");
      return;
    }
    if (items.length === 0) {
      toast.error("Agregá al menos un producto al pedido.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/web-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webOrderNumber: `MAN-${Date.now().toString().slice(-6)}`,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          clientEmail: clientEmail.trim() || undefined,
          shippingAddress: deliveryType === "DELIVERY" ? shippingAddress.trim() || null : null,
          deliveryType,
          paymentMethod,
          notes: notes.trim() || undefined,
          origin,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            modifiers: i.modifiers,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Error al crear el pedido.");
      }
      toast.success(`Pedido ${data.webOrderNumber || ""} creado.`);
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error al crear el pedido.");
    } finally {
      setSubmitting(false);
    }
  };

  const clearItemModifiers = (key: number) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, modifiers: [] } : i)));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-border text-foreground w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Nuevo Pedido Manual</h3>
            <p className="text-xs text-foreground-muted">
              Pedidos recibidos por WhatsApp, teléfono u otros medios.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Origen */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground-muted mb-1.5">
                Origen del pedido
              </label>
              <div className="flex flex-wrap gap-2">
                {ORIGIN_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setOrigin(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                      origin === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Select
                label="Tipo de entrega"
                value={deliveryType}
                onChange={(e) => setDeliveryType(e.target.value as "PICKUP" | "DELIVERY")}
              >
                <option value="PICKUP">Retiro en sucursal</option>
                <option value="DELIVERY">Envío a domicilio</option>
              </Select>
            </div>
          </div>

          {/* Cliente */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground-muted mb-1.5">
                Buscar cliente existente
              </label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={clientSearchTerm}
                  onChange={(e) => setClientSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, teléfono o email..."
                  className="pl-9"
                />
                {clientSearchTerm.trim() !== "" && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-lg overflow-hidden">
                    {clientSearchLoading ? (
                      <div className="flex items-center justify-center gap-2 px-3 py-3 text-sm text-foreground-muted">
                        <Loader2 size={14} className="animate-spin" /> Buscando...
                      </div>
                    ) : searchedClients.length === 0 ? (
                      <div className="p-2">
                        <p className="text-sm text-foreground-muted px-3 py-1.5">
                          No se encontraron clientes.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowNewClientForm(true)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-primary hover:bg-muted rounded-lg transition-colors"
                        >
                          <Plus size={14} /> Crear nuevo cliente
                        </button>
                      </div>
                    ) : (
                      <div>
                        {searchedClients.map((client: any) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => selectClient(client)}
                            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors"
                          >
                            <span className="text-sm font-medium truncate">
                              {[client.firstName, client.lastName].filter(Boolean).join(" ").trim()}
                            </span>
                            <span className="text-xs text-foreground-muted shrink-0">
                              {client.phone || client.email || ""}
                            </span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setShowNewClientForm(true)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-primary border-t border-border hover:bg-muted transition-colors"
                        >
                          <Plus size={14} /> Crear nuevo cliente
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {showNewClientForm && (
              <div className="rounded-xl border border-border p-3 space-y-3 bg-muted/40">
                <p className="text-sm font-bold">Nuevo cliente</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Nombre *"
                    value={newClient.firstName}
                    onChange={(e) => setNewClient((prev) => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Ej: Juan"
                  />
                  <Input
                    label="Apellido"
                    value={newClient.lastName}
                    onChange={(e) => setNewClient((prev) => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Ej: Pérez"
                  />
                  <Input
                    label="Teléfono"
                    value={newClient.phone}
                    onChange={(e) => setNewClient((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="Ej: 1122334455"
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient((prev) => ({ ...prev, email: e.target.value }))}
                  />
                  <div className="sm:col-span-2">
                    <Input
                      label="Dirección"
                      value={newClient.address}
                      onChange={(e) => setNewClient((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="Calle, altura, localidad"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewClientForm(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="button" size="sm" onClick={handleCreateClient} disabled={creatingClient}>
                    {creatingClient ? (
                      <Loader2 size={14} className="animate-spin mr-1" />
                    ) : (
                      <Plus size={14} className="mr-1" />
                    )}
                    Guardar cliente
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nombre del cliente *"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ej: Juan Pérez"
              />
              <Input
                label="Teléfono *"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="Ej: 1122334455"
              />
              <Input
                label="Email (opcional)"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
              {deliveryType === "DELIVERY" ? (
                <Input
                  label="Dirección de envío"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Calle, altura, localidad"
                />
              ) : (
                <Select
                  label="Método de pago"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="CASH_ON_DELIVERY">Contado contra entrega</option>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="MERCADO_PAGO">Mercado Pago</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="TARJETA">Tarjeta</option>
                </Select>
              )}
              {deliveryType === "DELIVERY" && (
                <Select
                  label="Método de pago"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="CASH_ON_DELIVERY">Contado contra entrega</option>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="MERCADO_PAGO">Mercado Pago</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="TARJETA">Tarjeta</option>
                </Select>
              )}
            </div>
          </div>

          {/* Items */}
          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-1.5">
              Productos
            </label>
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                onKeyDown={handleProductSearchKeyDown}
                placeholder="Buscar producto por nombre o SKU..."
                className="pl-9"
                autoFocus
              />
              {searchedProducts.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-lg overflow-hidden">
                  {searchedProducts.map((p: any) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addItem(p)}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors"
                    >
                      <span className="text-sm font-medium truncate flex items-center gap-2">
                        <Package size={14} className="text-muted-foreground shrink-0" />
                        {p.name}
                      </span>
                      <span className="text-xs font-bold text-foreground shrink-0">
                        {formatCurrency(Number(p.priceSale))}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <p className="text-[11px] text-foreground-muted mb-3 -mt-1">
              Enter agrega el primer resultado · número + Enter cambia la cantidad
            </p>

            {items.length === 0 ? (
              <div className="text-sm text-foreground-muted text-center py-6 border border-dashed border-border rounded-xl">
                {loadingProducts ? "Cargando productos..." : "Buscá y agregá productos al pedido."}
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => {
                  const unitPrice = itemUnitPrice(item);
                  return (
                    <div
                      key={item.key}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{item.productName}</p>
                        <p className="text-[11px] text-foreground-muted truncate">
                          {item.modifiers.length > 0
                            ? item.modifiers.map((m) => m.optionName).join(", ")
                            : "Sin personalizar"}
                        </p>
                        <p className="text-xs font-bold mt-0.5">
                          {formatCurrency(unitPrice)} <span className="text-foreground-muted font-normal">c/u</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1 border border-border rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => setItemQty(item.key, -1)}
                          className="p-1 rounded-md hover:bg-muted text-muted-foreground"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setItemQty(item.key, 1)}
                          className="p-1 rounded-md hover:bg-muted text-muted-foreground"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="w-20 text-right text-sm font-black">
                        {formatCurrency(unitPrice * item.quantity)}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openPicker(item)}
                        title="Personalizar modificadores"
                      >
                        <Settings2 size={14} />
                      </Button>
                      {item.modifiers.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => clearItemModifiers(item.key)}
                          title="Quitar personalización"
                        >
                          <X size={14} />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.key)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Input
            label="Notas (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: segundo piso, timbre de abajo, sin ajo..."
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-background flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-foreground-muted">Total estimado</p>
            <p className="text-2xl font-black text-primary">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <Plus size={16} className="mr-2" />
              )}
              Crear Pedido
            </Button>
          </div>
        </div>
      </div>

      {/* Modifier picker overlay */}
      {picker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background border border-border text-foreground w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">Personalizar</h4>
                <p className="text-xs text-foreground-muted truncate">{picker.productName}</p>
              </div>
              <button
                onClick={() => setPicker(null)}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {pickerGroupsLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 size={20} className="animate-spin mr-2" /> Cargando...
                </div>
              ) : picker.groups.length === 0 ? (
                <p className="text-sm text-foreground-muted text-center py-6">
                  Este producto no tiene modificadores configurables.
                </p>
              ) : (
                picker.groups.map((grp: any) => {
                  const selectedList = pickerGroupSelected(grp.id);
                  const isSizeColor = grp.type === "SIZE_COLOR";
                  return (
                    <div key={grp.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold flex items-center gap-1.5">
                          {grp.name}
                          {grp.isRequired && (
                            <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-bold">
                              Obligatorio
                            </span>
                          )}
                        </p>
                        <span className="text-[11px] text-foreground-muted">
                          {grp.type === "SINGLE_SELECT" ? "Elige 1" : "Opcional"}
                        </span>
                      </div>
                      <div className={isSizeColor ? "flex flex-wrap gap-2" : "space-y-1.5"}>
                        {(grp.options || []).map((opt: any) => {
                          const isSelected = selectedList.some((o) => o.optionName === opt.name);
                          const extra = parseFloat(opt.priceExtra) || 0;
                          if (isSizeColor) {
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => handlePickerSingle(grp.id, grp.name, opt)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "border-border bg-background hover:border-primary/50"
                                }`}
                              >
                                {opt.colorHex && (
                                  <span
                                    className="w-4 h-4 rounded-full border border-black/20 inline-block"
                                    style={{ backgroundColor: opt.colorHex }}
                                  />
                                )}
                                <span>{opt.name}</span>
                                {extra > 0 && <span className="opacity-80">(+{formatCurrency(extra)})</span>}
                              </button>
                            );
                          }
                          if (grp.type === "SINGLE_SELECT") {
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => handlePickerSingle(grp.id, grp.name, opt)}
                                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                                  isSelected
                                    ? "bg-primary/10 border-primary text-primary"
                                    : "border-border bg-background hover:border-primary/50"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span
                                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                      isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                                    }`}
                                  >
                                    {isSelected && <Check size={10} />}
                                  </span>
                                  {opt.name}
                                </span>
                                {extra > 0 && <span>{formatCurrency(extra)}</span>}
                              </button>
                            );
                          }
                          return (
                            <label
                              key={opt.id}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-primary/10 border-primary text-primary"
                                  : "border-border bg-background hover:border-primary/50"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) =>
                                    handlePickerMulti(grp.id, grp.name, opt, e.target.checked)
                                  }
                                  className="w-4 h-4 rounded border-border text-primary focus:ring-ring accent-primary"
                                />
                                {opt.name}
                              </span>
                              {extra > 0 && <span>{formatCurrency(extra)}</span>}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-4 border-t border-border flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPicker(null)}>
                Cancelar
              </Button>
              <Button type="button" onClick={confirmPicker}>
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
