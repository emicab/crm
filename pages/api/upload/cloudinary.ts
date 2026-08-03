import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import prisma from "../../../lib/prisma";
import { decryptText } from "../../../lib/encryption";
import { loadEnv } from "../../../lib/envLoader";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { file } = req.body;
  if (!file) {
    return res.status(400).json({ message: "Se requiere un archivo o base64 de imagen." });
  }

  // En producción las credenciales viajan empaquetadas en app_standalone/cloudinary.env
  // (generado por scripts/write-cloudinary-env.js durante el build).
  loadEnv();

  // Preferir variables de entorno (dev) y, si faltan, leer credenciales cifradas de la DB local.
  const setting = await prisma.setting.findMany({ where: { key: { in: ["cloudinaryCloudName", "cloudinaryApiKey", "cloudinaryApiSecret"] } } });
  const settingMap: Record<string, string> = {};
  for (const s of setting) settingMap[s.key] = s.value;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || settingMap.cloudinaryCloudName?.trim() || "";
  const apiKey = process.env.CLOUDINARY_API_KEY || decryptText(settingMap.cloudinaryApiKey || "").trim() || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || decryptText(settingMap.cloudinaryApiSecret || "").trim() || "";

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(400).json({
      message: "Cloudinary no está configurado. Las credenciales deben estar definidas en el archivo .env o empaquetadas en app_standalone/cloudinary.env.",
      configured: false,
    });
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = "clinpos_products";

    // Generar firma SHA-1 requerida por Cloudinary
    const strToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(strToSign).digest("hex");

    const formData = new URLSearchParams();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp);
    formData.append("folder", folder);
    formData.append("signature", signature);

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const data = await uploadRes.json();

    if (!uploadRes.ok) {
      throw new Error(data.error?.message || "Error al subir la imagen a Cloudinary.");
    }

    return res.status(200).json({
      url: data.secure_url || data.url,
      public_id: data.public_id,
      format: data.format,
      bytes: data.bytes,
    });
  } catch (error: any) {
    console.error("Cloudinary Upload Error:", error);
    return res.status(500).json({ message: error.message || "Error en el servidor de carga a Cloudinary." });
  }
}
