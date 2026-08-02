// lib/syncConflict.ts
// Criterio de resolución de conflictos del sync bidireccional.
// La versión de la nube solo se aplica sobre la local si es MÁS RECIENTE.
// Evita que un pull (que ocurre antes del push) pise cambios locales recién
// hechos con datos viejos todavía presentes en Supabase.

export function isCloudNewer(
  cloudUpdatedAt: string | null | undefined,
  localUpdatedAt: Date,
): boolean {
  if (!cloudUpdatedAt) return false;
  const cloud = new Date(cloudUpdatedAt);
  if (isNaN(cloud.getTime())) return false;
  return cloud.getTime() > localUpdatedAt.getTime();
}
