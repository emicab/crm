// lib/aiSchema.ts
// WP4: genera dinámicamente el esquema de la base de datos para el prompt de
// ClinIA, leyendo prisma/schema.prisma. Así el "mapa" que usa la IA evoluciona
// automáticamente con las migraciones (sin esquema hardcodeado desactualizado).
import fs from "fs";
import path from "path";

// Fallback: el esquema hardcodeado histórico (si no se puede leer el archivo).
const FALLBACK_SCHEMA = `Sale: id, saleDate(ms), totalAmount, paymentType, notes, clientId, sellerId, cashRegisterId, status ('COMPLETED'|'PENDING'|'CANCELLED'), onAccount, discountCodeApplied, promotionsApplied, creditCardPromotionId, createdAt(ms), updatedAt(ms)
SaleItem: id, saleId, productId, quantity, priceAtSale, purchasePriceAtSale
Product: id, name, sku, description, pricePurchase, priceSale, quantityStock, stockMinAlert, unitType, brandId, categoryId, supplierId, createdAt(ms), updatedAt(ms)
Category: id, name, logoUrl, createdAt(ms), updatedAt(ms)
Brand: id, name, logoUrl, createdAt(ms), updatedAt(ms)
Supplier: id, name, contactPerson, email, phone, address, notes, createdAt(ms), updatedAt(ms)
Client: id, firstName, lastName, email, phone, address, notes, cuit, businessName, createdAt(ms), updatedAt(ms)
Seller: id, name, email, phone, isActive, createdAt(ms), updatedAt(ms)
AccountBalance: id, clientId, balance, updatedAt(ms)
AccountMovement: id, accountBalanceId, type, amount, description, saleId, createdAt(ms)
Purchase: id, supplierId, totalAmount, status ('PENDING'|'ORDERED'|'RECEIVED'|'CANCELLED'), paymentType, invoiceNumber, notes, purchaseDate(ms), createdAt(ms), updatedAt(ms)
PurchaseItem: id, purchaseId, productId, quantity, quantityReceived, purchasePrice
Expense: id, description, amount, category, paymentType, notes, expenseDate(ms), createdAt(ms), updatedAt(ms)
CashRegister: id, openDate(ms), closeDate(ms), initialBalance, expectedBalance, actualBalance, difference, status ('OPEN'|'CLOSED'), notes, sellerId, createdAt(ms), updatedAt(ms)
CashMovement: id, cashRegisterId, type, paymentType, sourceId, amount, description, createdAt(ms)
Consignment: id, clientId, status ('DELIVERED'|'SETTLED'|'CANCELLED'), notes, createdAt(ms), updatedAt(ms)
ConsignmentItem: id, consignmentId, productId, quantityGiven, quantitySold, quantityReturned, priceAtGiven
DiscountCode: id, code, discountPercent, validFrom(ms), validUntil(ms), maxUses, currentUses, isActive, createdAt(ms), updatedAt(ms)
Promotion: id, name, description, type, status, discountType, discountValue, minQuantity, maxDiscountQty, priority, startDate(ms), endDate(ms), createdAt(ms), updatedAt(ms)
Combo: id, name, description, price, active, createdAt(ms), updatedAt(ms)
ComboItem: id, comboId, productId, quantity, customPrice
CreditCardPromotion: id, bank, installments, startDate(ms), endDate(ms), notes, active, createdAt(ms), updatedAt(ms)`;

// Tipos escalares (columnas reales de SQL). Lo demás es relación o enum.
const SCALAR_TYPES = new Set([
  "Int",
  "Float",
  "String",
  "Boolean",
  "DateTime",
  "Decimal",
  "BigInt",
]);

let cached: string | null | undefined;

// La app Tauri bundlea prisma/schema.prisma como recurso. En dev vive en
// ./prisma/schema.prisma; en producción el server standalone puede arrancar
// con cwd distinto o con RESOURCE_DIR apuntando a la carpeta de recursos.
function resolveSchemaPath(): string | null {
  const candidates = [
    path.join(process.cwd(), "prisma", "schema.prisma"),
    process.env.RESOURCE_DIR
      ? path.join(process.env.RESOURCE_DIR, "schema.prisma")
      : null,
    process.env.APP_RESOURCE_DIR
      ? path.join(process.env.APP_RESOURCE_DIR, "schema.prisma")
      : null,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // seguir probando
    }
  }
  return null;
}

