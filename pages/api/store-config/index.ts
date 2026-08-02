// pages/api/store-config/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { handleApiError } from '../../../lib/apiErrorHandler';
import { sanitizeString } from '../../../lib/sanitize';
import { isMainDevice, isProDevice } from '../../../lib/branchIdentity';
import { Prisma } from '@prisma/client';

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
          customDomain: '',
          businessName: reqSlug ? reqSlug.toUpperCase().replace(/-/g, ' ') : 'Mi Tienda',
          description: '',
          logoUrl: '',
          bannerUrl: '',
          primaryColor: '#2563eb',
          isWebActive: false,
          mpAccessToken: '',
          mpPublicKey: '',
          mpFeePercent: '0',
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
        deliveryFee: config.deliveryFee ? config.deliveryFee.toString() : '0',
        minDeliveryAmount: config.minDeliveryAmount ? config.minDeliveryAmount.toString() : '0',
        mpFeePercent: config.mpFeePercent ? config.mpFeePercent.toString() : '0',
      });
      return;
    } catch (error) {
      handleApiError(res, error, "fetching store config");
      return;
    }
  } else if (req.method === 'PUT' || req.method === 'POST') {
    try {
      // La tienda web es una funcionalidad del plan Pro
      if (!(await isProDevice())) {
        res.status(403).json({ message: 'La tienda web requiere el plan Pro.' });
        return;
      }
      // La tienda web la administra SOLO la Casa Central
      if (!(await isMainDevice())) {
        res.status(403).json({ message: 'La tienda web solo se administra desde la Casa Central.' });
        return;
      }

      const {
        slug,
        customDomain,
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
      // El dominio de la plataforma solo se actualiza si viene explícito en el body
      // (se detecta automáticamente desde clinstore vía sync). undefined = no tocar.
      const cleanCustomDomain = "customDomain" in req.body
        ? (customDomain
            ? sanitizeString(
                String(customDomain)
                  .trim()
                  .replace(/^https?:\/\//i, '')
                  .replace(/\/.*$/, '')
                  .toLowerCase(),
              ) || null
            : null)
        : undefined;

      const existingConfig = await prisma.storeConfig.findFirst();

      const parsedMpFeePercent = new Prisma.Decimal(parseFloat(mpFeePercent) || 0);
      const parsedDeliveryFee = new Prisma.Decimal(parseFloat(deliveryFee) || 0);
      const parsedMinDeliveryAmount = new Prisma.Decimal(parseFloat(minDeliveryAmount) || 0);
      const parsedMinStockBuffer = parseFloat(minStockBuffer) || 0;

      let result;
      if (existingConfig) {
        result = await prisma.storeConfig.update({
          where: { id: existingConfig.id },
          data: {
            slug: cleanSlug,
            customDomain: cleanCustomDomain,
            businessName: cleanBusinessName,
            description: description ? sanitizeString(description) : null,
            logoUrl: logoUrl || null,
            bannerUrl: bannerUrl || null,
            primaryColor: primaryColor || '#2563eb',
            isWebActive: Boolean(isWebActive),
            mpAccessToken: mpAccessToken ? mpAccessToken.trim() : null,
            mpPublicKey: mpPublicKey ? mpPublicKey.trim() : null,
            mpFeePercent: parsedMpFeePercent,
            whatsappPhone: whatsappPhone ? whatsappPhone.trim() : null,
            minStockBuffer: parsedMinStockBuffer,
            allowPickup: allowPickup !== undefined ? Boolean(allowPickup) : true,
            allowDelivery: allowDelivery !== undefined ? Boolean(allowDelivery) : true,
            deliveryFee: parsedDeliveryFee,
            minDeliveryAmount: parsedMinDeliveryAmount,
          },
        });
      } else {
        result = await prisma.storeConfig.create({
          data: {
            slug: cleanSlug,
            customDomain: cleanCustomDomain,
            businessName: cleanBusinessName,
            description: description ? sanitizeString(description) : null,
            logoUrl: logoUrl || null,
            bannerUrl: bannerUrl || null,
            primaryColor: primaryColor || '#2563eb',
            isWebActive: Boolean(isWebActive),
            mpAccessToken: mpAccessToken ? mpAccessToken.trim() : null,
            mpPublicKey: mpPublicKey ? mpPublicKey.trim() : null,
            mpFeePercent: parsedMpFeePercent,
            whatsappPhone: whatsappPhone ? whatsappPhone.trim() : null,
            minStockBuffer: parsedMinStockBuffer,
            allowPickup: allowPickup !== undefined ? Boolean(allowPickup) : true,
            allowDelivery: allowDelivery !== undefined ? Boolean(allowDelivery) : true,
            deliveryFee: parsedDeliveryFee,
            minDeliveryAmount: parsedMinDeliveryAmount,
          },
        });
      }

      // Sincronizar inmediatamente con Supabase en segundo plano
      // (el sync sube StoreConfig con el tenant_id real del hash de licencia)
      try {
        const { runSupabaseSync } = await import("../../../lib/syncService");
        runSupabaseSync(true).catch((err: any) => console.error("Error auto-syncing store config to Supabase:", err));
      } catch (err) {
        console.warn("Could not auto-sync store config:", err);
      }

      res.status(200).json({
        ...result,
        deliveryFee: result.deliveryFee.toString(),
        minDeliveryAmount: result.minDeliveryAmount ? result.minDeliveryAmount.toString() : '0',
        mpFeePercent: result.mpFeePercent ? result.mpFeePercent.toString() : '0',
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
