import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { RappiApiClient } from "@/lib/integrations/rappiApiClient";
import { validateWebhookAuth } from "@/lib/integrations/webhookAuth";
import { applyRateLimit } from "@/lib/rateLimit";

// Webhook de Rappi Integrations API.
// - Valida el token estático (Authorization: Bearer) con comparación timing-safe.
// - Aplica rate limit para mitigar floods.
// - Mapea productos por SKU/externalSku; crea placeholder si no hay match
//   (nunca vuelca al primer producto de la base).
// - Sincroniza el ciclo de vida del pedido existente (cancelado/despachado).

const RAPPI_STATUS_TO_LOCAL: Record<string, { status: string; note?: string }> = {
  CANCELLED: { status: "CANCELLED", note: "Cancelado por cliente/plataforma Rappi." },
  REJECTED: { status: "CANCELLED", note: "Rechazado por Rappi." },
  COMPLETED: { status: "DELIVERED" },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  if (!applyRateLimit(req, res, 60, 60 * 1000)) {
    return;
  }

  try {
    const payload = req.body;
    const orderId = payload.order_id || payload.id;

    if (!orderId) {
      return res.status(400).json({ message: "order_id es requerido" });
    }

    const storeConfig = await prisma.storeConfig.findFirst();
    if (!storeConfig || !storeConfig.rappiEnabled) {
      return res.status(403).json({ message: "Integración con Rappi desactivada" });
    }

    // Auth obligatoria cuando la integración está activa.
    if (!validateWebhookAuth(req, res, storeConfig.rappiWebhookSecret, true)) {
      return;
    }

    const externalId = String(orderId);
    const existing = await prisma.webOrder.findFirst({
      where: { externalOrderId: externalId },
    });

    // Sincronizar ciclo de vida del pedido existente.
    if (existing) {
      const mapped = RAPPI_STATUS_TO_LOCAL[String(payload.status || "").toUpperCase()];
      if (mapped && existing.status !== mapped.status) {
        await prisma.webOrder.update({
          where: { id: existing.id },
          data: {
            status: mapped.status as any,
            ...(mapped.note ? { stockReviewNote: mapped.note } : {}),
          },
        });
      }
      return res.status(200).json({ message: "Pedido ya registrado", orderId: existing.id });
    }

    const customerName = payload.customer?.name || "Cliente Rappi";
    const customerPhone = payload.customer?.phone || "Sin teléfono";
    const shippingAddress =
      payload.delivery_address?.address || payload.delivery_address?.formatted_address || null;
    const itemsPayload = payload.items || [];

    const subtotal = itemsPayload.reduce(
      (acc: number, item: any) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1),
      0
    );
    const deliveryFee = Number(payload.delivery_fee || 0);
    const totalAmount = Number(payload.total || subtotal + deliveryFee);

    // Mapeo por SKU / externalSku.
    const skus = itemsPayload
      .map((it: any) => it.sku || it.id || it.external_id || null)
      .filter(Boolean) as string[];
    const dbProducts = await prisma.product.findMany({
      where: {
        OR: [{ sku: { in: skus } }, { externalSku: { in: skus } }],
      },
    });
    const productMap = new Map<string, number>();
    dbProducts.forEach((p) => {
      if (p.sku) productMap.set(p.sku, p.id);
      if (p.externalSku) productMap.set(p.externalSku, p.id);
    });

    // Producto placeholder genérico para items sin SKU o sin match.
    let genericProductId: number | null = null;
    const ensureGenericProduct = async () => {
      if (genericProductId) return genericProductId;
      const existing = await prisma.product.findFirst({
        where: { name: "Producto sin mapear (Rappi)" },
        select: { id: true },
      });
      if (existing) {
        genericProductId = existing.id;
        return genericProductId;
      }
      const created = await prisma.product.create({
        data: {
          name: "Producto sin mapear (Rappi)",
          priceSale: 0,
          pricePurchase: 0,
          quantityStock: 0,
          isIngredient: false,
          isPublicWeb: false,
        },
      });
      genericProductId = created.id;
      return genericProductId;
    };

    const resolveProductId = async (item: any): Promise<number> => {
      const sku = item.sku || item.id || item.external_id || null;
      if (!sku) return ensureGenericProduct();

      const mappedId = productMap.get(sku);
      if (mappedId) return mappedId;

      // Crear placeholder por SKU (con reintento ante race del único).
      try {
        const created = await prisma.product.create({
          data: {
            name: `${item.name || "Producto"} (Rappi ${sku})`,
            sku: String(sku),
            externalSku: String(sku),
            priceSale: Number(item.price) || 0,
            pricePurchase: 0,
            quantityStock: 0,
            isIngredient: false,
            isPublicWeb: false,
          },
        });
        productMap.set(sku, created.id);
        return created.id;
      } catch {
        const retry = await prisma.product.findFirst({
          where: { OR: [{ sku: String(sku) }, { externalSku: String(sku) }] },
          select: { id: true },
        });
        if (retry) {
          productMap.set(sku, retry.id);
          return retry.id;
        }
        return ensureGenericProduct();
      }
    };

    const shortCode = externalId.slice(-6);
    const webOrderNumber = `RAPPI-${shortCode.toUpperCase()}`;

    // El índice único sobre externalOrderId impide duplicados por retries
    // concurrentes; ante conflicto (P2002) se devuelve el pedido existente.
    let newOrder;
    try {
      newOrder = await prisma.webOrder.create({
        data: {
          webOrderNumber,
          clientName: customerName,
          clientPhone: customerPhone,
          shippingAddress,
          deliveryType: payload.is_pickup ? "PICKUP" : "DELIVERY",
          paymentMethod: payload.payment_method || "MERCADO_PAGO",
          paymentStatus: "PAID",
          status: "PENDING_PREPARATION",
          totalAmount,
          subtotalAmount: subtotal,
          deliveryFee,
          origin: "RAPPI",
          externalOrderId: externalId,
          vendorId: storeConfig.rappiStoreId,
          transportType: "LOGISTICS_DELIVERY",
          notes: payload.notes || null,
          items: {
            create: await Promise.all(
              itemsPayload.map(async (it: any) => ({
                productId: await resolveProductId(it),
                quantity: Number(it.quantity || 1),
                unitPrice: Number(it.price || 0),
                subtotal: Number((Number(it.price) || 0) * (Number(it.quantity) || 1)),
                externalItemId: it.id ? String(it.id) : null,
              }))
            ),
          },
        },
      });
    } catch (err: any) {
      if (err?.code === "P2002") {
        const dup = await prisma.webOrder.findFirst({
          where: { externalOrderId: externalId },
        });
        if (dup) {
          return res.status(200).json({ message: "Pedido ya registrado", orderId: dup.id });
        }
      }
      throw err;
    }

    if (storeConfig.rappiAutoAccept && storeConfig.rappiApiKey) {
      try {
        const client = new RappiApiClient({
          apiKey: storeConfig.rappiApiKey,
          storeId: storeConfig.rappiStoreId || "",
        });
        await client.acceptOrder(externalId, 20);
      } catch (err: any) {
        console.error("Error al auto-aceptar pedido en Rappi:", err?.message || err);
      }
    }

    return res.status(200).json({ success: true, orderId: newOrder.id });
  } catch (error: any) {
    console.error("Error procesando Webhook de Rappi:", error);
    return res.status(500).json({ message: error.message || "Error interno del servidor" });
  }
}
