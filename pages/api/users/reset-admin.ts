import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import crypto from 'crypto';
import { handleApiError } from '../../../lib/apiErrorHandler';

function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    let admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!admin) {
      admin = await prisma.user.create({
        data: {
          name: 'Administrador',
          role: 'ADMIN',
          pinHash: hashPin('1234'),
        },
      });
    } else {
      await prisma.user.update({
        where: { id: admin.id },
        data: {
          pinHash: hashPin('1234'),
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'PIN de Administrador restablecido a 1234 con éxito.',
    });
  } catch (error) {
    return handleApiError(res, error, 'resetting admin PIN');
  }
}
