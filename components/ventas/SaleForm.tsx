"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Client, Seller, Product, PaymentTypeEnum, Combo, Promotion } from "@/types";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { getPaymentTypeDisplay } from "@/lib/displayTexts";
import { loadCart, clearCart } from "@/hooks/useCartPersistence";
import { useSaleTotals } from "@/hooks/useSaleTotals";
import { usePromotionsEngine } from "@/hooks/usePromotionsEngine";
import WeightModal from "@/components/ventas/WeightModal";
import UnitTypeModal from "@/components/ventas/UnitTypeModal";
import CajaModal from "@/components/ventas/CajaModal";
import CartModal from "@/components/ventas/CartModal";
import SaleSummaryBar from "@/components/ventas/SaleSummaryBar";
import ProductSearchPanel from "@/components/ventas/ProductSearchPanel";
import AdditionalDetailsSection from "@/components/ventas/AdditionalDetailsSection";
import type { SaleItemInCart } from "@/types";

interface CurrentItemState {
  productId: string;
  productName: string;
  quantity: number | "";
  priceAtSale: number | "";
  availableStock: number;
  unitType?: string | null;
}

interface SaleFormData {
  clientId: string;
  sellerId: string;
  paymentType: PaymentTypeEnum | "";
  notes: string;
  items: SaleItemInCart[];
  discountCode: string;
}

const initialCurrentItemState: CurrentItemState = {
  productId: "", productName: "", quantity: 1, priceAtSale: 0, availableStock: 0, unitType: null,
};

const initialFormData: SaleFormData = {
  clientId: "", sellerId: "", paymentType: "", notes: "", items: [], discountCode: "",
};

