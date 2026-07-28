"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Trash2, Search, RefreshCcw } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";

interface Client {
  id: number;
  firstName: string;
  lastName?: string;
}

interface Product {
  id: number;
  name: string;
  priceSale: number;
  quantityStock: number;
}

interface SelectedItem {
  productId: number;
  productName: string;
  priceAtGiven: number;
  quantityGiven: number | string;
  availableStock: number;
}

export default function NuevaConsignacionPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [clientsRes, productsRes] = await Promise.all([
          fetch("/api/clients"),
          fetch("/api/products"),
        ]);
        if (clientsRes.ok) setClients(await clientsRes.json());
        if (productsRes.ok) {
          const pData = await productsRes.json();
          setProducts(
            pData.map((p: any) => ({
              ...p,
              priceSale: parseFloat(String(p.priceSale)),
              quantityStock: parseFloat(String(p.quantityStock)),
            }))
          );
        }
      } catch (err: any) {
        toast.error("Error al cargar datos iniciales.");
      } finally {
        setFetchingData(false);
      }
    };
    loadInitialData();
  }, []);

  const handleAddProduct = (product: Product) => {
    const existing = selectedItems.find((i) => i.productId === product.id);
    if (existing) {
      const currentQty = parseFloat(String(existing.quantityGiven)) || 0;
      if (currentQty + 1 > product.quantityStock) {
        toast.error(`Stock máximo disponible alcanzado (${product.quantityStock}).`);
        return;
      }
      setSelectedItems((prev) =>
        prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantityGiven: currentQty + 1 }
            : i
        )
      );
    } else {
      if (product.quantityStock < 1) {
        toast.error("Este producto no tiene stock disponible.");
        return;
      }
      setSelectedItems((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          priceAtGiven: product.priceSale,
          quantityGiven: 1,
          availableStock: product.quantityStock,
        },
      ]);
    }
  };

  const handleRemoveItem = (productId: number) => {
    setSelectedItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleQuantityChange = (productId: number, rawVal: string) => {
    setSelectedItems((prev) =>
      prev.map((i) => {
        if (i.productId === productId) {
          if (rawVal === "") {
            return { ...i, quantityGiven: "" };
          }
          const num = parseFloat(rawVal);
          if (isNaN(num)) return { ...i, quantityGiven: rawVal };
          const capped = Math.min(num, i.availableStock);
          return { ...i, quantityGiven: capped };
        }
        return i;
      })
    );
  };

  const handleQuantityBlur = (productId: number) => {
    setSelectedItems((prev) =>
      prev.map((i) => {
        if (i.productId === productId) {
          const num = parseFloat(String(i.quantityGiven));
          if (isNaN(num) || num <= 0) {
            return { ...i, quantityGiven: 1 };
          }
        }
        return i;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      toast.error("Por favor selecciona un cliente.");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Agrega al menos un producto a la consignación.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/consignaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          notes,
          items: selectedItems.map((i) => ({
            productId: i.productId,
            quantityGiven: parseFloat(String(i.quantityGiven)) || 1,
            priceAtGiven: i.priceAtGiven,
          })),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Error al registrar la consignación.");
      }

      toast.success("¡Consignación registrada exitosamente!");
      router.push("/consignaciones");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-3">
          <ArrowLeft size={16} className="mr-2" /> Volver
        </Button>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <RefreshCcw className="text-primary" size={28} /> Nueva Consignación
        </h1>
        <p className="text-foreground-muted text-sm mt-1">
          Registra la entrega de mercadería a consignación. Se descontará del stock local.
        </p>
      </div>

      {fetchingData ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 size={32} className="animate-spin text-primary" />
          <span className="ml-3 text-foreground-muted">Cargando catálogo...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cliente & Notas */}
          <div className="bg-muted p-6 rounded-xl shadow space-y-4">
            <h2 className="text-lg font-semibold text-foreground">1. Datos del Cliente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Cliente *
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">-- Selecciona un cliente --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName || ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Notas u Observaciones (Opcional)
                </label>
                <Input
                  type="text"
                  placeholder="Ej: Entregado para feria de fin de semana"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Selección de Productos */}
          <div className="bg-muted p-6 rounded-xl shadow space-y-4">
            <h2 className="text-lg font-semibold text-foreground">2. Selección de Productos</h2>

            <div className="relative max-w-lg">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Buscar Producto para Agregar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" size={18} />
                <Input
                  type="text"
                  placeholder="Escribí nombre del producto..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Menú Flotante de Resultados de Búsqueda */}
              {productSearch.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto divide-y divide-border">
                  {filteredProducts.length === 0 ? (
                    <div className="p-3 text-sm text-foreground-muted text-center">
                      No se encontraron productos para "{productSearch}"
                    </div>
                  ) : (
                    filteredProducts.slice(0, 8).map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          handleAddProduct(p);
                          setProductSearch("");
                        }}
                        className="flex items-center justify-between p-3 hover:bg-blue-50/50 cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="font-medium text-sm text-foreground">{p.name}</div>
                          <div className="text-xs text-foreground-muted">
                            Stock disponible: <strong className={p.quantityStock > 0 ? "text-emerald-600" : "text-red-500"}>{p.quantityStock} u.</strong>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-sm text-primary">
                            ${p.priceSale}
                          </span>
                          <button
                            type="button"
                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <Plus size={14} /> Agregar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Ítems Seleccionados */}
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-semibold text-foreground">Productos a entregar:</h3>
              {selectedItems.length === 0 ? (
                <p className="text-sm text-foreground-muted italic">No has agregado ningún producto aún.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-foreground font-semibold">
                        <th className="p-2">Producto</th>
                        <th className="p-2">Precio Unit.</th>
                        <th className="p-2 w-32">Cant. Entregada</th>
                        <th className="p-2 text-right">Subtotal</th>
                        <th className="p-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedItems.map((item) => (
                        <tr key={item.productId}>
                          <td className="p-2 font-medium">{item.productName}</td>
                          <td className="p-2 text-foreground-muted">${item.priceAtGiven}</td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="any"
                              min={0.001}
                              max={item.availableStock}
                              value={item.quantityGiven}
                              onChange={(e) =>
                                handleQuantityChange(item.productId, e.target.value)
                              }
                              onBlur={() => handleQuantityBlur(item.productId)}
                              className="w-24 text-center py-1"
                            />
                          </td>
                          <td className="p-2 text-right font-semibold">
                            ${(item.priceAtGiven * (parseFloat(String(item.quantityGiven)) || 0)).toFixed(2)}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.productId)}
                              className="text-foreground-muted hover:text-destructive p-1 rounded-md"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => router.back()} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={loading || selectedItems.length === 0}>
              {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
              Registrar Consignación
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
