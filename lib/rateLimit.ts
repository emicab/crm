// lib/rateLimit.ts
import type { NextApiRequest, NextApiResponse } from "next";

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const ipMap = new Map<string, RateLimitStore>();

// Cleanup periódico cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipMap.entries()) {
    if (now > record.resetTime) {
      ipMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

/**
 * Middleware helper de Rate Limiting en memoria.
 * @param req NextApiRequest
 * @param res NextApiResponse
 * @param limit Máximo de peticiones permitidas en la ventana
 * @param windowMs Ventana de tiempo en milisegundos (por defecto 60 segundos)
 * @returns boolean `true` si la petición está permitida, `false` si fue bloqueada por exceder el límite.
 */
export function applyRateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  limit: number = 60,
  windowMs: number = 60 * 1000
): boolean {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket.remoteAddress || "127.0.0.1";
  const now = Date.now();

  let record = ipMap.get(ip);

  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    ipMap.set(ip, record);
    return true;
  }

  record.count += 1;

  if (record.count > limit) {
    res.setHeader("Retry-After", Math.ceil((record.resetTime - now) / 1000));
    res.status(429).json({
      message: "Demasiadas peticiones desde esta IP. Por favor intente más tarde.",
    });
    return false;
  }

  return true;
}