const SaleForm = () => {
  const router = useRouter();
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barcodeInput = useRef("");
  const productInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const savedCart = useRef(loadCart());
  const [formData, setFormData] = useState<SaleFormData>(() => ({
    clientId: savedCart.current?.clientId || "",
    sellerId: savedCart.current?.sellerId || "",
    paymentType: savedCart.current?.paymentType as PaymentTypeEnum | "" || "",
    notes: savedCart.current?.notes || "",
    items: savedCart.current?.items || [],
    discountCode: savedCart.current?.discountCode || "",
  }));
  const [comboDiscounts, setComboDiscounts] = useState<Record<number, number>>(savedCart.current?.comboDiscounts || {});
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInitialData, setIsFetchingInitialData] = useState(true);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [searchedProducts, setSearchedProducts] = useState<Product[]>([]);
  const [currentItem, setCurrentItem] = useState<CurrentItemState>(initialCurrentItemState);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [searchedClients, setSearchedClients] = useState<Client[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [hasOpenCaja, setHasOpenCaja] = useState(false);

  const [showCajaModal, setShowCajaModal] = useState(false);
  const [isOpeningCaja, setIsOpeningCaja] = useState(false);
  const [showUnitTypeModal, setShowUnitTypeModal] = useState(false);
  const [pendingUnitTypeProduct, setPendingUnitTypeProduct] = useState<Product | null>(null);
  const [selectedUnitType, setSelectedUnitType] = useState<string>('');
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInputValue, setWeightInputValue] = useState('');
  const [pendingWeightProduct, setPendingWeightProduct] = useState<Product | null>(null);
  const [pendingWeightUnitType, setPendingWeightUnitType] = useState('');
  const weightInputRef = useRef<HTMLInputElement>(null);
  const [showCartModal, setShowCartModal] = useState(false);
  const [validDiscountCode, setValidDiscountCode] = useState<{ code: string; percent: number } | null>(null);

  const comboDiscount = useMemo(() => Object.values(comboDiscounts).reduce((sum, d) => sum + d, 0), [comboDiscounts]);

  const totals = useSaleTotals({
    items: formData.items,
    comboDiscounts,
    appliedPromotion: null,
    validDiscountCode,
    paymentType: formData.paymentType,
    config,
    discountCode: formData.discountCode,
  });

  const appliedPromotion = usePromotionsEngine(formData.items, totals.subtotal, comboDiscount, promotions);

  const appliedPromotionRef = useRef(appliedPromotion);
  appliedPromotionRef.current = appliedPromotion;

  useEffect(() => {
    const fetchData = async () => {
      setIsFetchingInitialData(true);
      try {
        const [sellersRes, cajaRes, combosRes, promosRes, configRes] = await Promise.all([
          fetch("/api/vendedores"), fetch("/api/caja"), fetch("/api/combos"),
          fetch("/api/promotions"), fetch("/api/config"),
        ]);
        if (!sellersRes.ok) throw new Error("Error al cargar datos iniciales.");
        setSellers(await sellersRes.json());
        if (cajaRes.ok) {
          const cajaData = await cajaRes.json();
          setHasOpenCaja(!!cajaData.open);
          if (cajaData.open?.seller?.id) setFormData(prev => ({ ...prev, sellerId: String(cajaData.open.seller.id) }));
        }
        if (combosRes.ok) {
          const data = await combosRes.json();
          setCombos(data.filter((c: any) => c.active).map((c: any) => ({
            ...c, price: parseFloat(c.price),
            items: c.items.map((i: any) => ({ ...i, customPrice: i.customPrice ? parseFloat(i.customPrice) : null })),
          })));
        }
        if (promosRes.ok) {
          const data = await promosRes.json();
          setPromotions(data.filter((p: any) => {
            if (p.status !== 'ACTIVE') return false;
            const now = new Date();
            if (p.startDate && new Date(p.startDate) > now) return false;
            if (p.endDate && new Date(p.endDate) < now) return false;
            return true;
          }).map((p: any) => ({ ...p, discountValue: parseFloat(p.discountValue) })));
        }
        if (configRes.ok) setConfig(await configRes.json());
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error cargando datos.");
      } finally { setIsFetchingInitialData(false); }
    };
    fetchData();
  }, []);

  useEffect(() => {
    fetch('/api/ventas/recent-products')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) setRecentProducts(data.map((p: any) => ({
          ...p, priceSale: parseFloat(p.priceSale), quantityStock: parseFloat(p.quantityStock),
        })));
      }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isFetchingInitialData) productInputRef.current?.focus();
  }, [isFetchingInitialData]);

  useEffect(() => {
    if (clientSearchTerm.trim() === "") { setSearchedClients([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients?search=${encodeURIComponent(clientSearchTerm)}`);
        if (res.ok) setSearchedClients(await res.json());
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearchTerm]);

  useEffect(() => {
    if (!productSearchTerm.trim()) { setSearchedProducts([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(productSearchTerm)}`);
        if (res.ok) {
          const data = await res.json();
          const itemsInCartIds = formData.items.map(i => parseInt(i.productId));
          setSearchedProducts(data.filter((p: any) => !itemsInCartIds.includes(p.id)).map((p: any) => ({
            ...p, priceSale: parseFloat(p.priceSale),
            quantityStock: parseFloat(String(p.quantityStock).replace(',', '.')),
          })).slice(0, 5));
        }
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearchTerm, formData.items]);

  useEffect(() => {
    const code = formData.discountCode.trim().toUpperCase();
    if (!code) { setValidDiscountCode(null); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/discount-codes?code=${encodeURIComponent(code)}`);
        if (res.ok) {
          const data = await res.json();
          const exact = (Array.isArray(data) ? data : data.data)?.find((c: any) => c.code === code && c.isActive);
          setValidDiscountCode(exact ? { code: exact.code, percent: parseFloat(exact.discountPercent) } : null);
        }
      } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.discountCode]);

  useEffect(() => {
    try {
      localStorage.setItem('sale_cart', JSON.stringify({
        items: formData.items, clientId: formData.clientId, sellerId: formData.sellerId,
        paymentType: formData.paymentType, notes: formData.notes, discountCode: formData.discountCode,
        comboDiscounts,
      }));
    } catch {}
  }, [formData.items, formData.clientId, formData.sellerId, formData.paymentType, formData.notes, formData.discountCode, comboDiscounts]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8' || (e.ctrlKey && e.key === 'k')) { e.preventDefault(); productInputRef.current?.focus(); return; }
      if (e.key === 'Escape' && currentItem.productId) { e.preventDefault(); handleClearCurrentItem(); return; }
      if (e.key === 'F2') { e.preventDefault(); document.querySelector<HTMLSelectElement>('select[name="paymentType"]')?.focus(); return; }
      if ((e.ctrlKey && e.key === 'Enter') || e.key === 'F10') { e.preventDefault(); submitButtonRef.current?.click(); return; }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleClientSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value;
    setClientSearchTerm(searchTerm);
    if (searchTerm.trim() === "") setFormData(prev => ({ ...prev, clientId: "" }));
  };

  const handleSelectClient = (client: Client) => {
    setClientSearchTerm(`${client.firstName} ${client.lastName || ""}`.trim());
    setFormData(prev => ({ ...prev, clientId: String(client.id) }));
    setSearchedClients([]);
  };

  const handleClearClientSelection = () => {
    setClientSearchTerm(""); setFormData(prev => ({ ...prev, clientId: "" })); setSearchedClients([]);
  };

  const handleProductSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setProductSearchTerm(value);
    if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
    if (value.length > barcodeInput.current.length) {
      barcodeInput.current = value;
      barcodeTimer.current = setTimeout(() => { barcodeInput.current = ""; }, 100);
    } else barcodeInput.current = "";
  };

  const handleProductKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && barcodeInput.current.length > 0) {
      e.preventDefault();
      const code = barcodeInput.current;
      barcodeInput.current = "";
      fetch(`/api/products?search=${encodeURIComponent(code)}`).then(res => res.ok ? res.json() : [])
        .then(data => {
          const product = data?.[0];
          if (product) handleSelectProduct({ ...product, priceSale: parseFloat(product.priceSale), quantityStock: parseFloat(String(product.quantityStock).replace(',', '.')) });
          else toast.error(`Producto con código "${code}" no encontrado.`);
        }).catch(() => toast.error("Error al buscar producto por código de barras."));
    }
  };

  const addProductToCart = (product: Product, unitType: string) => {
    const newItem: SaleItemInCart = {
      productId: String(product.id), productName: product.name, availableStock: product.quantityStock,
      quantity: 1, priceAtSale: product.priceSale, tempId: Date.now(), subtotal: product.priceSale, unitType,
    };
    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setProductSearchTerm(""); setSearchedProducts([]);
  };

  const handleSelectProduct = (product: Product) => {
    if (product.quantityStock <= 0) {
      toast.error(`"${product.name}" no tiene stock disponible.`); setProductSearchTerm(""); setSearchedProducts([]);
      productInputRef.current?.focus(); return;
    }
    const existing = formData.items.find(i => i.productId === String(product.id));
    const unitType = product.unitType || 'UNIT';
    if (unitType === 'WEIGHT' || unitType === 'VOLUME') {
      setPendingWeightProduct(product); setPendingWeightUnitType(unitType);
      setWeightInputValue(existing ? String(existing.quantity * 1000) : '');
      setShowWeightModal(true); setProductSearchTerm(""); setSearchedProducts([]);
      setTimeout(() => weightInputRef.current?.focus(), 100); return;
    }
    if (existing) {
      setFormData(prev => ({
        ...prev, items: prev.items.map(i =>
          i.tempId === existing.tempId ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.priceAtSale } : i
        ),
      }));
      toast.success(`${product.name}: cantidad incrementada a ${existing.quantity + 1}`);
      setProductSearchTerm(""); setSearchedProducts([]); productInputRef.current?.focus(); return;
    }
    if (!product.unitType) {
      setPendingUnitTypeProduct(product); setSelectedUnitType(''); setShowUnitTypeModal(true);
      setProductSearchTerm(""); setSearchedProducts([]); return;
    }
    addProductToCart(product, unitType);
    setTimeout(() => productInputRef.current?.focus(), 50);
  };

  const handleWeightConfirm = (qtyInKgOrL: number) => {
    if (!pendingWeightProduct) return;
    const product = pendingWeightProduct;
    const unitType = pendingWeightUnitType;
    const existing = formData.items.find(i => i.productId === String(product.id));
    if (existing) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.map(i => i.tempId === existing.tempId ? { ...i, quantity: qtyInKgOrL, subtotal: qtyInKgOrL * i.priceAtSale } : i),
      }));
    } else {
      addProductToCart(product, unitType);
      setFormData(prev => ({
        ...prev,
        items: prev.items.map((item, idx, arr) => idx === arr.length - 1 ? { ...item, quantity: qtyInKgOrL, subtotal: qtyInKgOrL * item.priceAtSale } : item),
      }));
    }
    setShowWeightModal(false); setPendingWeightProduct(null);
    setTimeout(() => productInputRef.current?.focus(), 50);
  };

  const handleConfirmUnitType = () => {
    if (!pendingUnitTypeProduct || !selectedUnitType) return;
    addProductToCart(pendingUnitTypeProduct, selectedUnitType);
    setShowUnitTypeModal(false); setPendingUnitTypeProduct(null); setSelectedUnitType('');
    fetch(`/api/products/${pendingUnitTypeProduct.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitType: selectedUnitType }),
    }).catch(() => {});
    setTimeout(() => productInputRef.current?.focus(), 50);
  };

  const handleCurrentItemFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const normalizedValue = value.replace(',', '.');
    setCurrentItem(prev => {
      let processedValue: number | "" = normalizedValue === "" ? "" : parseFloat(normalizedValue);
      if (isNaN(Number(processedValue))) processedValue = prev[name as keyof CurrentItemState] as number | "";
      if (name === "quantity" && typeof processedValue === "number" && processedValue > prev.availableStock) {
        toast.error(`Stock máximo para ${prev.productName} es ${prev.availableStock}.`);
        processedValue = prev.availableStock;
      }
      return { ...prev, [name]: processedValue };
    });
  };

  const handleAddItemToSaleList = () => {
    const quantity = Number(currentItem.quantity);
    const priceAtSale = Number(currentItem.priceAtSale);
    if (!currentItem.productId) { toast.error("Por favor, selecciona un producto."); return; }
    if (quantity <= 0) { toast.error("La cantidad debe ser mayor a cero."); return; }
    if (priceAtSale < 0) { toast.error("El precio de venta no puede ser negativo."); return; }
    if (quantity > currentItem.availableStock) { toast.error(`Stock insuficiente. Disponible: ${currentItem.availableStock}.`); return; }
    const existing = formData.items.find(i => i.productId === currentItem.productId);
    if (existing) {
      const newQty = existing.quantity + quantity;
      setFormData(prev => ({ ...prev, items: prev.items.map(i => i.tempId === existing.tempId ? { ...i, quantity: newQty, subtotal: newQty * i.priceAtSale } : i) }));
      toast.success(`${currentItem.productName}: cantidad actualizada a ${newQty}`);
    } else {
      const newItem: SaleItemInCart = {
        productId: currentItem.productId, productName: currentItem.productName, availableStock: currentItem.availableStock,
        quantity, priceAtSale, tempId: Date.now(), subtotal: quantity * priceAtSale, unitType: currentItem.unitType || undefined,
      };
      setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
    }
    setCurrentItem(initialCurrentItemState); setProductSearchTerm("");
    setTimeout(() => productInputRef.current?.focus(), 50);
  };

  const handleItemDetailChange = (tempIdToUpdate: number, field: "quantity" | "priceAtSale", value: string) => {
    const normalizedValue = value.replace(',', '.');
    const numericValue = normalizedValue === "" ? 0 : parseFloat(normalizedValue);
    if (isNaN(numericValue)) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.tempId !== tempIdToUpdate) return item;
        const updatedItem = { ...item };
        if (field === "quantity") {
          if (numericValue > item.availableStock) { toast.error(`Stock máximo para ${item.productName} es ${item.availableStock}.`); updatedItem.quantity = item.availableStock; }
          else updatedItem.quantity = numericValue < 0 ? 0 : numericValue;
        } else updatedItem.priceAtSale = numericValue < 0 ? 0 : numericValue;
        updatedItem.subtotal = updatedItem.quantity * updatedItem.priceAtSale;
        return updatedItem;
      }),
    }));
  };

  const handleRemoveItem = (tempIdToRemove: number) => {
    setFormData(prev => {
      const removedItem = prev.items.find(i => i.tempId === tempIdToRemove);
      const remaining = prev.items.filter(item => item.tempId !== tempIdToRemove);
      if (removedItem?.comboBatchId) {
        const batchStillPresent = remaining.some(i => i.comboBatchId === removedItem.comboBatchId);
        if (!batchStillPresent) setComboDiscounts(prevDiscounts => { const next = { ...prevDiscounts }; delete next[removedItem.comboBatchId!]; return next; });
      }
      return { ...prev, items: remaining };
    });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSelectCombo = (combo: Combo) => {
    if (!combo.items || combo.items.length === 0) { toast.error('El combo no tiene productos.'); return; }
    const batchId = Date.now();
    const newItems: SaleItemInCart[] = combo.items.map(item => ({
      productId: String(item.productId), productName: `${item.product?.name || `#${item.productId}`} (Combo: ${combo.name})`,
      availableStock: item.product?.quantityStock ?? 999, quantity: item.quantity,
      priceAtSale: item.customPrice ?? item.product?.priceSale ?? 0, tempId: batchId + item.productId,
      subtotal: (item.customPrice ?? item.product?.priceSale ?? 0) * item.quantity, comboBatchId: batchId,
    }));
    const fullSum = newItems.reduce((sum, item) => sum + item.subtotal, 0);
    const discount = Math.max(0, fullSum - combo.price);
    setFormData(prev => ({ ...prev, items: [...prev.items, ...newItems] }));
    setComboDiscounts(prev => ({ ...prev, [batchId]: discount }));
    setProductSearchTerm(""); setSearchedProducts([]);
    toast.success(`Combo "${combo.name}" agregado ($${combo.price}, ahorro $${discount}).`);
    setTimeout(() => productInputRef.current?.focus(), 50);
  };

  const handleClearCurrentItem = () => { setCurrentItem(initialCurrentItemState); setProductSearchTerm(""); };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    if (!formData.paymentType) { toast.error("Seleccioná un tipo de pago."); setIsLoading(false); return; }
    if (formData.items.length === 0) { toast.error("Añadí al menos un producto a la venta."); setIsLoading(false); return; }
    if (!formData.sellerId) {
      if (!hasOpenCaja) { setShowCajaModal(true); setIsLoading(false); return; }
      toast.error("La caja abierta no tiene un vendedor asignado."); setIsLoading(false); return;
    }
    const promo = appliedPromotionRef.current;
    const dataToSend = {
      clientId: formData.clientId ? parseInt(formData.clientId) : null,
      sellerId: parseInt(formData.sellerId),
      paymentType: formData.paymentType as PaymentTypeEnum,
      notes: formData.notes.trim() || null,
      items: formData.items.map(item => ({ productId: parseInt(item.productId), quantity: item.quantity, priceAtSale: item.priceAtSale })),
      discountCodeApplied: formData.discountCode.trim() || null,
      paymentMethodDiscount: totals.paymentMethodDiscount,
      promotionsApplied: [
        ...(comboDiscount > 0 ? [{ promotionId: 0, name: 'Descuento combo', type: 'COMBO', discountAmount: comboDiscount }] : []),
        ...(promo ? [{ promotionId: promo.promotionId, name: promo.name, type: promo.type, discountAmount: promo.discountAmount }] : []),
      ],
    };
    try {
      const response = await fetch("/api/ventas", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dataToSend),
      });
      if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.message || `Error HTTP: ${response.status}`); }
      toast.success("¡Venta registrada exitosamente!");
      clearCart(); setFormData(initialFormData); setClientSearchTerm(""); setComboDiscounts({});
      setTimeout(() => productInputRef.current?.focus(), 50);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Ocurrió un error al registrar la venta."); }
    finally { setIsLoading(false); }
  };

  const handleOpenCajaFromSale = async (sellerId: string, initialBalance: string) => {
    setIsOpeningCaja(true);
    try {
      const res = await fetch("/api/caja", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initialBalance: parseFloat(initialBalance) || 0, sellerId }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      toast.success("Caja abierta exitosamente.");
      setShowCajaModal(false); setHasOpenCaja(true); setFormData(prev => ({ ...prev, sellerId }));
      setTimeout(() => productInputRef.current?.focus(), 50);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Error al abrir la caja."); }
    finally { setIsOpeningCaja(false); }
  };

  if (isFetchingInitialData) {
    return <div className="flex items-center justify-center p-8"><Loader2 size={24} className="animate-spin text-primary mr-2" /> Cargando datos...</div>;
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="bg-muted p-6 sm:p-8 rounded-lg shadow space-y-6">
        <ProductSearchPanel
          productSearchTerm={productSearchTerm}
          searchedProducts={searchedProducts}
          combos={combos}
          recentProducts={recentProducts}
          currentItem={currentItem}
          productInputRef={productInputRef}
          onSearchChange={handleProductSearchChange}
          onKeyDown={handleProductKeyDown}
          onSelectProduct={handleSelectProduct}
          onSelectCombo={handleSelectCombo}
          onCurrentItemFieldChange={handleCurrentItemFieldChange}
          onAddItem={handleAddItemToSaleList}
          onClearCurrentItem={handleClearCurrentItem}
        />

        <fieldset className="border border-border p-4 rounded-md">
          <legend className="text-lg font-medium text-primary px-2">Pago</legend>
          <div className="mt-4">
            <Select label="Tipo de Pago *" name="paymentType" value={formData.paymentType} onChange={handleFormChange} required>
              <option value="">Selecciona un tipo de pago</option>
              {Object.values(PaymentTypeEnum).map(type => <option key={type} value={type}>{getPaymentTypeDisplay(type)}</option>)}
            </Select>
            <p className="text-[10px] text-foreground-muted/60 mt-1"><kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono text-[9px]">F2</kbd> enfocar</p>
          </div>
        </fieldset>

        <AdditionalDetailsSection
          clientSearchTerm={clientSearchTerm}
          searchedClients={searchedClients}
          selectedClientId={formData.clientId}
          sellerId={formData.sellerId}
          discountCode={formData.discountCode}
          notes={formData.notes}
          sellers={sellers}
          onClientSearchChange={handleClientSearchChange}
          onSelectClient={handleSelectClient}
          onClearClient={handleClearClientSelection}
          onFormChange={handleFormChange}
        />

        {formData.items.length > 0 && (
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => { clearCart(); router.push("/ventas"); }} disabled={isLoading}>
              Cancelar venta
            </Button>
          </div>
        )}

        {formData.items.length === 0 && (
          <div className="flex justify-between items-center mt-4">
            <p className="text-[10px] text-foreground-muted/60">Agrega productos para finalizar la venta.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => { clearCart(); router.push("/ventas"); }} disabled={isLoading}>
              Cancelar
            </Button>
          </div>
        )}

        <div className="h-28" />
        <button ref={submitButtonRef} type="submit" className="hidden" />
      </form>

      <SaleSummaryBar
        items={formData.items}
        comboDiscount={comboDiscount}
        appliedPromotion={appliedPromotion}
        validDiscountCode={validDiscountCode}
        discountCodeDiscount={totals.discountCodeDiscount}
        paymentMethodDiscount={totals.paymentMethodDiscount}
        finalTotal={totals.finalTotal}
        onOpenCart={() => setShowCartModal(true)}
      />

      <CartModal
        isOpen={showCartModal}
        items={formData.items}
        subtotal={totals.subtotal}
        comboDiscount={comboDiscount}
        appliedPromotion={appliedPromotion}
        validDiscountCode={validDiscountCode}
        discountCodeDiscount={totals.discountCodeDiscount}
        paymentMethodDiscount={totals.paymentMethodDiscount}
        finalTotal={totals.finalTotal}
        isLoading={isLoading}
        onItemFieldChange={handleItemDetailChange}
        onRemoveItem={handleRemoveItem}
        onContinue={() => setShowCartModal(false)}
        onSubmit={() => submitButtonRef.current?.click()}
      />

      <WeightModal isOpen={showWeightModal} productName={pendingWeightProduct?.name || ''}
        unitType={pendingWeightUnitType} initialValue={weightInputValue}
        onConfirm={handleWeightConfirm}
        onCancel={() => { setShowWeightModal(false); setPendingWeightProduct(null); productInputRef.current?.focus(); }} />

      <UnitTypeModal isOpen={showUnitTypeModal} productName={pendingUnitTypeProduct?.name || ''}
        onConfirm={handleConfirmUnitType}
        onCancel={() => { setShowUnitTypeModal(false); setPendingUnitTypeProduct(null); setSelectedUnitType(''); }} />

      <CajaModal isOpen={showCajaModal} sellers={sellers} isOpening={isOpeningCaja}
        onOpen={(sellerId, initialBalance) => handleOpenCajaFromSale(sellerId, initialBalance)}
        onCancel={() => { setShowCajaModal(false); productInputRef.current?.focus(); setIsOpeningCaja(false); }} />
    </>
  );
};

export default SaleForm;
