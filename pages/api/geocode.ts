// pages/api/geocode.ts
// Geocodificación de direcciones vía Nominatim (OpenStreetMap) con proxy.
// Devuelve lat/lng del primer resultado. Uso en config (ubicación del local).
import type { NextApiRequest, NextApiResponse } from 'next';
import { handleApiError } from '../../lib/apiErrorHandler';

let lastRequestAt = 0;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const rawQ = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
  const q = String(rawQ || '').trim();
  if (!q) {
    res.status(400).json({ message: 'Falta el parámetro q (dirección).' });
    return;
  }

  try {
    // Respetar el límite de 1 req/s de Nominatim
    const now = Date.now();
    const wait = Math.max(0, 1100 - (now - lastRequestAt));
    if (wait > 0) {
      await new Promise((r) => setTimeout(r, wait));
    }
    lastRequestAt = Date.now();

    const params = new URLSearchParams({
      q,
      format: 'json',
      limit: '1',
      addressdetails: '1',
      countrycodes: 'ar',
    });
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'ClinPOS/1.0 (contacto: soporte@clinstore.app)',
          Accept: 'application/json',
        },
      },
    );

    if (response.status === 429) {
      res.status(429).json({ message: 'Demasiadas consultas. Intentá de nuevo en unos segundos.' });
      return;
    }
    if (!response.ok) {
      throw new Error(`Nominatim respondió ${response.status}`);
    }

    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      res.status(404).json({ message: 'No se encontró la dirección.' });
      return;
    }
    const first = results[0];
    res.status(200).json({
      lat: parseFloat(first.lat),
      lng: parseFloat(first.lon),
      display_name: first.display_name || null,
    });
  } catch (error) {
    handleApiError(res, error, 'geocoding address');
  }
}
