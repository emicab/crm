"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatCurrency } from "@/lib/formatCurrency";
import { formatDate } from "@/lib/formatDate";
import { getPaymentTypeDisplay } from "@/lib/displayTexts";
import QRCode from "qrcode";
import { Loader2 } from "lucide-react";
import type {
  Sale,
  SaleItem,
  Product,
  Client,
  Seller,
  CashRegister,
} from "@/types";
interface SaleItemDetail extends Omit<SaleItem, "product"> {
  product: Product | null;
  subtotal: number;
  discountPercent?: number | string | null;
}
interface SaleDetail extends Omit<
  Sale,
  "items" | "totalAmount" | "priceAtSale"
> {
  items: SaleItemDetail[];
  totalAmount: number;
  client?: Client | null;
  seller?: Seller;
  cashRegister?: CashRegister | null;
  invoice?: {
    cae: string;
    caeExpiration: string;
    invoiceType: string;
    invoiceNumber: number;
    pointOfSale: number;
    clientCuit?: string | null;
    clientName?: string | null;
  } | null;
}
export default function PrintPage() {
  const params = useParams();
  const saleId = params?.id as string;
  const [format, setFormat] = useState("ticket"); // 'ticket' or 'a4'
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [invoiceQrDataUrl, setInvoiceQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'a4' || hash === 'ticket') {
        setFormat(hash);
      }
    }
    
    // Agregamos Date.now() para evitar que Tauri / NextJS cacheen la config vieja
    fetch(`/api/config?t=${Date.now()}`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => setConfig(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!saleId) return;

    fetch(`/api/ventas/${saleId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Venta no encontrada");
        return res.json();
      })
      .then((data) => {
        setSale({
          ...data,
          totalAmount: parseFloat(data.totalAmount),
          items: data.items.map((item: any) => ({
            ...item,
            priceAtSale: parseFloat(item.priceAtSale),
            subtotal: parseFloat(item.priceAtSale) * item.quantity,
          })),
        });
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [saleId]);
  useEffect(() => {
    if (sale && sale.invoice) {
      const invoice = sale.invoice;
      const generateAfipQr = async () => {
        try {
          let cbteTipo = 6;
          if (invoice.invoiceType === "A") cbteTipo = 1;
          if (invoice.invoiceType === "C") cbteTipo = 11;
          const docType = invoice.clientCuit
            ? invoice.clientCuit.length === 11
              ? 80
              : 96
            : 99;
          const docNum = invoice.clientCuit
            ? parseInt(invoice.clientCuit.replace(/\D/g, ""), 10)
            : 0;
          const qrData = {
            ver: 1,
            fecha: sale.saleDate.slice(0, 10),
            cuit: parseInt(config.arcaCuit || "30111111118", 10),
            ptoVta: invoice.pointOfSale,
            tipoCmp: cbteTipo,
            nroCmp: invoice.invoiceNumber,
            importe: sale.totalAmount,
            moneda: "PES",
            cotizacion: 1,
            tipoDocRec: docType,
            nroDocRec: docNum,
            tipoCodAut: "E",
            codAut: parseInt(invoice.cae, 10),
          };
          const base64Data = Buffer.from(JSON.stringify(qrData)).toString(
            "base64",
          );
          const url = `https://www.afip.gob.ar/fe/qr/?p=${base64Data}`;
          const dataUrl = await QRCode.toDataURL(url, {
            width: 120,
            margin: 1,
            color: { dark: "#000000", light: "#ffffff" },
          });
          setInvoiceQrDataUrl(dataUrl);
        } catch (e) {
          console.error("Error generating AFIP QR Code:", e);
        }
      };
      generateAfipQr();
    }
  }, [sale, config]);
  useEffect(() => {
    if (!loading && sale) {
      // Un pequeño delay para asegurar que React renderizó el DOM y las imágenes/QR cargaron
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, sale]);
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <Loader2 className="animate-spin text-gray-400" />
      </div>
    );
  if (!sale)
    return (
      <div className="flex items-center justify-center h-screen bg-white text-black font-sans">
        No se pudo cargar la venta
      </div>
    );
  if (format === "a4") {
    return (
      <div className="bg-white text-gray-900 font-sans text-sm leading-relaxed p-10 max-w-[210mm] mx-auto min-h-screen border border-gray-100 shadow-xl print:shadow-none print:border-none print:p-0">
        
        {/* Header Superior */}
        <div className="flex justify-between items-start border-b-4 border-gray-900 pb-6 mb-8">
          <div className="flex flex-col">
            <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-2 uppercase">
              {config.businessName || "CLINPOS"}
            </h1>
            <p className="text-gray-600 font-medium text-base">
              {config.businessAddress || "Dirección no configurada"}
            </p>
            <p className="text-gray-600 font-medium text-base">
              {config.businessPhone || ""}
            </p>
            {config.arcaCuit && (
              <p className="text-gray-600 font-medium mt-1">CUIT: {config.arcaCuit}</p>
            )}
            {config.condicionIva && (
              <p className="text-gray-600 font-medium">{config.condicionIva}</p>
            )}
          </div>
          
          <div className="text-right flex flex-col justify-end">
            <div className="bg-gray-900 text-white px-4 py-2 rounded-l-lg -mr-10 mb-4 inline-block">
              <h2 className="text-2xl font-bold uppercase tracking-wider">
                {sale.invoice
                  ? `FACTURA ${sale.invoice.invoiceType}`
                  : sale.status === "PENDING"
                    ? "PEDIDO DE VENTA"
                    : "TICKET NO FISCAL"}
              </h2>
            </div>
            
            <div className="text-gray-700 space-y-1">
              {sale.invoice ? (
                <>
                  <p className="text-base font-semibold">
                    Comp. Nro: {String(sale.invoice.pointOfSale).padStart(4, "0")}-
                    {String(sale.invoice.invoiceNumber).padStart(8, "0")}
                  </p>
                  <p className="text-base">Fecha: {formatDate(sale.saleDate)}</p>
                </>
              ) : (
                <>
                  <p className="text-base font-semibold">
                    Venta Nro: #{String(sale.id).padStart(8, "0")}
                  </p>
                  <p className="text-base">Fecha: {formatDate(sale.saleDate)}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Info del Cliente */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <h3 className="text-xs uppercase font-bold text-gray-400 mb-2 tracking-wider">
              Facturado A
            </h3>
            <p className="font-bold text-xl text-gray-800 mb-1">
              {sale.client
                ? `${sale.client.firstName} ${sale.client.lastName || ""}`.trim()
                : "Consumidor Final"}
            </p>
            {sale.client?.cuit && (
              <p className="text-gray-600">CUIT/DNI: {sale.client.cuit}</p>
            )}
            {sale.invoice?.clientCuit &&
              sale.invoice.clientCuit !== sale.client?.cuit && (
                <p className="text-gray-600">
                  CUIT Factura: {sale.invoice.clientCuit}
                </p>
              )}
          </div>
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <h3 className="text-xs uppercase font-bold text-gray-400 mb-2 tracking-wider">
              Detalles Adicionales
            </h3>
            <div className="space-y-2">
              <p className="text-gray-700 flex justify-between">
                <span className="font-semibold">Vendedor:</span> 
                <span>{sale.seller?.name || "Mostrador"}</span>
              </p>
              <p className="text-gray-700 flex justify-between">
                <span className="font-semibold">Condición de pago:</span>{" "}
                <span>{getPaymentTypeDisplay(sale.paymentType)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Tabla de Productos */}
        <div className="mb-10 rounded-xl overflow-hidden border border-gray-200">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="py-3 px-4 w-16 font-semibold uppercase tracking-wider text-xs">Cant.</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-xs">Descripción</th>
                <th className="py-3 px-4 text-right w-32 font-semibold uppercase tracking-wider text-xs">P. Unit.</th>
                <th className="py-3 px-4 text-right w-40 font-semibold uppercase tracking-wider text-xs">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sale.items.map((item) => (
                <tr key={item.id} className="text-gray-800">
                  <td className="py-4 px-4 font-medium text-center">{item.quantity}</td>
                  <td className="py-4 px-4">
                    <span className="font-semibold block text-base">
                      {item.product?.name || item.productName || "Producto eliminado"}
                    </span>
                    {Number(item.discountPercent) > 0 && (
                      <span className="inline-block mt-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                        -{item.discountPercent}% OFF
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right text-gray-600">
                    $
                    {parseFloat(String(item.priceAtSale)).toLocaleString(
                      "es-AR",
                      { minimumFractionDigits: 2 },
                    )}
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-gray-900 text-base">
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
        <div className="flex justify-end mb-16">
          <div className="w-80 bg-gray-50 p-6 rounded-xl border border-gray-200">
            <div className="flex justify-between py-2 text-gray-600">
              <span className="font-medium">Subtotal</span>
              <span className="font-semibold">{formatCurrency(sale.totalAmount)}</span>
            </div>
            <div className="flex justify-between py-4 mt-2 border-t-2 border-gray-900 text-2xl font-black text-gray-900">
              <span>TOTAL</span>
              <span>{formatCurrency(sale.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Footer y QR */}
        <div className="grid grid-cols-2 gap-8 border-t border-gray-200 pt-8 mt-auto">
          <div className="text-gray-500 text-sm">
            <p className="font-bold text-gray-700 mb-2 uppercase tracking-wider text-xs">Comentarios</p>
            <p className="italic bg-gray-50 p-4 rounded-lg border border-gray-100">{config.receiptFooter || "¡Gracias por su compra!"}</p>
          </div>
          
          {sale.invoice?.cae ? (
            <div className="flex justify-end gap-6 items-center">
              <div className="text-right text-xs">
                <p className="font-bold text-gray-900 text-sm mb-1 uppercase tracking-wider">
                  Comprobante Autorizado
                </p>
                <p className="text-gray-600 font-medium">CAE: {sale.invoice.cae}</p>
                <p className="text-gray-600 font-medium">
                  Vto. CAE: {formatDate(sale.invoice.caeExpiration)}
                </p>
              </div>
              {invoiceQrDataUrl && (
                <div className="p-2 bg-white border-2 border-gray-200 rounded-xl shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={invoiceQrDataUrl}
                    alt="QR AFIP"
                    className="w-28 h-28"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-end items-center">
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-xs text-gray-500 font-bold uppercase tracking-widest border border-gray-200">
                Documento no válido como factura
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  // Default: Ticket 80mm
  return (
    <div className="w-[80mm] mx-auto bg-white text-black font-mono text-sm leading-tight pb-8 pt-4">
      <div className="text-center border-b border-black pb-2 mb-2">
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
      <div className="mb-2 text-xs border-b border-black pb-2">
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
          <tr className="border-b border-black/50">
            <th className="py-1">Cant</th>
            <th className="py-1">Producto</th>
            <th className="py-1 text-right">Monto</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item) => (
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
      <div className="border-t border-black pt-2 mb-4 text-right">
        <p className="text-lg font-bold">
          TOTAL: {formatCurrency(sale.totalAmount)}
        </p>
      </div>
      {sale.invoice?.cae && (
        <div className="text-center text-xs mt-4 pt-2 border-t border-black border-dashed">
          <p className="font-bold">Comprobante Autorizado por AFIP</p>
          <p>CAE: {sale.invoice.cae}</p>
          <p>Vto. CAE: {formatDate(sale.invoice.caeExpiration)}</p>
          {invoiceQrDataUrl && (
            <div className="mt-2 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={invoiceQrDataUrl} alt="QR AFIP" className="w-32 h-32" />
            </div>
          )}
        </div>
      )}

      {!sale.invoice?.cae && (
        <div className="text-center text-[10px] mt-4 pt-2 border-t border-black border-dashed">
          <p>DOCUMENTO NO VÁLIDO COMO FACTURA</p>
        </div>
      )}
      <div className="text-center text-xs mt-6">
        <p>{config.receiptFooter || "¡Gracias por su compra!"}</p>
      </div>
    </div>
  );
}
