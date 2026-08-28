// lib/featureFlags.ts
// Banderas de funcionalidades que aún no tienen credenciales/integraciones
// listas para producción. Por defecto están OCULTAS; se habilitan seteando la
// variable de entorno correspondiente en ".env" (o en el entorno de build):
//   NEXT_PUBLIC_ENABLE_PEYA=true
//   NEXT_PUBLIC_ENABLE_RAPPI=true
//
// `NEXT_PUBLIC_*` queda inlineado en el bundle del cliente en tiempo de build.
export const FEATURE_PEYA = process.env.NEXT_PUBLIC_ENABLE_PEYA === "true";
export const FEATURE_RAPPI = process.env.NEXT_PUBLIC_ENABLE_RAPPI === "true";
