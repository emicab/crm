import type { NextApiRequest, NextApiResponse } from 'next';
import { createElectronicInvoice } from '../../../lib/arcaService';
import { handleApiError } from '../../../lib/apiErrorHandler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Método ${req.method} no permitido.` });
  }

  try {
    const { saleId, invoiceType, clientCuit, clientName } = req.body;

    if (!saleId) {
      return res.status(400).json({ message: 'El ID de la venta (saleId) es requerido.' });
    }

    if (!invoiceType || !['A', 'B', 'C', 'NCA', 'NCB', 'NCC'].includes(invoiceType)) {
      return res.status(400).json({ message: 'El tipo de factura (invoiceType) no es válido.' });
    }

    const invoice = await createElectronicInvoice(
      Number(saleId),
      invoiceType,
      clientCuit,
      clientName
    );

    return res.status(200).json({
      message: 'Factura generada exitosamente.',
      invoice
    });
  } catch (error: any) {
    console.error('Error al generar factura electrónica:', error);
    return res.status(500).json({
      message: error.message || 'Error interno al comunicarse con ARCA.'
    });
  }
}
