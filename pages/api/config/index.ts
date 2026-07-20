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
  // Configuración de módulos y perfiles de negocio (v2.0.0)
  module_clientes: 'true',
  module_vendedores: 'true',
  module_compras: 'true',
  module_gastos: 'true',
  module_combos_promociones: 'true',
  module_venta_fraccionada: 'true',
  module_analiticas: 'true',
  module_cuenta_corriente: 'false',
  module_roles: 'false',
  business_profile: 'unset',
  storage_mode: 'local',
  supabase_url: '',
  supabase_anon_key: '',
  supabase_last_sync: '',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { loadEnv } = require("../../../lib/envLoader");
      loadEnv();
      const settings = await prisma.setting.findMany();
      const result: Record<string, string> = { ...DEFAULT_SETTINGS };
      for (const s of settings) {
        result[s.key] = s.value;
      }
      if (!result.supabase_url && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        result.supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      }
      if (!result.supabase_anon_key) {
        result.supabase_anon_key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
      }
      res.status(200).json(result);
    } catch (error) {
      handleApiError(res, error, 'fetching settings');
    }
  } else if (req.method === 'PUT') {
    try {
      const entries = req.body as Record<string, string>;

      // Validación de integridad: Bloquear desactivación de compras si hay órdenes pendientes/pedidas
      if (entries.module_compras === 'false') {
        const currentSetting = await prisma.setting.findUnique({ where: { key: 'module_compras' } });
        if (!currentSetting || currentSetting.value === 'true') {
          const pendingCount = await prisma.purchase.count({
            where: {
              status: { in: ['PENDING', 'ORDERED'] }
            }
          });
          if (pendingCount > 0) {
            return res.status(400).json({
              message: `No se puede desactivar el módulo de Compras y Proveedores porque existen ${pendingCount} órdenes de compra pendientes o pedidas. Debes recibirlas o cancelarlas primero.`
            });
          }
        }
      }

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
