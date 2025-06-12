// pages/api/proveedores/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supplierIdQuery = req.query.id as string;

  if (!supplierIdQuery || isNaN(parseInt(supplierIdQuery))) {
    return res.status(400).json({ message: 'ID de proveedor inválido.' });
  }
  
  const id = parseInt(supplierIdQuery);

  if (req.method === 'GET') {
    // Obtener un proveedor por su ID
    try {
      const supplier = await prisma.supplier.findUnique({
        where: { id },
      });
      if (!supplier) {
        return res.status(404).json({ message: 'Proveedor no encontrado.' });
      }
      res.status(200).json(supplier);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido.';
      res.status(500).json({ message: `Error al obtener el proveedor: ${errorMessage}` });
    }
  } else if (req.method === 'PUT') {
    // Actualizar un proveedor
    const { name, contactPerson, email, phone, address, notes } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'El nombre del proveedor es obligatorio.' });
    }
    
    try {
      const updatedSupplier = await prisma.supplier.update({
        where: { id },
        data: {
          name: name.trim(),
          contactPerson,
          email,
          phone,
          address,
          notes,
        },
      });
      res.status(200).json(updatedSupplier);
    } catch (error: unknown) {
      console.error(`Error al actualizar proveedor ${id}:`, error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return res.status(404).json({ message: 'Proveedor no encontrado para actualizar.' });
        }
        if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
          return res.status(409).json({ message: 'Ya existe otro proveedor con este nombre.' });
        }
      }
      const errorMessage = error instanceof Error ? error.message : 'Error inesperado.';
      res.status(500).json({ message: `Error al actualizar el proveedor: ${errorMessage}` });
    }
  } else if (req.method === 'DELETE') {
    // Eliminar un proveedor
    try {
      // Importante: Verificar si el proveedor tiene compras asociadas antes de eliminarlo.
      const purchaseCount = await prisma.purchase.count({
        where: { supplierId: id },
      });

      if (purchaseCount > 0) {
        return res.status(409).json({
          message: `No se puede eliminar el proveedor porque tiene ${purchaseCount} compra(s) asociada(s).`
        });
      }

      await prisma.supplier.delete({
        where: { id },
      });
      res.status(204).end(); // No Content, éxito en la eliminación

    } catch (error: unknown) {
      console.error(`Error al eliminar proveedor ${id}:`, error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return res.status(404).json({ message: 'Proveedor no encontrado para eliminar.' });
      }
      const errorMessage = error instanceof Error ? error.message : 'Error inesperado.';
      res.status(500).json({ message: `Error al eliminar el proveedor: ${errorMessage}` });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}