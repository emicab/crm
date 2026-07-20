import React from "react";
import { ShoppingCart, Trash2 } from "lucide-react";
import { SaleItemInCart } from "@/types";
import { formatCurrency } from "@/lib/formatCurrency";

interface SaleCartTableProps {
  items: SaleItemInCart[];
  handleItemDetailChange: (tempId: number, field: "quantity" | "priceAtSale", value: string) => void;
  handleRemoveItem: (tempId: number) => void;
  clearCart: () => void;
}

export const SaleCartTable: React.FC<SaleCartTableProps> = ({
  items,
  handleItemDetailChange,
  handleRemoveItem,
  clearCart,
}) => {
  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 uppercase">
          <ShoppingCart size={16} className="text-primary" /> Detalle de Venta
        </h2>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const ok = confirm("¿Vaciar todos los productos del carrito?");
              if (ok) {
                clearCart();
              }
            }}
            className="text-xs text-destructive hover:underline font-semibold"
          >
            Vaciar
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-foreground-muted/50 border-2 border-dashed border-border rounded-2xl bg-muted/10">
          <ShoppingCart size={40} className="mb-2 text-foreground-muted/30" />
          <p className="text-sm font-semibold">El carrito está vacío</p>
          <p className="text-xs mt-1">
            Escanee un código de barras o busque productos arriba.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-xl bg-white shadow-sm max-h-[300px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted border-b border-border sticky top-0 z-10">
              <tr>
                <th className="p-3 text-xs font-bold text-foreground uppercase">
                  Detalle del Producto
                </th>
                <th className="p-3 text-xs font-bold text-foreground text-center w-20 uppercase">
                  Cant.
                </th>
                <th className="p-3 text-xs font-bold text-foreground text-right w-24 uppercase">
                  Unitario
                </th>
                <th className="p-3 text-xs font-bold text-foreground text-right w-28 uppercase">
                  Subtotal
                </th>
                <th className="p-3 text-xs font-bold text-foreground text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {items.map((item) => (
                <tr
                  key={item.tempId}
                  className="hover:bg-muted/40 transition-colors"
                >
                  <td className="p-3 font-semibold text-foreground align-middle">
                    <div
                      className="truncate max-w-[200px]"
                      title={item.productName}
                    >
                      {item.productName}
                    </div>
                    <span className="text-[10px] text-foreground-muted font-normal block mt-0.5">
                      Disponibles: {item.availableStock}
                      {item.unitType === "WEIGHT"
                        ? " kg"
                        : item.unitType === "VOLUME"
                          ? " L"
                          : " u"}
                    </span>
                  </td>
                  <td className="p-3 text-center align-middle">
                    <input
                      id={`qty-input-${item.tempId}`}
                      type="number"
                      value={String(item.quantity)}
                      onChange={(e) =>
                        handleItemDetailChange(
                          item.tempId,
                          "quantity",
                          e.target.value,
                        )
                      }
                      min="0"
                      step="any"
                      className="w-16 text-center border border-border rounded-lg px-2 py-1 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </td>
                  <td className="p-3 text-right align-middle">
                    <input
                      type="number"
                      value={String(item.priceAtSale)}
                      onChange={(e) =>
                        handleItemDetailChange(
                          item.tempId,
                          "priceAtSale",
                          e.target.value,
                        )
                      }
                      step="0.01"
                      min="0"
                      className="w-20 text-right border border-border rounded-lg px-2 py-1 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono font-medium"
                    />
                  </td>
                  <td className="p-3 text-right font-bold text-foreground align-middle font-mono">
                    {formatCurrency(item.subtotal)}
                  </td>
                  <td className="p-3 text-center align-middle">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.tempId)}
                      className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                      title="Quitar ítem"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SaleCartTable;
