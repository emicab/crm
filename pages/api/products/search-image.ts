import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { q } = req.query;
  if (!q || typeof q !== "string" || !q.trim()) {
    return res.status(400).json({ message: "Se requiere un término de búsqueda." });
  }

  try {
    const mlRes = await fetch(
      `https://api.mercadolibre.com/sites/MLA/search?q=${encodeURIComponent(q.trim())}&limit=5`
    );
    if (!mlRes.ok) {
      throw new Error("Error al consultar Mercado Libre API.");
    }

    const data = await mlRes.json();
    const results = data.results || [];

    if (results.length === 0) {
      return res.status(404).json({ message: "No se encontraron imágenes en Mercado Libre para ese producto." });
    }

    // Obtener la imagen principal en alta resolución
    const candidates = results.map((item: any) => {
      // Reemplazar la miniatura -I.jpg o -V.jpg por la imagen HD -O.jpg o la foto original
      let hdImageUrl = item.thumbnail || "";
      if (hdImageUrl) {
        hdImageUrl = hdImageUrl.replace(/http:/, "https:").replace(/-I\.jpg$/, "-O.jpg").replace(/-V\.jpg$/, "-O.jpg");
      }
      return {
        id: item.id,
        title: item.title,
        price: item.price,
        imageUrl: hdImageUrl,
        thumbnail: item.thumbnail,
      };
    });

    return res.status(200).json({
      query: q,
      bestMatch: candidates[0],
      candidates,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Error al buscar imágenes." });
  }
}
