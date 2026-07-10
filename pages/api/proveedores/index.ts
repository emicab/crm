// pages/api/proveedores/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';
import { handleApiError } from '../../../lib/apiErrorHandler';
import { sanitizeString } from '../../../lib/sanitize';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // Listar todos los proveedores
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string) || 50, 100) : 50;
    const skip = page ? (page - 1) * limit : undefined;

    try {
      const [suppliers, total] = await Promise.all([
        prisma.supplier.findMany({
          orderBy: { name: 'asc' },
          ...(skip !== undefined && { skip, take: limit }),
        }),
        prisma.supplier.count(),
      ]);

      if (page !== undefined) {
        res.status(200).json({
          data: suppliers,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          }
        });
      } else {
        res.status(200).json(suppliers);
      }
    } catch (error: unknown) {
      handleApiError(res, error, "fetching suppliers");
    }
  } else if (req.method === 'POST') {
    // Crear un nuevo proveedor
    let { name, contactPerson, email, phone, address, notes } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'El nombre del proveedor es obligatorio.' });
    }

    name = sanitizeString(name);
    if (contactPerson) contactPerson = sanitizeString(contactPerson);
    if (email) email = sanitizeString(email);
    if (phone) phone = sanitizeString(phone);
    if (address) address = sanitizeString(address);
    if (notes) notes = sanitizeString(notes);

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
      handleApiError(res, error, "creating supplier");
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}