import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

// Vinculación directa con PedidosYa (sin tecnicismos de claves):
// 1. Guarda Chain ID / Vendor ID / entorno en StoreConfig local.
// 2. Genera un peyaWebhookSecret aleatorio (el token que PeYA manda en
//    Authorization y que el comerciante pega en el Vendor Portal).
// 3. Valida contra clinstore (GET /api/integrations/peya/status) que las
//    credenciales globales de la plataforma reconozcan chain/vendor.
// 4. Marca peyaConnected = true.
//
// El registro del webhook en PedidosYa es MANUAL en el Vendor Portal (el spec
// no expone una API de registro): la UI muestra la URL + token para copiar.

const CLINSTORE_BASE_URL =
  (process.env.NEXT_PUBLIC_CLINSTORE_BASE_URL || "").replace(/\/$/, "") ||
  "https://clinstore.vercel.app";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { storeConfigId, chainId, vendorId, peyaEnv } = req.body;

    if (!storeConfigId || !chainId || !vendorId) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos (storeConfigId, chainId, vendorId)' });
    }

    const store = await prisma.storeConfig.findUnique({
      where: { id: Number(storeConfigId) },
    });

    if (!store) {
      return res.status(404).json({ error: 'StoreConfig no encontrado' });
    }

    const env = peyaEnv === "PRODUCTION" ? "PRODUCTION" : "SANDBOX";

    // Generar el secret del webhook si aún no existe.
    const existingSecret = store.peyaWebhookSecret?.trim();
    const webhookSecret =
      existingSecret ||
      crypto.randomBytes(24).toString("base64url");

    // Validar contra clinstore que chain/vendor son reconocidos por la
    // plataforma (usando el token global del partner, que nunca ve el POS).
    const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    const validateRes = await fetch(`${CLINSTORE_BASE_URL}/api/integrations/peya/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRole}`,
      },
      body: JSON.stringify({ chainId, vendorId, env }),
    });
    const validateBody = await validateRes.json().catch(() => ({}));

    if (!validateRes.ok) {
      console.warn("[peya connect] Validación contra clinstore falló:", validateBody?.message);
      return res.status(400).json({
        error:
          validateBody?.message || "No se pudo validar la conexión con PedidosYa.",
      });
    }

    // Persistir la configuración + secret + estado conectado.
    await prisma.storeConfig.update({
      where: { id: store.id },
      data: {
        peyaChainId: String(chainId).trim(),
        peyaVendorId: String(vendorId).trim(),
        peyaEnv: env,
        peyaEnabled: true,
        peyaWebhookSecret: webhookSecret,
        peyaConnected: true,
      },
    });

    const webhookUrl = `${CLINSTORE_BASE_URL}/api/webhooks/peya`;

    return res.status(200).json({
      success: true,
      message: 'Conexión exitosa con PedidosYa',
      webhookUrl,
      webhookSecret,
      hint: 'Copiá la URL y el token en el Vendor Portal de PedidosYa (configuración del webhook).',
    });
  } catch (error: any) {
    console.error('Error en /api/integrations/peya/connect:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno al conectar con PedidosYa',
    });
  }
}
