// pages/api/mercadopago/callback.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { code, state, error } = req.query;

  if (error || !code) {
    return res.redirect('/(main)/configuracion?error=mp_auth_failed');
  }

  const clientId = process.env.MP_CLIENT_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;
  const host = req.headers.host || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/mercadopago/callback`;

  try {
    if (!clientId || !clientSecret) {
      // Si no hay client secret configurado, registramos el code de autorización
      return res.redirect('/(main)/configuracion?mp_code=' + code);
    }

    const tokenRes = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Mercado Pago OAuth token exchange error:', tokenData);
      return res.redirect('/(main)/configuracion?error=mp_token_exchange_failed');
    }

    const accessToken = tokenData.access_token;
    const publicKey = tokenData.public_key || '';

    // Guardar la credencial en StoreConfig
    const config = await prisma.storeConfig.findFirst();
    if (config) {
      await prisma.storeConfig.update({
        where: { id: config.id },
        data: {
          mpAccessToken: accessToken,
          mpPublicKey: publicKey,
        },
      });
    } else {
      await prisma.storeConfig.create({
        data: {
          slug: 'mi-tienda',
          businessName: 'Mi Tienda',
          mpAccessToken: accessToken,
          mpPublicKey: publicKey,
          deliveryFee: new Prisma.Decimal(0),
          minDeliveryAmount: new Prisma.Decimal(0),
        },
      });
    }

    return res.redirect('/(main)/configuracion?mp_success=true');
  } catch (err: any) {
    console.error('Mercado Pago Callback Exception:', err);
    return res.redirect('/(main)/configuracion?error=mp_callback_error');
  }
}
