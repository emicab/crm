// pages/api/clients/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';
import { handleApiError } from '../../../lib/apiErrorHandler';
import { sanitizeString } from '../../../lib/sanitize';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const clientIdQuery = req.query.id as string;

  if (!clientIdQuery || isNaN(parseInt(clientIdQuery))) {
    return res.status(400).json({ message: 'ID de cliente inválido.' });
  }
  
  const id = parseInt(clientIdQuery);

  if (req.method === 'GET') {
    try {
      const client = await prisma.client.findUnique({
        where: { id },
      });
      if (!client) {
        return res.status(404).json({ message: 'Cliente no encontrado.' });
      }
      res.status(200).json(client);
    } catch (error: any) {
      handleApiError(res, error, `fetching client ${id}`);
    }
  } else if (req.method === 'PUT') {
    let { firstName, lastName, email, phone, address, notes } = req.body;

    if (!firstName || typeof firstName !== 'string' || firstName.trim() === '') {
      return res.status(400).json({ message: 'El nombre es obligatorio.' });
    }

    firstName = sanitizeString(firstName);
    if (lastName) lastName = sanitizeString(lastName);
    if (email) email = sanitizeString(email);
    if (phone) phone = sanitizeString(phone);
    if (address) address = sanitizeString(address);
    if (notes) notes = sanitizeString(notes);

    try {
      const dataToUpdate: Prisma.ClientUpdateInput = {
        firstName: firstName.trim(),
      };

      if (lastName !== undefined) {
        dataToUpdate.lastName = typeof lastName === 'string' ? (lastName.trim() || null) : lastName;
      }
      if (email !== undefined) {
        dataToUpdate.email = typeof email === 'string' ? (email.trim() || null) : email;
      }
      if (phone !== undefined) {
        dataToUpdate.phone = typeof phone === 'string' ? (phone.trim() || null) : phone;
      }
      if (address !== undefined) {
        dataToUpdate.address = typeof address === 'string' ? (address.trim() || null) : address;
      }
      if (notes !== undefined) {
        dataToUpdate.notes = typeof notes === 'string' ? (notes.trim() || null) : notes;
      }

      const updatedClient = await prisma.client.update({
        where: { id },
        data: dataToUpdate,
      });
      res.status(200).json(updatedClient);
    } catch (error: any) {
      handleApiError(res, error, `updating client ${id}`);
    }
  } else if (req.method === 'DELETE') {
    try {
      // Verificar si el cliente tiene ventas asociadas
      const salesCount = await prisma.sale.count({
        where: { clientId: id },
      });

      if (salesCount > 0) {
        return res.status(409).json({ // 409 Conflict
          message: `No se puede eliminar el cliente porque tiene ${salesCount} venta(s) asociada(s).`
        });
      }
      
      await prisma.client.delete({
        where: { id },
      });
      res.status(204).end(); // No Content
    } catch (error: any) {
      handleApiError(res, error, `deleting client ${id}`);
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}