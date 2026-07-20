"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Client,
  Seller,
  Product,
  PaymentTypeEnum,
  Combo,
  Promotion,
  SaleItemInCart,
} from "@/types";
import { useModules } from "@/hooks/useModules";
import { toast } from "react-hot-toast";
import { loadCart, clearCart as clearCartPersist } from "@/hooks/useCartPersistence";
import { useSaleTotals } from "@/hooks/useSaleTotals";
import { usePromotionsEngine } from "@/hooks/usePromotionsEngine";

export interface SaleFormData {
  clientId: string;
  sellerId: string;
  paymentType: PaymentTypeEnum | "";
  notes: string;
  items: SaleItemInCart[];
  discountCode: string;
}

const initialFormData: SaleFormData = {
  clientId: "",
  sellerId: "",
  paymentType: "",
  notes: "",
  items: [],
  discountCode: "",
};

export const useSaleState = () => {
  const { isModuleEnabled } = useModules();
  
  // Ref para persistencia del carrito en local storage
  const savedCart = useRef<any>(null);
  if (typeof window !== "undefined") {
    savedCart.current = loadCart();
  }

  const [formData, setFormData] = useState<SaleFormData>(() => ({
    clientId: savedCart.current?.clientId || "",
    sellerId: savedCart.current?.sellerId || "",
    paymentType: (savedCart.current?.paymentType as PaymentTypeEnum | "") || "",
    notes: savedCart.current?.notes || "",
    items: savedCart.current?.items || [],
    discountCode: savedCart.current?.discountCode || "",
  }));

  const [comboDiscounts, setComboDiscounts] = useState<Record<number, number>>(
    savedCart.current?.comboDiscounts || {},
  );
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [lastCreatedSale, setLastCreatedSale] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInitialData, setIsFetchingInitialData] = useState(true);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [searchedProducts, setSearchedProducts] = useState<Product[]>([]);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [searchedClients, setSearchedClients] = useState<Client[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [hasOpenCaja, setHasOpenCaja] = useState(false);

  // Productos Quick-Add (sin badges de categorías)
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [isLoadingCategoryProducts, setIsLoadingCategoryProducts] =
    useState<boolean>(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [showCajaModal, setShowCajaModal] = useState(false);
  const [isOpeningCaja, setIsOpeningCaja] = useState(false);
  const [showUnitTypeModal, setShowUnitTypeModal] = useState(false);
  const [pendingUnitTypeProduct, setPendingUnitTypeProduct] =
    useState<Product | null>(null);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInputValue, setWeightInputValue] = useState("");
  const [pendingWeightProduct, setPendingWeightProduct] =
    useState<Product | null>(null);
  const [pendingWeightUnitType, setPendingWeightUnitType] = useState("");
  
  const productInputRef = useRef<HTMLInputElement>(null);
  const clientInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const weightInputRef = useRef<HTMLInputElement>(null);
  const barcodeTimer = useRef<NodeJS.Timeout | null>(null);
  const barcodeInput = useRef("");

  const [validDiscountCode, setValidDiscountCode] = useState<{
    code: string;
    percent: number;
  } | null>(null);

  const [invoiceType, setInvoiceType] = useState<'A' | 'B' | 'C' | 'NONE'>('NONE');
  const [clientCuit, setClientCuit] = useState('');
  const [clientName, setClientName] = useState('');

  const comboDiscount = useMemo(
    () => Object.values(comboDiscounts).reduce((sum, d) => sum + d, 0),
    [comboDiscounts],
  );

  const subtotal = useMemo(
    () => formData.items.reduce((sum, i) => sum + i.subtotal, 0),
    [formData.items],
  );

  const appliedPromotion = usePromotionsEngine(
    formData.items,
    subtotal,
    comboDiscount,
    promotions,
  );

  const totals = useSaleTotals({
    items: formData.items,
    comboDiscounts,
    appliedPromotion,
    validDiscountCode,
    paymentType: formData.paymentType,
    config,
    discountCode: formData.discountCode,
  });

  const appliedPromotionRef = useRef(appliedPromotion);
  appliedPromotionRef.current = appliedPromotion;

  // Carga de datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        const configRes = await fetch("/api/config");
        const configData = configRes.ok ? await configRes.json() : {};
        setConfig(configData);

        const showVendedores = configData.module_vendedores !== "false";
        const showCombos = configData.module_combos_promociones !== "false";

        const [sellersData, cajaData, combosData, promosData] =
          await Promise.all([
            showVendedores
              ? fetch("/api/vendedores")
                  .then((r) => (r.ok ? r.json() : []))
                  .catch(() => [])
              : Promise.resolve([]),
            fetch("/api/caja")
              .then((r) => (r.ok ? r.json() : {}))
              .catch(() => ({})) as Promise<any>,
            showCombos
              ? fetch("/api/combos")
                  .then((r) => (r.ok ? r.json() : []))
                  .catch(() => [])
              : Promise.resolve([]),
            showCombos
              ? fetch("/api/promotions")
                  .then((r) => (r.ok ? r.json() : []))
                  .catch(() => [])
              : Promise.resolve([]),
          ]);

        setSellers(sellersData);
        setHasOpenCaja(!!cajaData.open);
        if (cajaData.open?.seller?.id) {
          setFormData((prev) => ({
            ...prev,
            sellerId: String(cajaData.open.seller.id),
          }));
        }

        if (showCombos) {
          setCombos(
            combosData
              .filter((c: any) => c.active)
              .map((c: any) => ({
                ...c,
                price: parseFloat(c.price),
                items: c.items.map((i: any) => ({
                  ...i,
                  customPrice: i.customPrice ? parseFloat(i.customPrice) : null,
                })),
              })),
          );

          setPromotions(
            promosData
              .filter((p: any) => {
                if (p.status !== "ACTIVE") return false;
                const now = new Date();
                if (p.startDate && new Date(p.startDate) > now) return false;
                if (p.endDate && new Date(p.endDate) < now) return false;
                return true;
              })
              .map((p: any) => ({
                ...p,
                discountValue: parseFloat(p.discountValue),
              })),
          );
        }
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Error cargando datos.",
        );
      } finally {
        setIsFetchingInitialData(false);
      }
    };
    fetchData();
  }, []);

  // Carga de catálogo rápido
  useEffect(() => {
    setIsLoadingCategoryProducts(true);
    fetch("/api/products?limit=24")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setCategoryProducts(
            data.map((p: any) => ({
              ...p,
              priceSale: parseFloat(p.priceSale),
              quantityStock: parseFloat(
                String(p.quantityStock).replace(",", "."),
              ),
            })),
          );
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingCategoryProducts(false));
  }, []);

  // Carga del cliente guardado en carrito local
  useEffect(() => {
    if (formData.clientId && !selectedClient) {
      fetch(`/api/clients/${formData.clientId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setSelectedClient(data);
            setClientSearchTerm(
              `${data.firstName} ${data.lastName || ""}`.trim(),
            );
          }
        })
        .catch(() => {});
    }
  }, [formData.clientId, selectedClient]);

  // Carga de productos vendidos recientemente
  useEffect(() => {
    fetch("/api/ventas/recent-products")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data))
          setRecentProducts(
            data.map((p: any) => ({
              ...p,
              priceSale: parseFloat(p.priceSale),
              quantityStock: parseFloat(p.quantityStock),
            })),
          );
      })
      .catch(() => {});
  }, []);

  // Auto-foco al terminar la carga inicial
  useEffect(() => {
    if (!isFetchingInitialData) {
      setTimeout(() => productInputRef.current?.focus(), 150);
    }
  }, [isFetchingInitialData]);

  // Buscador de clientes (debounce)
  useEffect(() => {
    if (clientSearchTerm.trim() === "" || selectedClient) {
      setSearchedClients([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/clients?search=${encodeURIComponent(clientSearchTerm)}`,
        );
        if (res.ok) setSearchedClients(await res.json());
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearchTerm, selectedClient]);

  // Buscador de productos (debounce)
  useEffect(() => {
    if (!productSearchTerm.trim()) {
      setSearchedProducts([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/products?search=${encodeURIComponent(productSearchTerm)}`,
        );
        if (res.ok) {
          const data = await res.json();
          const itemsInCartIds = formData.items.map((i) =>
            parseInt(i.productId),
          );
          setSearchedProducts(
            data
              .filter((p: any) => !itemsInCartIds.includes(p.id))
              .map((p: any) => ({
                ...p,
                priceSale: parseFloat(p.priceSale),
                quantityStock: parseFloat(
                  String(p.quantityStock).replace(",", "."),
                ),
              }))
              .slice(0, 5),
          );
        }
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearchTerm, formData.items]);

  // Validación de cupones (debounce)
  useEffect(() => {
    const code = formData.discountCode.trim().toUpperCase();
    if (!code) {
      setValidDiscountCode(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/discount-codes?code=${encodeURIComponent(code)}`,
        );
        if (res.ok) {
          const data = await res.json();
          const exact = (Array.isArray(data) ? data : data.data)?.find(
            (c: any) => c.code === code && c.isActive,
          );
          setValidDiscountCode(
            exact
              ? { code: exact.code, percent: parseFloat(exact.discountPercent) }
              : null,
          );
        }
      } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.discountCode]);

  // Persistencia local
  useEffect(() => {
    try {
      localStorage.setItem(
        "sale_cart",
        JSON.stringify({
          items: formData.items,
          clientId: formData.clientId,
          sellerId: formData.sellerId,
          paymentType: formData.paymentType,
          notes: formData.notes,
          discountCode: formData.discountCode,
          comboDiscounts,
        }),
      );
    } catch {}
  }, [
    formData.items,
    formData.clientId,
    formData.sellerId,
    formData.paymentType,
    formData.notes,
    formData.discountCode,
    comboDiscounts,
  ]);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F8" || (e.ctrlKey && e.key === "k")) {
        e.preventDefault();
        productInputRef.current?.focus();
        return;
      }
      if (e.key === "F2") {
        e.preventDefault();
        submitButtonRef.current?.click();
        return;
      }
      if (e.key === "F4") {
        e.preventDefault();
        if (formData.items.length === 0) return;
        const confirmClear = confirm(
          "¿Estás seguro de que deseas vaciar el carrito actual?",
        );
        if (confirmClear) {
          clearCart();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const clearCart = () => {
    clearCartPersist();
    setFormData(initialFormData);
    setSelectedClient(null);
    setClientSearchTerm("");
    setComboDiscounts({});
    setInvoiceType('NONE');
    setClientCuit('');
    setClientName('');
    setTimeout(() => productInputRef.current?.focus(), 50);
  };

  const handleClientSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value;
    setClientSearchTerm(searchTerm);
    if (searchTerm.trim() === "") {
      setFormData((prev) => ({ ...prev, clientId: "" }));
      setSelectedClient(null);
    }
  };

  const handleSelectClient = (client: Client) => {
    const fullName = `${client.firstName} ${client.lastName || ""}`.trim();
    setSelectedClient(client);
    setClientSearchTerm(fullName);
    setFormData((prev) => ({ ...prev, clientId: String(client.id) }));
    setSearchedClients([]);
    
    if (client.cuit) {
      setClientCuit(client.cuit);
    }
    if (client.businessName) {
      setClientName(client.businessName);
    } else {
      setClientName(fullName);
    }
  };

  const handleClearClientSelection = () => {
    setClientSearchTerm("");
    setSelectedClient(null);
    setFormData((prev) => ({
      ...prev,
      clientId: "",
      paymentType:
        prev.paymentType === PaymentTypeEnum.ON_ACCOUNT ? "" : prev.paymentType,
    }));
    setSearchedClients([]);
    setClientCuit("");
    setClientName("");
  };

  const handleProductSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setProductSearchTerm(value);
    if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
    if (value.length > barcodeInput.current.length) {
      barcodeInput.current = value;
      barcodeTimer.current = setTimeout(() => {
        barcodeInput.current = "";
      }, 100);
    } else barcodeInput.current = "";
  };

  const handleProductKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && barcodeInput.current.length > 0) {
      e.preventDefault();
      const code = barcodeInput.current;
      barcodeInput.current = "";
      fetch(`/api/products?search=${encodeURIComponent(code)}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          const product = data?.[0];
          if (product)
            handleSelectProduct({
              ...product,
              priceSale: parseFloat(product.priceSale),
              quantityStock: parseFloat(
                String(product.quantityStock).replace(",", "."),
              ),
            });
          else toast.error(`Producto con código "${code}" no encontrado.`);
        })
        .catch(() =>
          toast.error("Error al buscar producto por código de barras."),
        );
    }
  };

  const addProductToCart = (product: Product, unitType: string) => {
    const qty = 1;
    const tempId = Date.now();
    const newItem: SaleItemInCart = {
      productId: String(product.id),
      productName: product.name,
      availableStock: product.quantityStock,
      quantity: qty,
      priceAtSale: product.priceSale,
      tempId,
      subtotal: qty * product.priceSale,
      unitType,
    };
    setFormData((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    setProductSearchTerm("");
    setSearchedProducts([]);

    // Foco en el input de cantidad del item agregado
    setTimeout(() => {
      const el = document.getElementById(`qty-input-${tempId}`);
      if (el) {
        el.focus();
        (el as HTMLInputElement).select();
      }
    }, 100);
  };

  const handleSelectProduct = (product: Product) => {
    if (product.quantityStock <= 0) {
      toast.error(`"${product.name}" no tiene stock disponible.`);
      setProductSearchTerm("");
      setSearchedProducts([]);
      productInputRef.current?.focus();
      return;
    }
    const existing = formData.items.find(
      (i) => i.productId === String(product.id),
    );
    const showFraccionada = isModuleEnabled("venta_fraccionada");
    const unitType = showFraccionada ? product.unitType || "UNIT" : "UNIT";
    if (showFraccionada && (unitType === "WEIGHT" || unitType === "VOLUME")) {
      setPendingWeightProduct(product);
      setPendingWeightUnitType(unitType);
      setWeightInputValue(existing ? String(existing.quantity * 1000) : "");
      setShowWeightModal(true);
      setProductSearchTerm("");
      setSearchedProducts([]);
      setTimeout(() => weightInputRef.current?.focus(), 100);
      return;
    }
    if (existing) {
      const newQty = existing.quantity + 1;
      setFormData((prev) => ({
        ...prev,
        items: prev.items.map((i) =>
          i.tempId === existing.tempId
            ? { ...i, quantity: newQty, subtotal: newQty * i.priceAtSale }
            : i,
        ),
      }));
      toast.success(`${product.name}: cantidad incrementada a ${newQty}`);
      setProductSearchTerm("");
      setSearchedProducts([]);

      // Foco en el input de cantidad del item existente
      setTimeout(() => {
        const el = document.getElementById(`qty-input-${existing.tempId}`);
        if (el) {
          el.focus();
          (el as HTMLInputElement).select();
        }
      }, 100);
      return;
    }
    if (showFraccionada && !product.unitType) {
      setPendingUnitTypeProduct(product);
      setShowUnitTypeModal(true);
      setProductSearchTerm("");
      setSearchedProducts([]);
      return;
    }
    addProductToCart(product, unitType);
    setTimeout(() => productInputRef.current?.focus(), 50);
  };

  const handleWeightConfirm = (qtyInKgOrL: number) => {
    if (!pendingWeightProduct) return;
    const product = pendingWeightProduct;
    const unitType = pendingWeightUnitType;
    const existing = formData.items.find(
      (i) => i.productId === String(product.id),
    );
    if (existing) {
      setFormData((prev) => ({
        ...prev,
        items: prev.items.map((i) =>
          i.tempId === existing.tempId
            ? {
                ...i,
                quantity: qtyInKgOrL,
                subtotal: qtyInKgOrL * i.priceAtSale,
              }
            : i,
        ),
      }));
    } else {
      addProductToCart(product, unitType);
      setFormData((prev) => ({
        ...prev,
        items: prev.items.map((item, idx, arr) =>
          idx === arr.length - 1
            ? {
                ...item,
                quantity: qtyInKgOrL,
                subtotal: qtyInKgOrL * item.priceAtSale,
              }
            : item,
        ),
      }));
    }
    setShowWeightModal(false);
    setPendingWeightProduct(null);
    setTimeout(() => productInputRef.current?.focus(), 50);
  };

  const handleConfirmUnitType = (unitType: string) => {
    if (!pendingUnitTypeProduct) return;
    addProductToCart(pendingUnitTypeProduct, unitType);
    setShowUnitTypeModal(false);
    setPendingUnitTypeProduct(null);
    fetch(`/api/products/${pendingUnitTypeProduct.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitType }),
    }).catch(() => {});
    setTimeout(() => productInputRef.current?.focus(), 50);
  };

  const handleItemDetailChange = (
    tempIdToUpdate: number,
    field: "quantity" | "priceAtSale",
    value: string,
  ) => {
    const normalizedValue = value.replace(",", ".");
    const numericValue =
      normalizedValue === "" ? 0 : parseFloat(normalizedValue);
    if (isNaN(numericValue)) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.tempId !== tempIdToUpdate) return item;
        const updatedItem = { ...item };
        if (field === "quantity") {
          let finalQty = numericValue;
          if (!isModuleEnabled("venta_fraccionada")) {
            finalQty = Math.round(finalQty);
          }
          if (finalQty > item.availableStock) {
            toast.error(
              `Stock máximo para ${item.productName} es ${item.availableStock}.`,
            );
            updatedItem.quantity = item.availableStock;
          } else updatedItem.quantity = finalQty < 0 ? 0 : finalQty;
        } else updatedItem.priceAtSale = numericValue < 0 ? 0 : numericValue;
        updatedItem.subtotal = updatedItem.quantity * updatedItem.priceAtSale;
        return updatedItem;
      }),
    }));
  };

  const handleRemoveItem = (tempIdToRemove: number) => {
    setFormData((prev) => {
      const removedItem = prev.items.find((i) => i.tempId === tempIdToRemove);
      const remaining = prev.items.filter(
        (item) => item.tempId !== tempIdToRemove,
      );
      if (removedItem?.comboBatchId) {
        const batchStillPresent = remaining.some(
          (i) => i.comboBatchId === removedItem.comboBatchId,
        );
        if (!batchStillPresent)
          setComboDiscounts((prevDiscounts) => {
            const next = { ...prevDiscounts };
            delete next[removedItem.comboBatchId!];
            return next;
          });
      }
      return { ...prev, items: remaining };
    });
  };

  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSelectCombo = (combo: Combo) => {
    if (!combo.items || combo.items.length === 0) {
      toast.error("El combo no tiene productos.");
      return;
    }
    const batchId = Date.now();
    const newItems: SaleItemInCart[] = combo.items.map((item) => ({
      productId: String(item.productId),
      productName: `${item.product?.name || `#${item.productId}`} (Combo: ${combo.name})`,
      availableStock: item.product?.quantityStock ?? 999,
      quantity: item.quantity,
      priceAtSale: item.customPrice ?? item.product?.priceSale ?? 0,
      tempId: batchId + item.productId,
      subtotal:
        (item.customPrice ?? item.product?.priceSale ?? 0) * item.quantity,
      comboBatchId: batchId,
    }));
    const fullSum = newItems.reduce((sum, item) => sum + item.subtotal, 0);
    const discount = Math.max(0, fullSum - combo.price);
    setFormData((prev) => ({ ...prev, items: [...prev.items, ...newItems] }));
    setComboDiscounts((prev) => ({ ...prev, [batchId]: discount }));
    setProductSearchTerm("");
    setSearchedProducts([]);
    toast.success(
      `Combo "${combo.name}" agregado ($${combo.price}, ahorro $${discount}).`,
    );
    setTimeout(() => productInputRef.current?.focus(), 50);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    if (!formData.paymentType) {
      toast.error("Seleccioná un tipo de pago.");
      setIsLoading(false);
      return;
    }
    if (formData.items.length === 0) {
      toast.error("Añadí al menos un producto a la venta.");
      setIsLoading(false);
      return;
    }

    const activeSellerId = isModuleEnabled("vendedores")
      ? formData.sellerId
      : "1";
    if (!activeSellerId) {
      if (!hasOpenCaja) {
        setShowCajaModal(true);
        setIsLoading(false);
        return;
      }
      toast.error("La caja abierta no tiene un vendedor asignado.");
      setIsLoading(false);
      return;
    }

    // Validar requerimientos de Factura A
    if (config.arcaEnabled === 'true' && invoiceType === 'A') {
      if (!clientCuit.trim() || clientCuit.replace(/\D/g, '').length !== 11) {
        toast.error("El CUIT del cliente es requerido y debe tener 11 dígitos para Factura A.");
        setIsLoading(false);
        return;
      }
      if (!clientName.trim()) {
        toast.error("La Razón Social del cliente es requerida para Factura A.");
        setIsLoading(false);
        return;
      }
    }

    const promo = appliedPromotionRef.current;
    const dataToSend = {
      clientId: formData.clientId ? parseInt(formData.clientId) : null,
      sellerId: parseInt(activeSellerId),
      paymentType: formData.paymentType as PaymentTypeEnum,
      notes: formData.notes.trim() || null,
      items: formData.items.map((item) => ({
        productId: parseInt(item.productId),
        quantity: item.quantity,
        priceAtSale: item.priceAtSale,
      })),
      discountCodeApplied: formData.discountCode.trim() || null,
      paymentMethodDiscount: totals.paymentMethodDiscount,
      promotionsApplied: [
        ...(comboDiscount > 0
          ? [
              {
                promotionId: 0,
                name: "Descuento combo",
                type: "COMBO",
                discountAmount: comboDiscount,
              },
            ]
          : []),
        ...(promo
          ? [
              {
                promotionId: promo.promotionId,
                name: promo.name,
                type: promo.type,
                discountAmount: promo.discountAmount,
              },
            ]
          : []),
      ],
      invoiceType,
      ...(invoiceType === 'A' && { clientCuit: clientCuit.trim(), clientName: clientName.trim() }),
    };
    try {
      const response = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }
      const data = await response.json();
      setLastCreatedSale(data);
      
      if (data.arcaError) {
        toast.error(`Venta registrada pero falló la facturación: ${data.arcaError}`, { duration: 6000 });
      } else if (data.invoice) {
        toast.success(`¡Venta y Factura ${data.invoice.invoiceType} #${data.invoice.invoiceNumber} registradas!`);
      } else {
        toast.success("¡Venta registrada exitosamente!");
      }

      clearCart();

      // Refrescar la lista de productos vendidos recientemente
      fetch("/api/ventas/recent-products")
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data))
            setRecentProducts(
              data.map((p: any) => ({
                ...p,
                priceSale: parseFloat(p.priceSale),
                quantityStock: parseFloat(p.quantityStock),
              })),
            );
        })
        .catch(() => {});

      setTimeout(() => productInputRef.current?.focus(), 50);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al registrar la venta.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCajaFromSale = async (
    sellerId: string,
    initialBalance: string,
  ) => {
    setIsOpeningCaja(true);
    const activeSellerId = isModuleEnabled("vendedores") ? sellerId : "1";
    try {
      const res = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initialBalance: parseFloat(initialBalance) || 0,
          sellerId: activeSellerId,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      toast.success("Caja abierta exitosamente.");
      setShowCajaModal(false);
      setHasOpenCaja(true);
      setFormData((prev) => ({ ...prev, sellerId: activeSellerId }));
      setTimeout(() => productInputRef.current?.focus(), 50);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error al abrir la caja.",
      );
    } finally {
      setIsOpeningCaja(false);
    }
  };

  return {
    isModuleEnabled,
    formData,
    setFormData,
    clientSearchTerm,
    setClientSearchTerm,
    searchedClients,
    productSearchTerm,
    setProductSearchTerm,
    searchedProducts,
    recentProducts,
    categoryProducts,
    isLoadingCategoryProducts,
    selectedClient,
    sellers,
    combos,
    promotions,
    isLoading,
    isFetchingInitialData,
    lastCreatedSale,
    setLastCreatedSale,
    hasOpenCaja,
    setHasOpenCaja,
    showCajaModal,
    setShowCajaModal,
    isOpeningCaja,
    setIsOpeningCaja,
    showUnitTypeModal,
    setShowUnitTypeModal,
    pendingUnitTypeProduct,
    setPendingUnitTypeProduct,
    showWeightModal,
    setShowWeightModal,
    weightInputValue,
    pendingWeightProduct,
    setPendingWeightProduct,
    pendingWeightUnitType,
    productInputRef,
    clientInputRef,
    submitButtonRef,
    weightInputRef,
    validDiscountCode,
    comboDiscount,
    totals,
    appliedPromotion,
    clearCart,
    handleClientSearchChange,
    handleSelectClient,
    handleClearClientSelection,
    handleProductSearchChange,
    handleProductKeyDown,
    handleSelectProduct,
    handleWeightConfirm,
    handleConfirmUnitType,
    handleItemDetailChange,
    handleRemoveItem,
    handleFormChange,
    handleSelectCombo,
    handleSubmit,
    handleOpenCajaFromSale,
    config,
    invoiceType,
    setInvoiceType,
    clientCuit,
    setClientCuit,
    clientName,
    setClientName,
  };
};
