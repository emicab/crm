// pages/api/ventas/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client'; // Para tipar errores de Prisma

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
    try {
      const sale = await prisma.sale.findUnique({
        where: { id: id },
        include: {
          client: true, // Incluir datos del cliente
          seller: true, // Incluir datos del vendedor
          items: {      // Incluir los ítems de la venta
            include: {
              product: true, // Incluir datos del producto de cada ítem
            },
            orderBy: {
                id: 'asc' // Ordenar items por ID o nombre de producto
            }
          },
        },
      });

      if (!sale) {
        return res.status(404).json({ message: 'Venta no encontrada.' });
      }

      // Convertir Decimal a string para una serialización JSON segura
      const saleForJson = {
        ...sale,
        totalAmount: sale.totalAmount.toString(),
        items: sale.items.map(item => ({
          ...item,
          priceAtSale: item.priceAtSale.toString(),
          product: item.product ? {
            ...item.product,
            pricePurchase: item.product.pricePurchase?.toString() || null,
            priceSale: item.product.priceSale.toString(),
          } : null
        }))
      };

      res.status(200).json(saleForJson);
    } catch (error: any) {
      console.error(`Error fetching sale ${id}:`, error);
      res.status(500).json({ message: `Error al obtener los detalles de la venta: ${error.message}` });
    }
  } else if (req.method === 'PUT') {
    // La lógica para actualizar una venta es compleja (requiere reajustar stock, totales, etc.)
    // y la dejamos pendiente.
    res.status(501).json({ message: 'Funcionalidad de actualizar venta no implementada.' });

  } else if (req.method === 'DELETE') {
    try {
      // Usamos una transacción para asegurar que la reposición de stock y la eliminación
      // de la venta ocurran juntas, o ninguna de las dos.
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
          // Si la venta no se encuentra, la transacción fallará.
          throw new Prisma.PrismaClientKnownRequestError('Venta no encontrada para eliminar.', {
            code: 'P2025', // Código de Prisma para "Registro no encontrado"
            clientVersion: Prisma.prismaVersion.client,
          });
        }

        // 2. Reponer (incrementar) el stock de cada producto vendido
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

        // 3. Eliminar la venta. Los SaleItems asociados se eliminarán en cascada
        // si la relación en el schema.prisma tiene `onDelete: Cascade`.
        await tx.sale.delete({
          where: { id: id },
        });

        return { message: 'Venta eliminada y stock repuesto exitosamente.' };
      });

      res.status(200).json(result);

    } catch (error: any) {
      console.error(`Error deleting sale ${id}:`, error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return res.status(404).json({ message: 'Venta no encontrada para eliminar.' });
      }
      res.status(500).json({ message: `Error al eliminar la venta: ${error.message || 'Error desconocido en la transacción.'}` });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}