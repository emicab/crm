"use client";

import React from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { XCircle } from "lucide-react";
import type { Client, Seller } from "@/types";

interface AdditionalDetailsSectionProps {
  clientSearchTerm: string;
  searchedClients: Client[];
  selectedClientId: string;
  sellerId: string;
  discountCode: string;
  notes: string;
  sellers: Seller[];
  onClientSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectClient: (client: Client) => void;
  onClearClient: () => void;
  onFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

const AdditionalDetailsSection: React.FC<AdditionalDetailsSectionProps> = ({
  clientSearchTerm, searchedClients, selectedClientId, sellerId, discountCode, notes,
  sellers, onClientSearchChange, onSelectClient, onClearClient, onFormChange,
}) => (
  <details className="border border-border rounded-md p-4">
    <summary className="text-sm font-medium text-primary cursor-pointer select-none">Detalles adicionales (cliente, vendedor, descuento)</summary>
    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="relative">
        <Input label="Cliente (Opcional)" name="clientSearch" placeholder="Buscar cliente..."
          value={clientSearchTerm} onChange={onClientSearchChange} autoComplete="off" />
        {selectedClientId && (
          <Button type="button" variant="ghost" size="sm" onClick={onClearClient}
            className="absolute top-7 right-1 h-7 w-7 p-0" title="Deseleccionar cliente">
            <XCircle size={16} className="text-foreground-muted hover:text-destructive" />
          </Button>
        )}
        {searchedClients.length > 0 && (
          <ul className="absolute z-20 w-full bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
            {searchedClients.map(client => (
              <li key={client.id} onClick={() => onSelectClient(client)}
                className="px-3 py-2 hover:bg-muted cursor-pointer text-sm">
                <p className="font-medium text-foreground">{client.firstName} {client.lastName || ""}</p>
                <p className="text-xs text-foreground-muted">{client.email || "Sin email"}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Select label="Vendedor *" name="sellerId" value={sellerId} onChange={onFormChange} required>
        <option value="">Selecciona un vendedor</option>
        {sellers.map(seller => <option key={seller.id} value={String(seller.id)}>{seller.name}</option>)}
      </Select>
      <Input label="Código de Descuento (Opcional)" name="discountCode" value={discountCode}
        onChange={onFormChange} placeholder="Ej: VERANO20" />
    </div>
    <div className="mt-4">
      <label htmlFor="notes" className="block text-sm font-medium text-foreground-muted mb-1.5">Notas Adicionales (Opcional)</label>
      <textarea id="notes" name="notes" rows={2} value={notes} onChange={onFormChange}
        className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    </div>
  </details>
);

export default AdditionalDetailsSection;
