// pages/api/store-config/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { handleApiError } from '../../../lib/apiErrorHandler';
import { sanitizeString } from '../../../lib/sanitize';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const reqSlug = req.query.slug ? sanitizeString(String(req.query.slug).toLowerCase()) : null;
      let config = null;

      if (reqSlug) {
        config = await prisma.storeConfig.findFirst({ where: { slug: reqSlug } });
        if (!config) {
          return res.status(404).json({
            message: `La tienda "${reqSlug}" no existe.`,
            exists: false,
            isWebActive: false,
            slug: reqSlug,
          });
        }
      } else {
        config = await prisma.storeConfig.findFirst();
      }

      if (!config) {
        res.status(200).json({
          slug: reqSlug || '',
          businessName: reqSlug ? reqSlug.toUpperCase().replace(/-/g, ' ') : 'Mi Tienda',
          description: '',
          logoUrl: '',
          bannerUrl: '',
          primaryColor: '#2563eb',
          isWebActive: false,
          mpAccessToken: '',
          mpPublicKey: '',
          whatsappPhone: '',
          minStockBuffer: 0,
          allowPickup: true,
          allowDelivery: true,
          deliveryFee: '0',
          minDeliveryAmount: '0',
        });
        return;
      }

      res.status(200).json({
        ...config,
        deliveryFee: config.deliveryFee.toString(),
        minDeliveryAmount: config.minDeliveryAmount ? config.minDeliveryAmount.toString() : '0',
        mpFeePercent: (config as any).mpFeePercent ? (config as any).mpFeePercent.toString() : '0',
      });
      return;
    } catch (error) {
      handleApiError(res, error, "fetching store config");
      return;
    }
  } else if (req.method === 'PUT' || req.method === 'POST') {
    try {
      const {
        slug,
        businessName,
        description,
        logoUrl,
        bannerUrl,
        primaryColor,
        isWebActive,
        mpAccessToken,
        mpPublicKey,
        mpFeePercent,
        whatsappPhone,
        minStockBuffer,
        allowPickup,
        allowDelivery,
        deliveryFee,
        minDeliveryAmount,
      } = req.body;

      if (!slug || !slug.trim()) {
        res.status(400).json({ message: 'El subdominio/slug de la tienda es obligatorio.' });
        return;
      }

      const cleanSlug = sanitizeString(slug.trim().toLowerCase().replace(/[^a-z0-9_\-]/gi, '-'));
      const cleanBusinessName = sanitizeString(businessName || 'Mi Tienda');

      const existingConfig = await prisma.storeConfig.findFirst();

      let result;
      if (existingConfig) {
        result = await prisma.storeConfig.update({
          where: { id: existingConfig.id },
          data: {
            slug: cleanSlug,
            businessName: cleanBusinessName,
            description: description ? sanitizeString(description) : null,
            logoUrl: logoUrl || null,
            bannerUrl: bannerUrl || null,
            primaryColor: primaryColor || '#2563eb',
            isWebActive: Boolean(isWebActive),
            mpAccessToken: mpAccessToken ? mpAccessToken.trim() : null,
            mpPublicKey: mpPublicKey ? mpPublicKey.trim() : null,
            mpFeePercent: parseFloat(mpFeePercent) || 0,
            whatsappPhone: whatsappPhone ? whatsappPhone.trim() : null,
            minStockBuffer: parseFloat(minStockBuffer) || 0,
            allowPickup: allowPickup !== undefined ? Boolean(allowPickup) : true,
            allowDelivery: allowDelivery !== undefined ? Boolean(allowDelivery) : true,
            deliveryFee: parseFloat(deliveryFee) || 0,
            minDeliveryAmount: parseFloat(minDeliveryAmount) || 0,
          },
        });
      } else {
        result = await prisma.storeConfig.create({
          data: {
            slug: cleanSlug,
            businessName: cleanBusinessName,
            description: description ? sanitizeString(description) : null,
            logoUrl: logoUrl || null,
            bannerUrl: bannerUrl || null,
            primaryColor: primaryColor || '#2563eb',
            isWebActive: Boolean(isWebActive),
            mpAccessToken: mpAccessToken ? mpAccessToken.trim() : null,
            mpPublicKey: mpPublicKey ? mpPublicKey.trim() : null,
            mpFeePercent: parseFloat(mpFeePercent) || 0,
            whatsappPhone: whatsappPhone ? whatsappPhone.trim() : null,
            minStockBuffer: parseFloat(minStockBuffer) || 0,
            allowPickup: allowPickup !== undefined ? Boolean(allowPickup) : true,
            allowDelivery: allowDelivery !== undefined ? Boolean(allowDelivery) : true,
            deliveryFee: parseFloat(deliveryFee) || 0,
            minDeliveryAmount: parseFloat(minDeliveryAmount) || 0,
          },
        });
      }

      res.status(200).json({
        ...result,
        deliveryFee: result.deliveryFee.toString(),
        minDeliveryAmount: result.minDeliveryAmount ? result.minDeliveryAmount.toString() : '0',
      });
      return;
    } catch (error) {
      handleApiError(res, error, "saving store config");
      return;
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }
}
