// pages/api/proveedores/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // Listar todos los proveedores
    try {
      const suppliers = await prisma.supplier.findMany({
        orderBy: { name: 'asc' },
      });
      res.status(200).json(suppliers);
    } catch (error: unknown) {
      console.error("Error al obtener proveedores:", error);
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
      res.status(500).json({ message: 'Error al obtener los proveedores.', error: errorMessage });
    }
  } else if (req.method === 'POST') {
    // Crear un nuevo proveedor
    const { name, contactPerson, email, phone, address, notes } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'El nombre del proveedor es obligatorio.' });
    }

    try {
      const newSupplier = await prisma.supplier.create({
        data: {
          name: name.trim(),
          contactPerson: contactPerson || null,
          email: email || null,
          phone: phone || null,
          address: address || null,
          notes: notes || null,
        },
      });
      res.status(201).json(newSupplier);
    } catch (error: unknown) {
      console.error("Error al crear proveedor:", error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
          return res.status(409).json({ message: 'Ya existe un proveedor con este nombre.' });
        }
      }
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
      res.status(500).json({ message: 'Error al crear el proveedor.', error: errorMessage });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}