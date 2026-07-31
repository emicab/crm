import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Método ${req.method} no permitido.` });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
  const publicKey = process.env.MERCADOPAGO_PUBLIC_KEY || '';

  if (!accessToken) {
    return res.status(404).json({ message: 'No hay credenciales MP en variables de entorno.' });
  }

  res.status(200).json({
    accessToken: accessToken.startsWith('APP_USR') || accessToken.startsWith('TEST') ? accessToken : null,
    publicKey,
  });
}
