import type { NextApiRequest, NextApiResponse } from "next";
import { MercadoPagoConfig, Preference } from "mercadopago";
import prisma from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  try {
    const { itemType } = req.body; // 'basico_mensual' | 'basico_unico' | 'pro_mensual'

    // Obtener Access Token de configuración o env var
    const mpTokenConfig = await prisma.setting.findUnique({
      where: { key: "mercadopago_access_token" },
    });

    const accessToken =
      mpTokenConfig?.value ||
      process.env.MERCADOPAGO_ACCESS_TOKEN ||
      "";

    let title = "ClinPOS - Plan Básico";
    let price = 9900;
    let description = "Suscripción Plan Básico ClinPOS";

    if (itemType === "basico_unico") {
      title = "ClinPOS - Plan Básico Pago Único";
      price = 40000;
      description = "Licencia Vitalicia Plan Básico ClinPOS";
    } else if (itemType === "pro_mensual") {
      title = "ClinPOS - Plan Pro Suscripción Nube";
      price = 30000;
      description = "Suscripción Plan Pro ClinPOS (Cuenta Corriente + Nube + Analíticas)";
    } else if (itemType === "basico_mensual") {
      title = "ClinPOS - Plan Básico Mensual";
      price = 9900;
      description = "Suscripción Mensual Plan Básico ClinPOS";
    }

    if (accessToken && accessToken.startsWith("APP_USR")) {
      const client = new MercadoPagoConfig({ accessToken });
      const preference = new Preference(client);

      const response = await preference.create({
        body: {
          items: [
            {
              id: itemType || "plan",
              title,
              quantity: 1,
              unit_price: price,
              currency_id: "ARS",
              description,
            },
          ],
          back_urls: {
            success: "https://clinpos.com/exito",
            failure: "https://clinpos.com/error",
            pending: "https://clinpos.com/pendiente",
          },
          auto_return: "approved",
        },
      });

      return res.status(200).json({
        success: true,
        init_point: response.init_point || response.sandbox_init_point,
      });
    }

    // Links oficiales de Mercado Pago
    const officialLinks: Record<string, string> = {
      basico_mensual: "https://mpago.la/1V3hSPq",
      basico_unico: "https://mpago.la/2gsif4Z",
      pro_mensual: "https://mpago.la/1BG9zyU",
    };

    return res.status(200).json({
      success: true,
      init_point: officialLinks[itemType] || "https://mpago.la/1BG9zyU",
    });
  } catch (error: any) {
    console.error("Error al crear preferencia de Mercado Pago:", error);
    return res.status(500).json({
      message: "Error interno al procesar el pago con Mercado Pago.",
    });
  }
}
