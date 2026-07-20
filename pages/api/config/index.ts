import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { handleApiError } from '../../../lib/apiErrorHandler';

const DEFAULT_SETTINGS: Record<string, string> = {
  taxRate: '21',
  businessName: '',
  businessCuit: '',
  businessAddress: '',
  businessPhone: '',
  receiptFooter: 'Gracias por su compra',
  defaultPaymentType: 'CASH',
  nextReceiptNumber: '1',
  discount_CASH: '0',
  discount_TRANSFER: '10',
  discount_CARD: '0',
  discount_OTHER: '0',
  arcaEnabled: 'false',
  arcaCuit: '',
  arcaPointOfSale: '1',
  arcaEnv: 'homologacion',
  arcaCert: '',
  arcaKey: '',
  arcaIibb: '',
  arcaBusinessStartDate: '',
  arcaIvaCondition: 'RI',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const settings = await prisma.setting.findMany();
      const result: Record<string, string> = { ...DEFAULT_SETTINGS };
      for (const s of settings) {
        result[s.key] = s.value;
      }
      res.status(200).json(result);
    } catch (error) {
      handleApiError(res, error, 'fetching settings');
    }
  } else if (req.method === 'PUT') {
    try {
      const entries = req.body as Record<string, string>;
      for (const [key, value] of Object.entries(entries)) {
        if (!(key in DEFAULT_SETTINGS)) continue;
        await prisma.setting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        });
      }
      res.status(200).json({ message: 'Configuración guardada.' });
    } catch (error) {
      handleApiError(res, error, 'saving settings');
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).json({ message: `Método ${req.method} no permitido.` });
  }
}
