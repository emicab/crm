import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const notes = await prisma.savedNote.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json(notes);
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: "Error al obtener las notas" });
    }
  } else if (req.method === 'POST') {
    try {
      const { title, description, content } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: "Faltan campos obligatorios" });
      }

      const note = await prisma.savedNote.create({
        data: {
          title,
          description: description || null,
          content
        }
      });
      return res.status(201).json(note);
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: "Error al guardar la nota" });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: "Falta el ID de la nota" });

      await prisma.savedNote.delete({
        where: { id: String(id) }
      });
      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: "Error al eliminar la nota" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
