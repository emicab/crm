import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { sessionId } = req.query;

      if (sessionId) {
        // Obtener una sesión específica con sus mensajes
        const session = await prisma.chatSession.findUnique({
          where: { id: String(sessionId) },
          include: {
            messages: {
              orderBy: { createdAt: 'asc' }
            }
          }
        });
        if (!session) return res.status(404).json({ error: "Sesión no encontrada" });
        return res.status(200).json(session);
      }

      // Obtener todas las sesiones (solo metadata)
      const sessions = await prisma.chatSession.findMany({
        orderBy: { updatedAt: 'desc' }
      });
      return res.status(200).json(sessions);
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: "Error al obtener sesiones" });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { sessionId } = req.query;
      if (!sessionId) return res.status(400).json({ error: "Falta sessionId" });

      await prisma.chatSession.delete({
        where: { id: String(sessionId) }
      });
      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: "Error al eliminar la sesión" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
