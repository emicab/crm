// lib/priceAdjuster.ts
// Cálculo puro del ajustador masivo de precios. Separado del endpoint para
// poder testear las operaciones (porcentaje / fijo / set) y los redondeos.

export type TargetField = "sale" | "purchase" | "both";

export type AdjustType =
  | "PERCENT_INCREASE"
  | "PERCENT_DECREASE"
  | "FIXED_INCREASE"
  | "FIXED_DECREASE"
  | "SET_FIXED";

export type RoundOption = "none" | "integer" | "tens" | "hundreds";

export function applyRound(val: number, roundOption: RoundOption): number {
  if (val < 0) val = 0;
  if (roundOption === "integer") return Math.round(val);
  if (roundOption === "tens") return Math.round(val / 10) * 10;
  if (roundOption === "hundreds") return Math.round(val / 100) * 100;
  return Math.round(val * 100) / 100;
}

export function calcAdjustedPrice(
  current: number,
  adjustType: AdjustType,
  value: number,
  roundOption: RoundOption,
): number {
  let updated = current;
  if (adjustType === "PERCENT_INCREASE") {
    updated = current * (1 + value / 100);
  } else if (adjustType === "PERCENT_DECREASE") {
    updated = current * (1 - value / 100);
  } else if (adjustType === "FIXED_INCREASE") {
    updated = current + value;
  } else if (adjustType === "FIXED_DECREASE") {
    updated = current - value;
  } else if (adjustType === "SET_FIXED") {
    updated = value;
  }
  return applyRound(updated, roundOption);
}

export function validateAdjustValue(value: unknown): number {
  const num = parseFloat(String(value));
  if (isNaN(num) || num <= 0) {
    throw new Error("Ingresá un valor numérico válido mayor a 0.");
  }
  return num;
}

// ── Calculadora de precio de venta ─────────────────────────────────────
// Dos modos (a pedido): recargo sobre costo y margen sobre venta.
//   markup: venta = costo × (1 + p/100)   (ej. 100 + 50% → 150)
//   margin: venta = costo / (1 − m/100)   (ej. 100 + 50% → 200)
export type MarginMode = "markup" | "margin";

export function calcSalePrice(cost: number, pct: number, mode: MarginMode): number {
  if (!isFinite(cost) || cost <= 0) {
    throw new Error("Ingresá un precio de compra válido mayor a 0.");
  }
  if (!isFinite(pct) || pct <= 0) {
    throw new Error("Ingresá un porcentaje mayor a 0.");
  }
  if (mode === "margin") {
    if (pct >= 100) {
      throw new Error("El margen sobre venta debe ser menor a 100%.");
    }
    return applyRound(cost / (1 - pct / 100), "none");
  }
  return applyRound(cost * (1 + pct / 100), "none");
}

// Margen sobre venta resultante (%) dados costo y venta. 0 si inválido.
export function marginOnSale(cost: number, sale: number): number {
  if (!isFinite(cost) || cost <= 0 || !isFinite(sale) || sale <= 0) return 0;
  return Math.round((1 - cost / sale) * 1000) / 10;
}

// Recargo sobre costo resultante (%) dados costo y venta. 0 si inválido.
export function markupOnCost(cost: number, sale: number): number {
  if (!isFinite(cost) || cost <= 0 || !isFinite(sale) || sale <= 0) return 0;
  return Math.round((sale / cost - 1) * 1000) / 10;
}
