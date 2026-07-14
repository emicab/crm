export interface SaleItemInCart {
  productId: string;
  productName: string;
  availableStock: number;
  quantity: number;
  priceAtSale: number;
  tempId: number;
  subtotal: number;
  comboBatchId?: number;
  unitType?: string;
}