function parsePrismaSchema(source: string): string | null {
  const lines = source.split(/\r?\n/);
  const modelNames = new Set<string>();
  const enums = new Map<string, string[]>();
  const models: { name: string; fields: { name: string; type: string; optional: boolean; isRelation: boolean; enumValues?: string[] }[] }[] = [];

  // Pasada 1: nombres de modelos y enums.
  for (const raw of lines) {
    const line = raw.trim();
    let m = line.match(/^model\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{$/);
    if (m) {
      modelNames.add(m[1]);
      models.push({ name: m[1], fields: [] });
      continue;
    }
    m = line.match(/^enum\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{$/);
    if (m) enums.set(m[1], []);
  }

  // Pasada 2: campos de cada modelo y valores de enums.
  let currentModel: string | null = null;
  let currentEnum: string | null = null;
  for (const raw of lines) {
    const line = raw.trim();

    if (line.startsWith("model ")) {
      currentModel = line.match(/^model\s+([A-Za-z_][A-Za-z0-9_]*)/)?.[1] ?? null;
      currentEnum = null;
      continue;
    }
    if (line.startsWith("enum ")) {
      currentEnum = line.match(/^enum\s+([A-Za-z_][A-Za-z0-9_]*)/)?.[1] ?? null;
      currentModel = null;
      continue;
    }
    if (line === "}") {
      currentModel = null;
      currentEnum = null;
      continue;
    }

    if (currentEnum) {
      const v = line.match(/^([A-Za-z_][A-Za-z0-9_]*)/);
      if (v) {
        const list = enums.get(currentEnum) || [];
        list.push(v[1]);
        enums.set(currentEnum, list);
      }
      continue;
    }

    if (currentModel && !line.startsWith("//") && line) {
      const f = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)(\[\])?(\?)?/);
      if (!f) continue;
      const fieldName = f[1];
      const type = f[2];
      const isArray = !!f[3];
      const optional = !!f[4];
      const isRelation = isArray || modelNames.has(type) || line.includes("@relation");

      const model = models.find((m) => m.name === currentModel);
      if (!model) continue;

      // Enums: anotar valores posibles (estilo del prompt histórico).
      let enumValues: string[] | undefined;
      if (enums.has(type) && !isRelation) {
        enumValues = enums.get(type);
      }

      model.fields.push({
        name: fieldName,
        type,
        optional,
        isRelation,
        enumValues,
      });
    }
  }

  // Pasada 3: serializar en el formato compacto histórico.
  const linesOut: string[] = [];
  for (const model of models) {
    const parts: string[] = [];
    for (const field of model.fields) {
      if (field.isRelation) continue; // las relaciones no son columnas SQL
      let label = field.name;
      if (field.type === "DateTime") label += "(ms)";
      if (field.enumValues && field.enumValues.length > 0) {
        label += ` ('${field.enumValues.join("'|'")}')`;
      }
      parts.push(label);
    }
    if (parts.length > 0) linesOut.push(`${model.name}: ${parts.join(", ")}`);
  }

  return linesOut.length > 0 ? linesOut.join("\n") : null;
}

// Devuelve el esquema compacto (cacheado) o el fallback histórico.
export async function buildAISchema(): Promise<string> {
  if (cached) return cached;

  try {
    const schemaPath = resolveSchemaPath();
    if (schemaPath) {
      const source = fs.readFileSync(schemaPath, "utf8");
      const parsed = parsePrismaSchema(source);
      if (parsed) {
        cached = parsed;
        console.log("[ClinIA] Esquema generado dinámicamente desde schema.prisma");
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[ClinIA] No se pudo generar el esquema desde schema.prisma:", err);
  }

  cached = FALLBACK_SCHEMA;
  return FALLBACK_SCHEMA;
}
