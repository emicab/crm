"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import type { Product, Brand, Category, Supplier, Branch } from "@/types";
import Button from "@/components/ui/Button";
import {
  Edit3,
  Trash2,
  Loader2,
  AlertCircle,
  EyeOff,
  Globe,
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useModules } from "@/hooks/useModules";
import ConfirmationModal from "../ui/ConfirmationModal";
import { formatCurrency } from "@/lib/formatCurrency";
import Pagination from "@/components/ui/Pagination";
import { useProductCSV } from "@/hooks/useProductCSV";
import BatchSupplierModal from "./BatchSupplierModal";
import ProductMobileCard from "./ProductMobileCard";
import ProductFilters from "./ProductFilters";
import SelectedBar from "./SelectedBar";
import CSVImportModal from "./CSVImportModal";
import { TransferStockModal, type TransferItem } from "./TransferStockModal";
import { BatchPriceModal } from "./BatchPriceModal";

const ProductTable = () => {
  const router = useRouter();
  const { plan } = useModules();
  const isPro = plan === "pro";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBatchSupplierModalOpen, setIsBatchSupplierModalOpen] =
    useState(false);
  const [isBatchPriceModalOpen, setIsBatchPriceModalOpen] = useState(false);
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filters, setFilters] = useState({
    search: "",
    brandId: "",
    categoryId: "",
    supplierId: "",
    branchId: "",
  });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const { handleExportCSV } = useProductCSV(() => fetchProducts(page));
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferInitialItems, setTransferInitialItems] = useState<
    TransferItem[]
  >([]);

  useEffect(() => {
    // Cargar sucursal activa guardada en esta PC por defecto
    const activeBranchId = localStorage.getItem("clinpos_active_branch_id");
    if (activeBranchId) {
      setFilters((prev) => ({ ...prev, branchId: activeBranchId }));
    }

    const fetchFilterOptions = async () => {
      try {
        const [brandsRes, categoriesRes, suppliersRes, branchesRes] = await Promise.all([
          fetch("/api/brands"),
          fetch("/api/categories"),
          fetch("/api/proveedores"),
          fetch("/api/branches"),
        ]);
        if (!brandsRes.ok || !categoriesRes.ok || !suppliersRes.ok)
          throw new Error("Error al cargar opciones de filtro.");

        setBrands(await brandsRes.json());
        setCategories(await categoriesRes.json());
        setSuppliers(await suppliersRes.json());
        if (branchesRes.ok) {
          setBranches(await branchesRes.json());
        }
      } catch (err: any) {
        console.error("Filtro-Error:", err);
        setError(
          "No se pudieron cargar las opciones de filtro. La tabla principal podría funcionar.",
        );
      }
    };
    fetchFilterOptions();
  }, []);

  const fetchProducts = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.brandId) params.append("brandId", filters.brandId);
      if (filters.categoryId) params.append("categoryId", filters.categoryId);
      if (filters.supplierId) params.append("supplierId", filters.supplierId);
      if (filters.branchId) params.append("branchId", filters.branchId);
      params.append("page", String(pageNum));
      params.append("limit", "20");
      const queryString = params.toString();

      try {
        const response = await fetch(`/api/products?${queryString}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Error HTTP: ${response.status}`,
          );
        }
        const result = await response.json();
        const items = Array.isArray(result) ? result : result.data;
        setProducts(
          items.map((product: any) => ({
            ...product,
            pricePurchase: product.pricePurchase
              ? parseFloat(product.pricePurchase)
              : null,
            priceSale: parseFloat(product.priceSale),
          })),
        );
        if (!Array.isArray(result)) {
          setTotalPages(result.pagination.totalPages);
          setTotalProducts(result.pagination.total);
          setPage(result.pagination.page);
        } else {
          setTotalPages(1);
          setTotalProducts(items.length);
          setPage(1);
        }
      } catch (err: any) {
        setError(err.message || "Error al cargar los productos.");
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProducts(1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, fetchProducts]);

  // Escuchar eventos de sincronización en tiempo real para refrescar la tabla
  useEffect(() => {
    const handleSyncCompleted = () => {
      fetchProducts(page);
    };
    window.addEventListener("sync-completed", handleSyncCompleted);
    return () => window.removeEventListener("sync-completed", handleSyncCompleted);
  }, [fetchProducts, page]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchProducts(newPage);
  };

  const handleOpenDeleteModal = (product: Product) => {
    setItemToDelete(product);
    setIsModalOpen(true);
  };

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ search: "", brandId: "", categoryId: "", supplierId: "", branchId: "" });
    setPage(1);
  };

  const [isAllPagesSelected, setIsAllPagesSelected] = useState(false);

  const handleToggleSelect = (productId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
    setIsAllPagesSelected(false);
  };

  const handleSelectAll = () => {
    if (isAllPagesSelected) {
      setSelectedIds(new Set());
      setIsAllPagesSelected(false);
    } else if (selectedIds.size === products.length) {
      setIsAllPagesSelected(true);
      toast.success(
        `Se seleccionaron los ${totalProducts.toLocaleString("es-AR")} productos de todas las páginas.`,
      );
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
      setIsAllPagesSelected(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setIsAllPagesSelected(false);
  };

  const handleOpenTransferForSelected = () => {
    const items = products
      .filter((p) => selectedIds.has(p.id))
      .map((p) => ({ product: p, quantity: 1 }));
    setTransferInitialItems(items);
    if (isAllPagesSelected) {
      toast(
        "La selección de todas las páginas no se puede precargar en el remito. Agregá los productos desde el buscador del remito.",
      );
    }
    setIsTransferModalOpen(true);
  };

  const handleBatchUpdate = async (data: {
    brandId?: string;
    categoryId?: string;
    supplierId?: string;
  }) => {
    setIsSavingBatch(true);
    try {
      const payload = isAllPagesSelected
        ? { allPages: true, filters, ...data }
        : { productIds: Array.from(selectedIds), ...data };

      const res = await fetch("/api/products/batch-supplier", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Error al actualizar productos.");
      }
      const resJson = await res.json();
      toast.success(
        `Productos actualizados con éxito (${resJson.count || selectedIds.size} producto(s)).`,
      );
      handleClearSelection();
      setIsBatchSupplierModalOpen(false);
      fetchProducts(page);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setIsSavingBatch(false);
    }
  };

  const handleEdit = (productId: number) => {
    router.push(`/productos/${productId}/editar`);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/products/${itemToDelete.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Error al eliminar el producto.");
      }
      setProducts((prev) => prev.filter((p) => p.id !== itemToDelete.id));
      toast.success(`Producto "${itemToDelete.name}" eliminado.`);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Ocurrió un error inesperado.";
      toast.error(errorMessage);
    } finally {
      setIsModalOpen(false);
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const handleConfirmBatchDelete = async () => {
    setIsBatchDeleting(true);
    try {
      const payload = isAllPagesSelected
        ? { allPages: true, filters }
        : { ids: Array.from(selectedIds) };

      const response = await fetch("/api/products/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const errorData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(errorData.message || "Error al eliminar productos.");
      }

      toast.success(
        `Se eliminaron ${errorData.count ?? selectedIds.size} producto(s).`,
      );
      handleClearSelection();
      setIsBatchDeleteOpen(false);
      fetchProducts(page);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Error al sincronizar.");
      }
      toast.success("Sincronización completada.");
      fetchProducts(page);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudo sincronizar.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleWebPublic = async (
    productId: number,
    newStatus: boolean,
  ) => {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublicWeb: newStatus }),
      });
      if (!res.ok) throw new Error("Error al actualizar visibilidad web.");

      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, isPublicWeb: newStatus } : p,
        ),
      );
      toast.success(
        newStatus
          ? "Producto publicado en la Tienda Web."
          : "Producto ocultado de la Tienda Web.",
      );
    } catch (err: any) {
      toast.error(err.message || "Error al cambiar estado web.");
    }
  };

  const handleBatchWebStatus = async (isPublicWeb: boolean) => {
    if (selectedIds.size === 0 && !isAllPagesSelected) return;
    try {
      const payload = isAllPagesSelected
        ? { allPages: true, filters, isPublicWeb }
        : { ids: Array.from(selectedIds), isPublicWeb };

      const res = await fetch("/api/products/batch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      fetchProducts(page);
      handleClearSelection();
      toast.success(
        isPublicWeb
          ? `${data.count || totalProducts} productos publicados en Tienda Web.`
          : `${data.count || totalProducts} productos ocultados de Tienda Web.`,
      );
    } catch {
      toast.error("Error al actualizar productos masivamente.");
    }
  };

  return (
    <>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Producto"
        confirmText="Sí, Eliminar"
        isLoading={isDeleting}
      >
        ¿Estás seguro de que quieres eliminar el producto{" "}
        <strong className="text-foreground">
          &quot;{itemToDelete?.name}&quot;
        </strong>
        ? Esta acción no se puede deshacer.
      </ConfirmationModal>

      <ConfirmationModal
        isOpen={isBatchDeleteOpen}
        onClose={() => setIsBatchDeleteOpen(false)}
        onConfirm={handleConfirmBatchDelete}
        title="Eliminar Productos Masivamente"
        confirmText="Sí, Eliminar Todos"
        isLoading={isBatchDeleting}
      >
        ¿Estás seguro de que querés eliminar{" "}
        <strong className="text-foreground">
          {isAllPagesSelected
            ? `los ${totalProducts.toLocaleString("es-AR")} productos seleccionados (TODAS las páginas)`
            : `${selectedIds.size} producto${selectedIds.size !== 1 ? "s" : ""} seleccionado${selectedIds.size !== 1 ? "s" : ""}`}
        </strong>
        ? Esta acción no se puede deshacer. Los productos que estén asociados a
        ventas, compras, combos, promociones, consignaciones o traspasos no se
        eliminarán.
      </ConfirmationModal>

      <BatchSupplierModal
        isOpen={isBatchSupplierModalOpen}
        selectedCount={selectedIds.size}
        brands={brands}
        categories={categories}
        suppliers={suppliers}
        isSaving={isSavingBatch}
        onSave={handleBatchUpdate}
        onClose={() => setIsBatchSupplierModalOpen(false)}
        onBrandCreated={(newBrand) =>
          setBrands((prev) =>
            [...prev, newBrand].sort((a, b) => a.name.localeCompare(b.name)),
          )
        }
        onCategoryCreated={(newCategory) =>
          setCategories((prev) =>
            [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)),
          )
        }
        onSupplierCreated={(newSupplier) =>
          setSuppliers((prev) =>
            [...prev, newSupplier].sort((a, b) => a.name.localeCompare(b.name)),
          )
        }
      />

      <CSVImportModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        onSuccess={() => fetchProducts(1)}
      />

      <TransferStockModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setTransferInitialItems([]);
        }}
        products={products}
        initialItems={transferInitialItems}
        onTransferCompleted={() => {
          fetchProducts(page);
          handleClearSelection();
        }}
      />

      <BatchPriceModal
        isOpen={isBatchPriceModalOpen}
        onClose={() => setIsBatchPriceModalOpen(false)}
        selectedCount={selectedIds.size}
        isAllPagesSelected={isAllPagesSelected}
        totalCount={totalProducts}
        selectedIds={selectedIds}
        filters={filters}
        onSuccess={() => fetchProducts(page)}
      />

      <div className="bg-muted p-4 sm:p-6 rounded-lg shadow">
        <ProductFilters
          filters={filters}
          brands={brands}
          categories={categories}
          suppliers={suppliers}
          branches={branches}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
          onExportCSV={() => handleExportCSV(products)}
          onImportCSV={() => setIsCSVModalOpen(true)}
          onTransferStock={() => setIsTransferModalOpen(true)}
          onSync={handleManualSync}
          isSyncing={isSyncing}
        />
        {error && (
          <div className="text-center text-destructive p-4 bg-destructive/10 rounded-md my-4">
            <AlertCircle size={20} className="inline-block mr-2" />
            {error}
          </div>
        )}
        {loading && (
          <div className="text-center py-4">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        )}
        <SelectedBar
          count={selectedIds.size}
          totalCount={totalProducts}
          isAllPagesSelected={isAllPagesSelected}
          onSelectAllPages={() => setIsAllPagesSelected(true)}
          onClear={handleClearSelection}
          onBatchUpdate={() => setIsBatchSupplierModalOpen(true)}
          onAdjustPrices={() => setIsBatchPriceModalOpen(true)}
          {...(isPro
            ? {
                onPublishWeb: () => handleBatchWebStatus(true),
                onHideWeb: () => handleBatchWebStatus(false),
              }
            : {})}
          onTransferStock={handleOpenTransferForSelected}
          onDelete={() => setIsBatchDeleteOpen(true)}
        />
        <div className="overflow-x-auto">
          <table className="hidden md:table w-full text-left table-auto">
            <thead className="border-b border-border">
              <tr>
                <th className="py-3 px-2 text-sm font-semibold text-foreground w-8 text-center">
                  <input
                    type="checkbox"
                    checked={
                      isAllPagesSelected ||
                      (products.length > 0 &&
                        selectedIds.size === products.length)
                    }
                    onChange={handleSelectAll}
                    className="rounded border-border cursor-pointer"
                  />
                </th>
                <th className="py-3 px-2 text-sm font-semibold text-foreground">
                  Nombre
                </th>
                <th className="py-3 px-2 text-sm font-semibold text-foreground w-28">
                  SKU
                </th>
                <th className="py-3 px-2 text-sm font-semibold text-foreground w-28">
                  Marca
                </th>
                <th className="py-3 px-2 text-sm font-semibold text-foreground w-28">
                  Categoría
                </th>
                <th className="py-3 px-2 text-sm font-semibold text-foreground w-28">
                  Proveedor
                </th>
                <th className="py-3 px-2 text-sm font-semibold text-foreground text-right w-28">
                  P. Compra
                </th>
                <th className="py-3 px-2 text-sm font-semibold text-foreground text-right w-28">
                  P. Venta
                </th>
                <th className="py-3 px-2 text-sm font-semibold text-foreground text-center w-20">
                  Stock
                </th>
                {isPro && (
                  <th className="py-3 px-2 text-sm font-semibold text-foreground text-center w-28">
                    Tienda Web
                  </th>
                )}
                <th className="py-3 px-2 text-sm font-semibold text-foreground text-center w-20">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {!loading && products.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="text-center text-foreground-muted py-8"
                  >
                    No se encontraron productos.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-border last:border-b-0 hover:bg-background transition-colors"
                  >
                    <td className="py-2.5 px-2 text-center w-8">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => handleToggleSelect(product.id)}
                        className="rounded border-border cursor-pointer"
                      />
                    </td>
                    <td
                      className="py-2.5 px-2 text-sm text-foreground font-medium max-w-[200px] truncate"
                      title={product.name}
                    >
                      {product.name}
                    </td>
                    <td
                      className="py-2.5 px-2 text-xs text-foreground-muted w-28 truncate"
                      title={product.sku || "-"}
                    >
                      {product.sku || "-"}
                    </td>
                    <td
                      className="py-2.5 px-2 text-xs text-foreground-muted w-28 truncate"
                      title={product.brand?.name || "-"}
                    >
                      {product.brand?.name || "-"}
                    </td>
                    <td
                      className="py-2.5 px-2 text-xs text-foreground-muted w-28 truncate"
                      title={product.category?.name || "-"}
                    >
                      {product.category?.name || "-"}
                    </td>
                    <td
                      className="py-2.5 px-2 text-xs text-foreground-muted w-28 truncate"
                      title={product.supplier?.name || "-"}
                    >
                      {product.supplier?.name || "-"}
                    </td>
                    <td className="py-2.5 px-2 text-sm text-foreground text-right w-28 font-mono">
                      {formatCurrency(product.pricePurchase ?? 0)}
                    </td>
                    <td className="py-2.5 px-2 text-sm text-foreground font-bold text-right w-28 font-mono">
                      {formatCurrency(product.priceSale)}
                    </td>
                    <td className="py-2.5 px-2 text-sm text-foreground text-center w-36">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-foreground">
                          {(() => {
                            if (filters.branchId) {
                              const bs = product.branchStocks?.find((b: any) => b.branchId === Number(filters.branchId));
                              return bs ? bs.quantityStock : 0;
                            }
                            return product.quantityStock;
                          })()}
                          {product.unitType === "WEIGHT"
                            ? " kg"
                            : product.unitType === "VOLUME"
                              ? " L"
                              : " u."}
                        </span>
                      </div>
                    </td>
                    {isPro && (
                      <td className="py-2.5 px-2 text-sm text-center w-28">
                        <button
                          onClick={() =>
                            handleToggleWebPublic(
                              product.id,
                              !product.isPublicWeb,
                            )
                          }
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1 mx-auto transition-colors ${
                            product.isPublicWeb
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300"
                          }`}
                          title="Haz clic para cambiar la visibilidad en ClinStore"
                        >
                          {product.isPublicWeb ? (
                            <>
                              <Globe size={12} className="text-emerald-600" />{" "}
                              Publicado
                            </>
                          ) : (
                            <>
                              <EyeOff size={12} className="text-gray-500" />{" "}
                              Oculto
                            </>
                          )}
                        </button>
                      </td>
                    )}
                    <td className="py-2.5 px-2 text-sm text-center w-20 whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(product.id)}
                          title="Editar"
                          className="h-7 w-7"
                        >
                          <Edit3 size={15} className="text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDeleteModal(product)}
                          title="Eliminar"
                          className="h-7 w-7"
                        >
                          <Trash2 size={15} className="text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="md:hidden space-y-2">
            {!loading && products.length === 0 ? (
              <div className="text-center text-foreground-muted py-8">
                No se encontraron productos.
              </div>
            ) : (
              products.map((product) => (
                <ProductMobileCard
                  key={product.id}
                  product={product}
                  onEdit={handleEdit}
                  onOpenDelete={handleOpenDeleteModal}
                />
              ))
            )}
          </div>
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalProducts}
          itemLabel="productos"
          onPageChange={handlePageChange}
        />
      </div>
    </>
  );
};

export default ProductTable;
