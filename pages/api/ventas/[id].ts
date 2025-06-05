// pages/api/ventas/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client'; // Para tipar errores

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const saleIdQuery = req.query.id as string;

  if (!saleIdQuery || isNaN(parseInt(saleIdQuery))) {
    return res.status(400).json({ message: 'ID de venta inválido.' });
  }

  const id = parseInt(saleIdQuery);

  if (req.method === 'GET') {
    // ... (tu código GET para obtener detalles de la venta como estaba) ...
    try {
      const sale = await prisma.sale.findUnique({
        where: { id: id },
        include: { /* ... tus includes ... */ },
      });
      if (!sale) { /* ... */ }
      // ... (conversión de Decimal a string como estaba) ...
      res.status(200).json(sale /* o saleForJson */);
    } catch (error: any) { /* ... */ }

  } else if (req.method === 'DELETE') {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Encontrar la venta y sus ítems para saber qué stock reponer
        const saleToDelete = await tx.sale.findUnique({
          where: { id: id },
          include: {
            items: {
              select: {
                productId: true,
                quantity: true,
              },
            },
          },
        });

        if (!saleToDelete) {
          // Hacemos que la transacción falle si la venta no se encuentra
          throw new Prisma.PrismaClientKnownRequestError('Venta no encontrada para eliminar.', {
            code: 'P2025', // Error code for "Record to delete not found"
            clientVersion: Prisma.prismaVersion.client,
          });
        }

        // 2. Reponer el stock de cada producto vendido
        for (const item of saleToDelete.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              quantityStock: {
                increment: item.quantity,
              },
            },
          });
        }

        // 3. Eliminar la venta. 
        // Los SaleItems se eliminarán en cascada debido a la configuración del schema.
        await tx.sale.delete({
          where: { id: id },
        });

        return { message: 'Venta eliminada y stock repuesto exitosamente.' };
      }); // Fin de la transacción

      res.status(200).json(result); // O res.status(204).end() si no quieres devolver mensaje

    } catch (error: any) {
      console.error(`Error deleting sale ${id}:`, error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return res.status(404).json({ message: 'Venta no encontrada para eliminar.' });
      }
      // Cualquier otro error durante la transacción (ej. un producto no encontrado al intentar reponer stock)
      // hará que la transacción falle y se lance una excepción.
      res.status(500).json({ message: `Error al eliminar la venta: ${error.message || 'Error desconocido en la transacción.'}` });
    }
  } else {
    res.setHeader('Allow', ['GET', 'DELETE']); // Añadir PUT si lo implementas después
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}