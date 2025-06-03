// pages/api/vendedores/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const sellerIdQuery = req.query.id as string;

  if (!sellerIdQuery || isNaN(parseInt(sellerIdQuery))) {
    return res.status(400).json({ message: 'ID de vendedor inválido.' });
  }
  
  const id = parseInt(sellerIdQuery);

  if (req.method === 'GET') {
    try {
      const seller = await prisma.seller.findUnique({
        where: { id },
      });
      if (!seller) {
        return res.status(404).json({ message: 'Vendedor no encontrado.' });
      }
      res.status(200).json(seller);
    } catch (error: any) {
      console.error(`Error fetching seller ${id}:`, error);
      res.status(500).json({ message: `Error al obtener el vendedor: ${error.message}` });
    }
  } else if (req.method === 'PUT') {
    const { name, email, phone, isActive } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'El nombre es obligatorio.' });
    }
    if (email && (typeof email !== 'string' || email.trim() === '')) {
        // Allow empty string to be treated as null later, but not if it's just spaces
    }
    if (typeof isActive !== 'boolean' && isActive !== undefined) {
        return res.status(400).json({ message: 'El estado "isActive" debe ser un valor booleano.'});
    }

    try {
      const updatedSeller = await prisma.seller.update({
        where: { id },
        data: {
          name: name.trim(),
          email: email ? email.trim() : null, // Guardar null si el email es vacío
          phone: phone ? (phone as string).trim() : null, // Guardar null si el teléfono es vacío
          isActive: isActive !== undefined ? isActive : undefined, // Solo actualiza si se provee
        },
      });
      res.status(200).json(updatedSeller);
    } catch (error: any) {
      console.error(`Error updating seller ${id}:`, error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return res.status(404).json({ message: 'Vendedor no encontrado para actualizar.' });
        }
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[] | undefined;
          if (target?.includes('name')) {
            return res.status(409).json({ message: 'Ya existe otro vendedor con este nombre.' });
          }
          if (target?.includes('email')) {
            return res.status(409).json({ message: 'Ya existe otro vendedor con este correo electrónico.' });
          }
        }
      }
      res.status(500).json({ message: `Error al actualizar el vendedor: ${error.message}` });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Verificar si el vendedor tiene ventas asociadas
      const salesCount = await prisma.sale.count({
        where: { sellerId: id },
      });

      if (salesCount > 0) {
        return res.status(409).json({ // 409 Conflict
          message: `No se puede eliminar el vendedor porque tiene ${salesCount} venta(s) asociada(s). Considere marcarlo como inactivo en su lugar (editando el vendedor).`
        });
      }
      
      await prisma.seller.delete({
        where: { id },
      });
      res.status(204).end(); // No Content
    } catch (error: any) {
      console.error(`Error deleting seller ${id}:`, error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return res.status(404).json({ message: 'Vendedor no encontrado para eliminar.' });
      }
      res.status(500).json({ message: `Error al eliminar el vendedor: ${error.message}` });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}