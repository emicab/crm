import type { NextApiResponse } from 'next';
import { Prisma } from '@prisma/client';

export function handleApiError(res: NextApiResponse, error: unknown, context: string) {
  console.error(`[API Error] ${context}:`, error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Registro no encontrado.' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Ya existe un registro con estos datos.' });
    }
  }

  // En producción no debemos filtrar detalles internos
  res.status(500).json({ message: 'Error interno del servidor.' });
}
