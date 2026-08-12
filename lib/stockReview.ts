// lib/stockReview.ts
// WP1 "Regla de Oro": el cliente que está físicamente en el mostrador tiene
// prioridad sobre la última unidad. Si el stock local (SQLite) no alcanza para
// cubrir un pedido web, el pedido pasa a estado PENDING_REVIEW con una nota que
// detalla lo que falta, y el POS notifica al comerciante para que decida
// (cancelar y devolver por Mercado Pago, reponer stock, u ofrecer alternativa).
import prisma from './prisma';
import { getRecipeAvailability, computeOrderIngredientShortfall } from './recipeStock';
import { formatQuantity } from './recipeUnits';

export interface MissingStock {
  productId: number;
  name: string;
  required: number;
  available: number;
  unitType?: string | null;
}

// Estados en los que el pedido todavía se debe poder cumplir. Fuera de acá:
// DELIVERED / CANCELLED (terminales) y PENDING_REVIEW (ya está en revisión).
const ACTIVE_STATUSES = [
  'PENDING_PAYMENT',
  'PENDING_PREPARATION',
  'READY_FOR_PICKUP',
  'SHIPPED',
];

async function getOrderBranchId(
  order: { branchId: number | null },
): Promise<number | null> {
  if (order.branchId) return order.branchId;
  const main = await prisma.branch.findFirst({ where: { isMain: true } });
  return main?.id ?? null;
}

function formatMissingNote(missing: MissingStock[]): string {
  return missing
    .map((m) => {
      const qty = (v: number) =>
        m.unitType ? formatQuantity(v, m.unitType) : v.toLocaleString('es-AR');
      return `${m.name}: faltan ${qty(m.required - m.available)} (disponible ${qty(m.available)})`;
    })
    .slice(0, 5)
    .join('; ');
}

// Verifica si un pedido se puede cumplir con el stock local (por sucursal).
// Devuelve la lista de ítems/faltantes (vacía si alcanza). Los elaborados se
// validan de forma COMBINADA contra los ingredientes (el stock derivado por
// tipo no es sumable entre variantes que comparten ingredientes).
export async function checkOrderFulfillable(orderId: number): Promise<MissingStock[]> {
  const order = await prisma.webOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return [];

  const branchId = await getOrderBranchId(order);
  const missing: MissingStock[] = [];

  const recipeItems: { productId: number; quantity: number }[] = [];
  const simpleItems: { productId: number; quantity: number; name?: string }[] = [];

  for (const item of order.items) {
    const required = Number(item.quantity) || 0;
    if (required <= 0) continue;
    try {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { id: true, isRecipe: true, name: true },
      });
      if (!product) continue;
      if (product.isRecipe) {
        recipeItems.push({ productId: item.productId, quantity: required });
      } else {
        simpleItems.push({ productId: item.productId, quantity: required, name: product.name });
      }
    } catch (err) {
      console.warn("[StockReview] No se pudo verificar ítem", item.productId, err);
    }
  }

  // Elaborados: suma de requerimientos por ingrediente contra el stock real.
  if (recipeItems.length > 0) {
    try {
      const shortfalls = await computeOrderIngredientShortfall(prisma, recipeItems, branchId);
      for (const s of shortfalls) {
        missing.push({
          productId: s.ingredientId,
          name: s.name,
          required: s.required,
          available: Math.max(0, s.available),
          unitType: s.unitType,
        });
      }
    } catch (err) {
      console.warn("[StockReview] No se pudo verificar ingredientes", err);
    }
  }

  // Productos simples: chequeo por ítem contra su propio stock.
  for (const item of simpleItems) {
    try {
      const { available } = await getRecipeAvailability(prisma, item.productId, branchId);
      if (available < item.quantity) {
        missing.push({
          productId: item.productId,
          name: item.name || `Producto #${item.productId}`,
          required: item.quantity,
          available: Math.max(0, available),
        });
      }
    } catch (err) {
      console.warn("[StockReview] No se pudo verificar ítem", item.productId, err);
    }
  }

  return missing;
}

// Escanea los pedidos activos y marca como PENDING_REVIEW los que el stock local
// no puede cubrir. Solo se marca una vez (stockReviewAt nulo): una vez que el
// comerciante decide, se limpia la marca para no pelear con su resolución.
export async function markWebOrdersForReview(): Promise<number> {
  const orders = await prisma.webOrder.findMany({
    where: {
      status: { in: ACTIVE_STATUSES as any },
      stockReviewAt: null,
    },
    select: { id: true },
  });

  let flagged = 0;
  for (const o of orders) {
    const missing = await checkOrderFulfillable(o.id);
    if (missing.length === 0) continue;

    await prisma.webOrder.update({
      where: { id: o.id },
      data: {
        status: 'PENDING_REVIEW',
        stockReviewNote: formatMissingNote(missing),
        stockReviewAt: new Date(),
      },
    });
    flagged++;

    // Propagar el nuevo estado a la nube lo antes posible (no esperar el sync completo).
    try {
      const { enqueueOutbox } = await import('./syncOutbox');
      await enqueueOutbox('WebOrder', 'UPSERT', String(o.id));
    } catch (err) {
      console.warn('[StockReview] No se pudo encolar pedido en revisión:', err);
    }
  }

  return flagged;
}

// Revalida un pedido (lo usa el comerciante tras reponer stock).
// Si ya se puede cumplir, vuelve a PENDING_PREPARATION y limpia la marca.
export async function revalidateOrder(
  orderId: number,
): Promise<'READY' | 'STILL_MISSING'> {
  const order = await prisma.webOrder.findUnique({ where: { id: orderId } });
  if (!order) return 'STILL_MISSING';

  const missing = await checkOrderFulfillable(orderId);
  if (missing.length === 0) {
    await prisma.webOrder.update({
      where: { id: orderId },
      data: {
        status: 'PENDING_PREPARATION',
        stockReviewNote: null,
        stockReviewAt: null,
      },
    });
    return 'READY';
  }

  await prisma.webOrder.update({
    where: { id: orderId },
    data: {
      stockReviewNote: formatMissingNote(missing),
      stockReviewAt: new Date(),
    },
  });
  return 'STILL_MISSING';
}
