import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { handleApiError } from '../../../lib/apiErrorHandler';
import { encryptText, decryptText } from '../../../lib/encryption';
import os from 'os';

const OFFICIAL_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://htroigemnwqiugieodmv.supabase.co';
const OFFICIAL_SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

const getHardwareId = () => {
  if (process.env.HARDWARE_ID) return process.env.HARDWARE_ID;
  const hostname = typeof os.hostname === 'function' ? os.hostname() : 'LOCAL-POS';
  return `POS-${hostname.toUpperCase().replace(/[^A-Z0-9_\-]/g, '_')}`;
};

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
  arcaEnv: 'produccion',
  arcaCert: '',
  arcaKey: '',
  arcaIibb: '',
  arcaBusinessStartDate: '',
  arcaIvaCondition: 'RI',
  app_plan: 'basico',
  plan_type: 'basico',
  unlocked_plan_pro: 'false',
  storage_mode: 'safe',
  business_profile: 'general',
  license_key: '',
  license_activated_at: '',
  hardware_id: getHardwareId(),
  supabase_url: OFFICIAL_SUPABASE_URL,
  supabase_anon_key: OFFICIAL_SUPABASE_KEY,
  supabase_last_sync: '',
};

const ENCRYPTED_FIELDS = ['arcaCert', 'arcaKey'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const settings = await prisma.setting.findMany();
      const result: Record<string, string> = { ...DEFAULT_SETTINGS };
      for (const s of settings) {
        if (ENCRYPTED_FIELDS.includes(s.key)) {
          result[s.key] = decryptText(s.value);
        } else {
          result[s.key] = s.value;
        }
      }

      // Garantizar que siempre haya credenciales y hardware_id válidos
      if (!result.hardware_id) result.hardware_id = getHardwareId();
      if (!result.supabase_url) result.supabase_url = OFFICIAL_SUPABASE_URL;
      if (!result.supabase_anon_key) result.supabase_anon_key = OFFICIAL_SUPABASE_KEY;

      res.status(200).json(result);
    } catch (error) {
      handleApiError(res, error, 'fetching settings');
    }
  } else if (req.method === 'PUT') {
    try {
      const entries = req.body as Record<string, string>;
      for (const [key, rawValue] of Object.entries(entries)) {
        let storedValue = String(rawValue);
        if (ENCRYPTED_FIELDS.includes(key) && storedValue.trim() !== '') {
          storedValue = encryptText(storedValue);
        }

        await prisma.setting.upsert({
          where: { key },
          update: { value: storedValue },
          create: { key, value: storedValue },
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
