import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

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

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  const { file } = req.body;
  if (!file) {
    return res.status(400).json({ message: "Se requiere un archivo o base64 de imagen." });
  }

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(400).json({
      message: "Cloudinary no está configurado. Asegúrate de definir CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en el archivo .env",
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
