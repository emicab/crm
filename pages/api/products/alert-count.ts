import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const result: any = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM Product WHERE stockMinAlert IS NOT NULL AND quantityStock < stockMinAlert`
    );
    const count = Number(result[0]?.count || 0);

    res.status(200).json({ count });
  } catch (error) {
    console.error('Error counting stock alerts:', error);
    res.status(500).json({ message: 'Error al contar alertas de stock' });
  }
}
