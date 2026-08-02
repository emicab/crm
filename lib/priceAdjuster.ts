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
