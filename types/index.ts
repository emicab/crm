
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

  
  
  export interface Product {
    id: number;
    name: string;
    sku?: string | null;
    description?: string | null;
    pricePurchase: number; // Prisma usa Decimal, que se serializa a string. Convertir a number.
    priceSale: number;     // Idem.
    quantityStock: number;
    stockMinAlert?: number | null;
    brandId: number;
    categoryId: number;
    createdAt: string; // O Date, dependiendo de cómo lo manejes post-fetch
    updatedAt: string; // O Date
    brand: Brand;       // Objeto Brand anidado
    category: Category; // Objeto Category anidado
  }

  export interface Client {
    id: number;
    firstName: string;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    notes?: string | null;
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
    OTHER = 'OTHER',
  }
  
  export interface SaleItem {
    id?: number; // Opcional si es un item nuevo en el form
    productId: number;
    product?: Product; // Opcional, para mostrar info del producto
    quantity: number;
    priceAtSale: number; // Precio por unidad al momento de la venta
  }
  
  export interface Sale {
    id: number;
    discountCodeApplied: string;
    saleDate: string; // O Date
    totalAmount: number; // Prisma Decimal se convierte a string/number
    paymentType: PaymentTypeEnum;
    notes?: string | null;
    clientId?: number | null;
    client?: Client | null;
    sellerId: number;
    seller?: Seller;
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
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export interface PurchaseItem {
  id?: number;
  productId: number;
  product?: Product;
  quantity: number;
  purchasePrice: number; // Costo por unidad
}

export interface Purchase {
  id: number;
  purchaseDate: string;
  totalAmount: number;
  status: PurchaseStatusEnum;
  invoiceNumber?: string | null;
  notes?: string | null;
  supplierId: number;
  supplier?: Supplier;
  items: PurchaseItem[];
  createdAt: string;
  updatedAt: string;
}