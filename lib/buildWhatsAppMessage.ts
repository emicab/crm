interface WhatsAppItem {
  productName?: string;
  productId: number;
  quantity: number;
  purchasePrice: number;
}

interface WhatsAppPurchase {
  items: WhatsAppItem[];
  totalAmount: number;
  supplier?: { name?: string } | null;
}

export function buildWhatsAppMessage(purchase: WhatsAppPurchase): string {
  const lines = purchase.items.map(
    item => `- ${item.productName || `#${item.productId}`}: ${item.quantity} x $${Number(item.purchasePrice).toFixed(2)}`
  );
  const total = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(purchase.totalAmount);
  return `Hola ${purchase.supplier?.name || ''}, te hago el pedido:\n\n${lines.join('\n')}\n\nTotal: ${total}\n\nSaludos!`;
}
