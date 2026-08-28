import { NextApiRequest, NextApiResponse } from "next";
import { resolveDbForRequest } from "@/lib/requestDb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    try {
      const { code, subtotal } = req.body;
      const cleanCode = (code || "").replace(/\s+/g, "").toUpperCase();
      const numSubtotal = parseFloat(subtotal) || 0;
      const db = await resolveDbForRequest(req);

      if (!cleanCode) {
        return res.status(400).json({ message: "Ingrese un c��digo de descuento vǭlido." });
      }

      // 1. Buscar en la tabla DiscountCode (la que administra el POS)
      const discountCode = await db.discountCode.findFirst({
        where: { code: { equals: cleanCode } },
      });

      if (discountCode) {
        if (!discountCode.isActive) {
          return res.status(400).json({ message: "El código de descuento no está activo." });
        }
        if (discountCode.validFrom && new Date(discountCode.validFrom) > new Date()) {
          return res.status(400).json({ message: "El código aún no es válido." });
        }
        if (discountCode.validUntil && new Date(discountCode.validUntil) < new Date()) {
          return res.status(400).json({ message: "El código de descuento ha expirado." });
        }
        if (discountCode.maxUses && discountCode.currentUses >= discountCode.maxUses) {
          return res.status(400).json({ message: "El código de descuento alcanzó el límite máximo de usos." });
        }

        const minP = Number(discountCode.minPurchase || 0);
        if (numSubtotal < minP) {
          return res.status(400).json({
            message: `El cupón ${discountCode.code} requiere una compra mínima / umbral de $${minP.toLocaleString("es-AR")}.`,
          });
        }

        const discType = discountCode.discountType || "PERCENTAGE";
        const val = Number(discountCode.discountValue || discountCode.discountPercent || 0);
        let discountAmount = 0;

        if (discType === "PERCENTAGE") {
          discountAmount = (numSubtotal * val) / 100;
        } else {
          discountAmount = val;
        }

        const labelMsg = discType === "PERCENTAGE" ? `${val}% OFF` : `$${val.toLocaleString("es-AR")} OFF`;

        return res.status(200).json({
          valid: true,
          code: discountCode.code,
          discountType: discType,
          discountValue: val,
          discountAmount: Math.min(numSubtotal, discountAmount),
          minPurchase: minP,
          message: `¡Código ${discountCode.code} (${labelMsg}) aplicado con éxito!`,
        });
      }

      // 2. Buscar en la tabla Coupon (para compatibilidad)
      const coupon = await db.coupon.findFirst({
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
          minPurchase: minP,
          message: `¡Cupón ${coupon.code} aplicado con éxito!`,
        });
      }

      // 3. Fallback para cupones estándar de prueba
      const defaultCoupons: Record<string, { type: string; val: number; min: number; msg: string }> = {
        BIENVENIDA10: { type: "PERCENTAGE", val: 10, min: 0, msg: "10% OFF por Bienvenida 🎉" },
        BIENVENIDA: { type: "PERCENTAGE", val: 10, min: 0, msg: "10% OFF por Bienvenida 🎉" },
        DESCUENTO15: { type: "PERCENTAGE", val: 15, min: 1000, msg: "15% OFF en tu compra 🔥" },
        DESCUENTO: { type: "PERCENTAGE", val: 15, min: 1000, msg: "15% OFF en tu compra 🔥" },
        ENVIOGRATIS: { type: "FIXED_AMOUNT", val: 500, min: 0, msg: "Descuento equivalente al envío 🚚" },
        PROMO10: { type: "PERCENTAGE", val: 10, min: 0, msg: "10% OFF Promocional ✨" },
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
          minPurchase: c.min,
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
