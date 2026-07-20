import React from "react";
import { ClipboardList, User } from "lucide-react";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import { Seller, Client, PaymentTypeEnum } from "@/types";
import { getPaymentTypeDisplay } from "@/lib/displayTexts";
import { SaleFormData } from "@/hooks/useSaleState";

interface SaleMetadataSectionProps {
  formData: SaleFormData;
  sellers: Seller[];
  clientSearchTerm: string;
  searchedClients: Client[];
  selectedClient: Client | null;
  clientInputRef: React.RefObject<HTMLInputElement | null>;
  isModuleEnabled: (modId: string) => boolean;
  handleFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleClientSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectClient: (client: Client) => void;
  handleClearClientSelection: () => void;
}

export const SaleMetadataSection: React.FC<SaleMetadataSectionProps> = ({
  formData,
  sellers,
  clientSearchTerm,
  searchedClients,
  selectedClient,
  clientInputRef,
  isModuleEnabled,
  handleFormChange,
  handleClientSearchChange,
  handleSelectClient,
  handleClearClientSelection,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-4">
      {/* Panel: Datos del Comprobante */}
      <div className="border border-border p-4 rounded-xl bg-muted/10 space-y-3">
        <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase pb-1 border-b border-border/50">
          <ClipboardList size={14} className="text-primary" /> Datos de Venta
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-1">
            <Select
              label="Forma de Pago *"
              name="paymentType"
              value={formData.paymentType}
              onChange={handleFormChange}
              required
              className="text-xs rounded-xl h-9"
            >
              <option value="">Seleccionar...</option>
              {Object.values(PaymentTypeEnum).map((type) => {
                if (
                  type === PaymentTypeEnum.ON_ACCOUNT &&
                  !(
                    isModuleEnabled("clientes") &&
                    isModuleEnabled("cuenta_corriente") &&
                    formData.clientId
                  )
                )
                  return null;
                return (
                  <option key={type} value={type}>
                    {getPaymentTypeDisplay(type)}
                  </option>
                );
              })}
            </Select>
          </div>

          <div className="sm:col-span-1">
            {isModuleEnabled("vendedores") ? (
              <Select
                label="Vendedor *"
                name="sellerId"
                value={formData.sellerId}
                onChange={handleFormChange}
                required
                className="text-xs rounded-xl h-9"
              >
                <option value="">Seleccionar...</option>
                {sellers.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                label="Comprobante"
                value="Ticket de Venta"
                disabled
                className="text-xs rounded-xl h-9 bg-muted"
              />
            )}
          </div>

          {isModuleEnabled("combos_promociones") && (
            <div className="sm:col-span-2">
              <Input
                label="Cupón de Descuento"
                name="discountCode"
                value={formData.discountCode}
                onChange={handleFormChange}
                placeholder="Ej: VERANO20"
                className="text-xs rounded-xl h-9"
              />
            </div>
          )}

          <div className="sm:col-span-2">
            <label
              htmlFor="notes"
              className="block text-[10px] font-bold text-foreground-muted mb-1 uppercase"
            >
              Observaciones
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={1}
              value={formData.notes}
              onChange={handleFormChange}
              placeholder="Notas internas de la operación..."
              className="block w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary placeholder:text-foreground-muted/50"
            />
          </div>
        </div>
      </div>

      {/* Panel: Datos del Cliente */}
      <div className="border border-border p-4 rounded-xl bg-muted/10 flex flex-col justify-between">
        <div>
          <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase pb-1 border-b border-border/50 mb-3">
            <User size={14} className="text-primary" /> Datos del Cliente
          </h3>

          {isModuleEnabled("clientes") ? (
            !formData.clientId ? (
              <div className="relative">
                <Input
                  ref={clientInputRef}
                  label="Buscar Cliente (Opcional)"
                  name="clientSearch"
                  placeholder="Nombre, apellido o email..."
                  value={clientSearchTerm}
                  onChange={handleClientSearchChange}
                  autoComplete="off"
                  className="text-xs rounded-xl h-9 border-border"
                />
                {searchedClients.length > 0 && (
                  <ul className="absolute z-20 w-full bg-background border border-border rounded-xl shadow-lg max-h-40 overflow-y-auto mt-1 border-collapse text-xs">
                    {searchedClients.map((client) => (
                      <li
                        key={client.id}
                        onClick={() => handleSelectClient(client)}
                        className="px-3 py-2 hover:bg-muted cursor-pointer border-b border-border last:border-b-0 flex flex-col"
                      >
                        <span className="font-semibold text-foreground">
                          {client.firstName} {client.lastName || ""}
                        </span>
                        <span className="text-[10px] text-foreground-muted">
                          {client.email || "Sin email"} &middot; {client.phone || "Sin tel"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              selectedClient && (
                <div className="bg-white border border-border p-3 rounded-xl shadow-sm space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-sm">
                      {selectedClient.firstName} {selectedClient.lastName || ""}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearClientSelection}
                      className="text-[10px] text-red-500 font-bold hover:underline"
                    >
                      Deseleccionar
                    </button>
                  </div>
                  {selectedClient.phone && (
                    <p className="text-foreground-muted">
                      <strong className="font-semibold text-foreground">
                        Teléfono:
                      </strong>{" "}
                      {selectedClient.phone}
                    </p>
                  )}
                  {selectedClient.address && (
                    <p className="text-foreground-muted">
                      <strong className="font-semibold text-foreground">
                        Domicilio:
                      </strong>{" "}
                      {selectedClient.address}
                    </p>
                  )}
                  <p className="text-foreground-muted">
                    <strong className="font-semibold text-foreground">
                      Condición IVA:
                    </strong>{" "}
                    Consumidor Final
                  </p>
                </div>
              )
            )
          ) : (
            <div className="bg-white/40 border border-border/60 p-3 rounded-xl text-xs space-y-1">
              <p className="font-bold text-foreground">Cliente Ocasional</p>
              <p className="text-foreground-muted">
                Condición IVA: Consumidor Final
              </p>
              <p className="text-[10px] text-foreground-muted/60 mt-1">
                Habilite el módulo de Clientes para registrar cuentas nominadas.
              </p>
            </div>
          )}
        </div>

        <div className="text-[9px] text-foreground-muted/50 mt-4 leading-normal">
          Utilice{" "}
          <kbd className="px-1.5 py-0.5 bg-muted border border-border font-mono rounded shadow-sm">
            F4
          </kbd>{" "}
          para vaciar la venta y empezar una nueva.
        </div>
      </div>
    </div>
  );
};

export default SaleMetadataSection;
