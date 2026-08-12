// Helpers puros de unidades para el Recetario (seguros para el cliente).

export type RecipeUnitType = "UNIT" | "WEIGHT" | "VOLUME";

export const RECIPE_UNIT_TYPES: RecipeUnitType[] = ["UNIT", "WEIGHT", "VOLUME"];

// Multiplicador para trabajar en la unidad mínima (g / ml / unidad) y evitar
// errores de punto flotante al hacer floor (ej: 0.9 / 0.3 = 2.9999...).
export function unitScale(unitType: string | null | undefined): number {
  if (unitType === "WEIGHT" || unitType === "VOLUME") return 1000;
  return 1;
}

// Convertir una cantidad en unidad canónica (kg/L/u) a la unidad de entrada amigable (g/ml/u).
export function toDisplayQty(
  quantity: number,
  unitType: string | null | undefined,
): number {
  if (unitType === "WEIGHT" || unitType === "VOLUME") return quantity * 1000;
  return quantity;
}

// Convertir una cantidad ingresada en unidad amigable (g/ml/u) a la unidad canónica (kg/L/u).
export function toCanonicalQty(
  quantity: number,
  unitType: string | null | undefined,
): number {
  if (unitType === "WEIGHT" || unitType === "VOLUME") return quantity / 1000;
  return quantity;
}

export function unitLabel(unitType: string | null | undefined): string {
  if (unitType === "WEIGHT") return "kg";
  if (unitType === "VOLUME") return "L";
  return "u";
}

export function displayUnitLabel(unitType: string | null | undefined): string {
  if (unitType === "WEIGHT") return "g";
  if (unitType === "VOLUME") return "ml";
  return "u";
}

export function formatQuantity(
  quantity: number,
  unitType: string | null | undefined,
): string {
  const display = toDisplayQty(quantity, unitType);
  const rounded = Math.round(display * 1000) / 1000;
  return `${rounded} ${displayUnitLabel(unitType)}`;
}

export interface RecipeLimiterInfo {
  name: string;
  availableDisplay: string;
}

// Tooltip para la UI: aclara que el stock derivado de un elaborado es "por tipo"
// y NO se suma entre variantes que comparten ingredientes (ej. 2A + 2B puede
// superar la harina disponible aunque cada una muestre 2).
export function recipeAvailabilityTooltip(
  isRecipe: boolean | undefined,
  recipeAvailability?: { available: number; limiting: RecipeLimiterInfo[] } | null,
): string | undefined {
  if (!isRecipe) return undefined;
  const limiting = recipeAvailability?.limiting || [];
  const base =
    "Disponible por tipo. El número no se suma entre variantes que comparten ingredientes.";
  if (limiting.length === 0) return base;
  return `${base} Limitado por: ${limiting.map((l) => `${l.name}: ${l.availableDisplay}`).join(", ")}.`;
}
