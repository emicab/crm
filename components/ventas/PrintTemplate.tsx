"use client";
import React from "react";
import { formatCurrency } from "@/lib/formatCurrency";
import { formatDate } from "@/lib/formatDate";
import { getPaymentTypeDisplay } from "@/lib/displayTexts";

interface PrintTemplateProps {
  format: "ticket" | "a4";
  sale: any;
  config: Record<string, string>;
  invoiceQrDataUrl: string | null;
}

export const PrintTemplate: React.FC<PrintTemplateProps> = ({
  format,
  sale,
  config,
  invoiceQrDataUrl,
}) => {
  if (format === "a4") {
    return (
      <div
        className="bg-[#ffffff] text-[#111827] font-sans text-xs leading-relaxed p-4 sm:p-6 max-w-[210mm] mx-auto min-h-[297mm] flex flex-col border border-[#f3f4f6] shadow-xl print:shadow-none print:border-none print:p-0"
        id="print-template-content"
      >
        {/* Header Superior */}
        <div className="flex justify-between items-start border-b-2 border-[#111827] pb-3 mb-4">
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#111827] mb-1 uppercase">
              {config.businessName || "CLINPOS"}
            </h1>
            <p className="text-[#4b5563] font-medium text-[10px] sm:text-xs">
              {config.businessAddress || "Dirección no configurada"}
            </p>
            <p className="text-[#4b5563] font-medium text-[10px] sm:text-xs">
              {config.businessPhone || ""}
            </p>
            {config.arcaCuit && (
              <p className="text-[#4b5563] font-medium mt-0.5 text-[10px] sm:text-xs">
                CUIT: {config.arcaCuit}
              </p>
            )}
            {config.condicionIva && (
              <p className="text-[#4b5563] font-medium text-[10px] sm:text-xs">
                {config.condicionIva}
              </p>
            )}
          </div>

          <div className="text-right flex flex-col justify-end">
            <div className="bg-[#111827] text-[#ffffff] px-2 py-1 rounded-l-lg -mr-4 sm:-mr-6 mb-2 inline-block">
              <h2 className="text-base font-bold uppercase tracking-wider">
                {sale.invoice
                  ? `FACTURA ${sale.invoice.invoiceType}`
                  : sale.status === "PENDING"
                    ? "PEDIDO DE VENTA"
                    : "TICKET NO FISCAL"}
              </h2>
            </div>

            <div className="text-[#374151] space-y-0.5">
              {sale.invoice ? (
                <>
                  <p className="text-xs font-semibold">
                    Comp. Nro:{" "}
                    {String(sale.invoice.pointOfSale).padStart(4, "0")}-
                    {String(sale.invoice.invoiceNumber).padStart(8, "0")}
                  </p>
                  <p className="text-[10px] sm:text-xs">Fecha: {formatDate(sale.saleDate)}</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold">
                    Venta Nro: #{String(sale.id).padStart(8, "0")}
                  </p>
                  <p className="text-[10px] sm:text-xs">Fecha: {formatDate(sale.saleDate)}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Info del Cliente */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-[#f9fafb] p-2 rounded-lg border border-[#e5e7eb]">
            <h3 className="text-[8px] uppercase font-bold text-[#9ca3af] mb-1 tracking-wider">
              Facturado A
            </h3>
            <p className="font-bold text-[10px] sm:text-xs text-[#1f2937] mb-0.5">
              {sale.client
                ? `${sale.client.firstName} ${sale.client.lastName || ""}`.trim()
                : "Consumidor Final"}
            </p>
            {sale.client?.cuit && (
              <p className="text-[#4b5563] text-[10px]">
                CUIT/DNI: {sale.client.cuit}
              </p>
            )}
            {sale.invoice?.clientCuit &&
              sale.invoice.clientCuit !== sale.client?.cuit && (
                <p className="text-[#4b5563] text-[10px]">
                  CUIT Factura: {sale.invoice.clientCuit}
                </p>
              )}
          </div>
          <div className="bg-[#f9fafb] p-2 rounded-lg border border-[#e5e7eb]">
            <h3 className="text-[8px] uppercase font-bold text-[#9ca3af] mb-1 tracking-wider">
              Detalles Adicionales
            </h3>
            <div className="space-y-1">
              <p className="text-[#374151] text-[10px] flex justify-between">
                <span className="font-semibold">Vendedor:</span>
                <span>{sale.seller?.name || "Mostrador"}</span>
              </p>
              <p className="text-[#374151] text-[10px] flex justify-between">
                <span className="font-semibold">Cond. de pago:</span>{" "}
                <span>{getPaymentTypeDisplay(sale.paymentType)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Tabla de Productos */}
        <div className="mb-4 rounded-lg overflow-hidden border border-[#e5e7eb]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#111827] text-[#ffffff]">
              <tr>
                <th className="py-1.5 px-2 w-12 font-semibold uppercase tracking-wider text-[8px] sm:text-[10px]">
                  Cant.
                </th>
                <th className="py-1.5 px-2 font-semibold uppercase tracking-wider text-[8px] sm:text-[10px]">
                  Descripción
                </th>
                <th className="py-1.5 px-2 text-right w-20 sm:w-24 font-semibold uppercase tracking-wider text-[8px] sm:text-[10px]">
                  P. Unit.
                </th>
                <th className="py-1.5 px-2 text-right w-24 sm:w-28 font-semibold uppercase tracking-wider text-[8px] sm:text-[10px]">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e7eb] bg-[#ffffff]">
              {sale.items.map((item: any) => (
                <tr key={item.id} className="text-[#1f2937]">
                  <td className="py-1.5 px-2 font-medium text-center text-[10px]">
                    {item.quantity}
                  </td>
                  <td className="py-1.5 px-2">
                    <span className="font-semibold block text-[10px]">
                      {item.product?.name || item.productName || "Producto eliminado"}
                    </span>
                    {Number(item.discountPercent) > 0 && (
                      <span className="inline-block mt-0.5 text-[8px] font-bold text-[#dc2626] bg-[#fef2f2] px-1 py-0.5 rounded border border-[#fee2e2]">
                        -{item.discountPercent}% OFF
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-right text-[#4b5563] text-[10px]">
                    $
                    {parseFloat(String(item.priceAtSale)).toLocaleString(
                      "es-AR",
                      { minimumFractionDigits: 2 },
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-right font-bold text-[#111827] text-[10px] sm:text-xs">
                    $
                    {parseFloat(String(item.subtotal)).toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="flex justify-end mb-2">
          <div className="w-56 bg-[#f9fafb] p-3 rounded-lg border border-[#e5e7eb]">
            <div className="flex justify-between py-1 text-[#4b5563] text-xs">
              <span className="font-medium">Subtotal</span>
              <span className="font-semibold">
                {formatCurrency(sale.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between py-1 mt-1 border-t-2 border-[#111827] text-base font-black text-[#111827]">
              <span>TOTAL</span>
              <span>{formatCurrency(sale.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Footer y QR */}
        <div className="flex flex-col items-center justify-center border-t border-[#e5e7eb] pt-4 mt-6 gap-3 text-center">
          {sale.invoice?.cae ? (
            <div className="flex justify-center gap-3 items-center">
              <div className="text-right text-[10px]">
                <p className="font-bold text-[#111827] mb-1 uppercase tracking-wider">
                  Comprobante Autorizado
                </p>
                <p className="text-[#4b5563] font-medium">
                  CAE: {sale.invoice.cae}
                </p>
                <p className="text-[#4b5563] font-medium">
                  Vto. CAE: {formatDate(sale.invoice.caeExpiration)}
                </p>
              </div>
              {invoiceQrDataUrl && (
                <div className="p-1 bg-[#ffffff] border-2 border-[#e5e7eb] rounded-md shadow-sm">
                  <img
                    src={invoiceQrDataUrl}
                    alt="QR AFIP"
                    className="w-16 h-16 sm:w-20 sm:h-20"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="inline-block px-3 py-1 bg-[#f3f4f6] rounded-md text-[10px] text-[#6b7280] font-bold uppercase tracking-widest border border-[#e5e7eb]">
              Documento no válido como factura
            </div>
          )}

          <div className="text-[#6b7280] text-[10px]">
            <p className="italic">
              {config.receiptFooter || "¡Gracias por tu compra!"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default: Ticket 80mm
  return (
    <div
      className="w-[80mm] mx-auto bg-[#ffffff] text-[#000000] font-mono text-sm leading-tight pb-8 pt-4 px-4"
      id="print-template-content"
    >
      <div className="text-center border-b border-[#000000] pb-2 mb-2">
        <h2 className="text-xl font-bold uppercase">
          {config.businessName || "CLINPOS"}
        </h2>
        <p className="text-xs">
          {config.businessAddress || "Dirección no configurada"}
        </p>
        <p className="text-xs">{config.businessPhone || ""}</p>
        {config.arcaCuit && (
          <p className="text-xs mt-1">CUIT: {config.arcaCuit}</p>
        )}
        {config.condicionIva && (
          <p className="text-xs">{config.condicionIva}</p>
        )}
        <p className="text-xs mt-2">--------------------------------</p>
        <h3 className="font-bold text-base mt-1">
          {sale.invoice
            ? `FACTURA ${sale.invoice.invoiceType}`
            : sale.status === "PENDING"
              ? "PEDIDO DE VENTA"
              : "TICKET DE VENTA"}
        </h3>
        <p className="text-xs">
          Nro:{" "}
          {sale.invoice
            ? `${String(sale.invoice.pointOfSale).padStart(4, "0")}-${String(sale.invoice.invoiceNumber).padStart(8, "0")}`
            : String(sale.id).padStart(8, "0")}
        </p>
        <p className="text-xs">Fecha: {formatDate(sale.saleDate)}</p>
      </div>
      <div className="mb-2 text-xs border-b border-[#000000] pb-2">
        <p>
          <strong>Cliente:</strong>{" "}
          {sale.client
            ? `${sale.client.firstName} ${sale.client.lastName || ""}`.trim()
            : "Consumidor Final"}
        </p>
        {sale.client?.cuit && (
          <p>
            <strong>DNI/CUIT:</strong> {sale.client.cuit}
          </p>
        )}
        {sale.invoice?.clientCuit &&
          sale.invoice.clientCuit !== sale.client?.cuit && (
            <p>
              <strong>CUIT Factura:</strong> {sale.invoice.clientCuit}
            </p>
          )}
        <p>
          <strong>Vendedor:</strong> {sale.seller?.name || "Mostrador"}
        </p>
        <p>
          <strong>Cond. Pago:</strong> {getPaymentTypeDisplay(sale.paymentType)}
        </p>
      </div>
      <table className="w-full text-xs text-left mb-2">
        <thead>
          <tr className="border-b border-[#000000]/50">
            <th className="py-1">Cant</th>
            <th className="py-1">Producto</th>
            <th className="py-1 text-right">Monto</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item: any) => (
            <tr key={item.id}>
              <td className="py-1 align-top">{item.quantity}</td>
              <td className="py-1 align-top pr-1">
                {item.product?.name || item.productName || "Producto eliminado"}
                {Number(item.discountPercent) > 0 && (
                  <span className="block text-[10px]">
                    (-{item.discountPercent}%)
                  </span>
                )}
              </td>
              <td className="py-1 align-top text-right">
                $
                {parseFloat(String(item.subtotal)).toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-[#000000] pt-2 mb-4 text-right">
        <p className="text-lg font-bold">
          TOTAL: {formatCurrency(sale.totalAmount)}
        </p>
      </div>
      {sale.invoice?.cae && (
        <div className="text-center text-xs mt-4 pt-2 border-t border-[#000000] border-dashed">
          <p className="font-bold">Comprobante Autorizado por AFIP</p>
          <p>CAE: {sale.invoice.cae}</p>
          <p>Vto. CAE: {formatDate(sale.invoice.caeExpiration)}</p>
          {invoiceQrDataUrl && (
            <div className="mt-2 flex justify-center">
              <img src={invoiceQrDataUrl} alt="QR AFIP" className="w-32 h-32" />
            </div>
          )}
        </div>
      )}

      {!sale.invoice?.cae && (
        <div className="text-center text-[10px] mt-4 pt-2 border-t border-[#000000] border-dashed">
          <p>DOCUMENTO NO VÁLIDO COMO FACTURA</p>
        </div>
      )}
      <div className="text-center text-xs mt-6">
        <p>{config.receiptFooter || "¡Gracias por su compra!"}</p>
      </div>
    </div>
  );
};
