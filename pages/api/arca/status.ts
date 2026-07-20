import type { NextApiRequest, NextApiResponse } from 'next';
import { getArcaConfig, getAfipInstance } from '../../../lib/arcaService';
import { handleApiError } from '../../../lib/apiErrorHandler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Método ${req.method} no permitido.` });
  }

  try {
    const config = await getArcaConfig();
    if (!config.enabled) {
      return res.status(200).json({ 
        enabled: false,
        status: 'disabled',
        message: 'Facturación electrónica desactivada.' 
      });
    }

    const afip = await getAfipInstance(config);
    
    // Consultar el estado del servidor de AFIP
    const serverStatus = await afip.ElectronicBilling.getServerStatus();
    
    return res.status(200).json({
      enabled: true,
      status: 'online',
      cuit: config.cuit,
      env: config.env,
      serverStatus
    });
  } catch (error: any) {
    return res.status(500).json({
      enabled: true,
      status: 'offline',
      message: error.message || 'Error de conexión con ARCA.'
    });
  }
}
