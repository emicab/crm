// pages/api/mercadopago/connect.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Método ${req.method} no permitido.` });
  }

  const clientId = process.env.MP_CLIENT_ID || req.query.client_id as string;
  const host = req.headers.host || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/mercadopago/callback`;

  if (!clientId) {
    // Si no está configurado MP_CLIENT_ID en variables de entorno, redirigimos a la página de credenciales oficial de MP
    return res.redirect('https://www.mercadopago.com.ar/developers/panel/credentials');
  }

  const authUrl = `https://auth.mercadopago.com.ar/authorization?client_id=${clientId}&response_type=code&platform_id=mp&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return res.redirect(authUrl);
}
