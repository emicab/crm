import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { productIds, supplierId } = req.body;

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({ message: 'productIds debe ser un array no vacío.' });
  }

  try {
    if (supplierId) {
      const supplierExists = await prisma.supplier.findUnique({ where: { id: parseInt(supplierId) } });
      if (!supplierExists) {
        return res.status(400).json({ message: 'Proveedor no encontrado.' });
      }
    }

    await prisma.product.updateMany({
      where: { id: { in: productIds.map((id: any) => parseInt(id)) } },
      data: { supplierId: supplierId ? parseInt(supplierId) : null },
    });

    res.status(200).json({ message: `Proveedor actualizado en ${productIds.length} producto(s).` });
  } catch (error) {
    console.error('Error updating batch supplier:', error);
    res.status(500).json({ message: 'Error al actualizar proveedor.' });
  }
}
