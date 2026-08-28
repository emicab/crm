// lib/integrations/webhookAuth.ts
// Validación de token estático de webhooks (WebhookKeyAuth) con comparación
// timing-safe, igual que clinstore/lib/quote.ts. El token llega en el header
// Authorization como "Bearer <token>".
import { timingSafeEqual } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// Devuelve true si el request trae el token correcto. Si `secret` es null/"" y
// `requireSecret` es true, responde 401 y devuelve false (integración habilitada
// sin token configurado = rechazar).
export function validateWebhookAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  secret: string | null | undefined,
  requireSecret: boolean
): boolean {
  const token = (req.headers.authorization || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  if (!secret || secret.trim() === "") {
    if (requireSecret) {
      res.status(401).json({ message: "Token de webhook no configurado" });
      return false;
    }
    console.warn("[webhook-auth] Token de webhook no configurado: se acepta el request sin validar.");
    return true;
  }

  if (!safeEqual(token, secret.trim())) {
    res.status(401).json({ message: "Token de webhook inválido" });
    return false;
  }

  return true;
}
