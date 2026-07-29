import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    try {
      const { code, subtotal } = req.body;
      const cleanCode = (code || "").replace(/\s+/g, "").toUpperCase();
      const numSubtotal = parseFloat(subtotal) || 0;

      if (!cleanCode) {
        return res.status(400).json({ message: "Ingrese un código de descuento válido." });
      }

      // 1. Buscar cupón en base de datos
      const coupon = await prisma.coupon.findFirst({
        where: { code: { equals: cleanCode } },
      });

      if (coupon) {
        if (!coupon.active) {
          return res.status(400).json({ message: "El código de descuento no está activo." });
        }
        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
          return res.status(400).json({ message: "El código de descuento ha expirado." });
        }
        const minP = Number(coupon.minPurchase || 0);
        if (numSubtotal < minP) {
          return res.status(400).json({ message: `El cupón requiere una compra mínima de $${minP.toLocaleString("es-AR")}.` });
        }

        let discountAmount = 0;
        const val = Number(coupon.discountValue);
        if (coupon.discountType === "PERCENTAGE") {
          discountAmount = (numSubtotal * val) / 100;
        } else {
          discountAmount = val;
        }

        return res.status(200).json({
          valid: true,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: val,
          discountAmount: Math.min(numSubtotal, discountAmount),
          message: `¡Cupón ${coupon.code} aplicado con éxito!`,
        });
      }

      // 2. Fallback para cupones estándar de prueba
      const defaultCoupons: Record<string, { type: string; val: number; min: number; msg: string }> = {
        BIENVENIDA10: { type: "PERCENTAGE", val: 10, min: 0, msg: "10% OFF por Bienvenida 🎉" },
        BIENVENIDA: { type: "PERCENTAGE", val: 10, min: 0, msg: "10% OFF por Bienvenida 🎉" },
        DESCUENTO15: { type: "PERCENTAGE", val: 15, min: 1000, msg: "15% OFF en tu compra 🔥" },
        DESCUENTO: { type: "PERCENTAGE", val: 15, min: 1000, msg: "15% OFF en tu compra 🔥" },
        ENVIOGRATIS: { type: "FIXED_AMOUNT", val: 500, min: 0, msg: "Descuento equivalente al envío 🚚" },
        PROMO10: { type: "PERCENTAGE", val: 10, min: 0, msg: "10% OFF Promocional ✨" },
        PROMO: { type: "PERCENTAGE", val: 10, min: 0, msg: "10% OFF Promocional ✨" },
        "10OFF": { type: "PERCENTAGE", val: 10, min: 0, msg: "10% OFF Promocional ✨" },
        "15OFF": { type: "PERCENTAGE", val: 15, min: 1000, msg: "15% OFF Promocional ✨" },
      };

      if (defaultCoupons[cleanCode]) {
        const c = defaultCoupons[cleanCode];
        if (numSubtotal < c.min) {
          return res.status(400).json({ message: `El cupón requiere una compra mínima de $${c.min}.` });
        }
        const discountAmount = c.type === "PERCENTAGE" ? (numSubtotal * c.val) / 100 : c.val;
        return res.status(200).json({
          valid: true,
          code: cleanCode,
          discountType: c.type,
          discountValue: c.val,
          discountAmount: Math.min(numSubtotal, discountAmount),
          message: `¡Cupón ${cleanCode} (${c.msg}) aplicado con éxito!`,
        });
      }

      return res.status(404).json({ message: "Código de descuento inválido o no encontrado." });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Error al validar cupón." });
    }
  }

  res.setHeader("Allow", ["POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
