
export interface Brand {
    id: number;
    name: string;
    logoUrl?: string | null;
  }
  
  export interface Category {
    id: number;
    name: string;
    logoUrl?: string | null;
  }

  
  
  export type UnitType = 'UNIT' | 'WEIGHT' | 'VOLUME' | null;

  export interface Product {
    id: number;
    name: string;
    sku?: string | null;
    description?: string | null;
    pricePurchase: number;
    priceSale: number;
    quantityStock: number;
    stockMinAlert?: number | null;
    unitType?: UnitType;
    brandId: number;
    categoryId: number;
    supplierId?: number | null;
    createdAt: string;
    updatedAt: string;
    brand: Brand;
    category: Category;
    supplier?: Supplier | null;
  }

  export interface Client {
    id: number;
    firstName: string;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    notes?: string | null;
    cuit?: string | null;
    businessName?: string | null;
    createdAt: string; // O Date, si lo transformas post-fetch
    updatedAt: string; // O Date
  }

  export interface Seller {
    id: number;
    name: string;
    email?: string | null;
    phone?: string | null;
    isActive: boolean;
    createdAt: string; // O Date
    updatedAt: string; // O Date
  }

  export enum PaymentTypeEnum { // Renombrado para evitar conflicto con el tipo PaymentType de Prisma si se importa directamente
    CASH = 'CASH',
    TRANSFER = 'TRANSFER',
    CARD = 'CARD',
    QR = 'QR',
    OTHER = 'OTHER',
    ON_ACCOUNT = 'ON_ACCOUNT',
  }
  
  export interface Combo {
    id: number;
    name: string;
    description?: string | null;
    price: number;
    active: boolean;
    createdAt: string;
    updatedAt: string;
    items: ComboItem[];
  }
  
  export interface ComboItem {
    id?: number;
    comboId?: number;
    productId: number;
    product?: Product;
    quantity: number;
    customPrice?: number | null;
  }
  
  export interface Promotion {
    id: number;
    name: string;
    description?: string | null;
    type: string; // BUY_X_GET_Y | SET_DISCOUNT | THRESHOLD
    status: string; // ACTIVE | INACTIVE
    discountType: string; // PERCENTAGE | FIXED_AMOUNT
    discountValue: number;
    minQuantity?: number | null;
    maxDiscountQty?: number | null;
    priority: number;
    startDate?: string | null;
    endDate?: string | null;
    createdAt: string;
    updatedAt: string;
    conditions: PromotionCondition[];
  }
  
  export interface PromotionCondition {
    id?: number;
    promotionId?: number;
    productId?: number | null;
    categoryId?: number | null;
    minQuantity: number;
    product?: Product;
    category?: Category;
  }
  
  export interface SaleItem {
    id?: number;
    productId: number;
    product?: Product;
    quantity: number;
    priceAtSale: number;
  }

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
  
  export interface CashRegister {
    id: number;
    openDate: string;
    closeDate?: string | null;
    initialBalance: number;
    expectedBalance?: number | null;
    actualBalance?: number | null;
    difference?: number | null;
    status: string;
    notes?: string | null;
    sellerId?: number | null;
    seller?: Seller | null;
    createdAt: string;
    updatedAt: string;
  }

  export interface Sale {
    id: number;
    discountCodeApplied: string;
    promotionsApplied?: string | null; // JSON string
    saleDate: string; // O Date
    totalAmount: number; // Prisma Decimal se convierte a string/number
    paymentType: PaymentTypeEnum;
    notes?: string | null;
    clientId?: number | null;
    client?: Client | null;
    sellerId: number;
    seller?: Seller;
    cashRegisterId?: number | null;
    cashRegister?: CashRegister | null;
    items: SaleItem[];
    createdAt: string; // O Date
    updatedAt: string; // O Date
  }

  export interface Expense {
    id: number;
    expenseDate: string; // La API la devuelve como string (ISO date)
    description: string;
    amount: number; // Convertiremos el string de la API a número
    category: string;
    paymentType: PaymentTypeEnum; // Usamos el enum que ya tenemos
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
  }

  export interface Supplier {
  id: number;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export enum PurchaseStatusEnum {
  PENDING = 'PENDING',
  ORDERED = 'ORDERED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export interface PurchaseItem {
  id?: number;
  productId: number;
  product?: Product;
  quantity: number;
  quantityReceived?: number | null; // Cantidad realmente recibida
  purchasePrice: number; // Costo por unidad
}

export interface Purchase {
  id: number;
  purchaseDate: string;
  totalAmount: number;
  status: PurchaseStatusEnum;
  paymentType?: PaymentTypeEnum | null;
  invoiceNumber?: string | null;
  notes?: string | null;
  supplierId: number;
  supplier?: Supplier;
  items: PurchaseItem[];
  createdAt: string;
  updatedAt: string;
}