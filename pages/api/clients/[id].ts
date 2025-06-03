// pages/api/clients/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';

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
      console.error(`Error fetching client ${id}:`, error);
      res.status(500).json({ message: `Error al obtener el cliente: ${error.message}` });
    }
  } else if (req.method === 'PUT') {
    const { firstName, lastName, email, phone, address, notes } = req.body;

    if (!firstName || typeof firstName !== 'string' || firstName.trim() === '') {
      return res.status(400).json({ message: 'El nombre es obligatorio.' });
    }

    try {
      const dataToUpdate: Prisma.ClientUpdateInput = {
        firstName: firstName.trim(),
      };

      // Manejo cuidadoso de campos opcionales:
      // Solo se añaden a dataToUpdate si realmente se enviaron en el body (no son undefined).
      // Y si se envían, se procesan (trim para strings, o se usa el valor null directamente).

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
      
      // No es necesario el Object.keys para borrar undefined aquí porque
      // solo añadimos las propiedades a dataToUpdate si no son undefined.

      const updatedClient = await prisma.client.update({
        where: { id },
        data: dataToUpdate,
      });
      res.status(200).json(updatedClient);
    } catch (error: any) {
      console.error(`Error updating client ${id}:`, error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') { // "Record to update not found"
          return res.status(404).json({ message: 'Cliente no encontrado para actualizar.' });
        }
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
          // Violación de constraint único para el email
          return res.status(409).json({ message: 'Ya existe otro cliente con este correo electrónico.' });
        }
      }
      res.status(500).json({ message: `Error al actualizar el cliente: ${error.message}` });
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
      console.error(`Error deleting client ${id}:`, error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        // "Record to delete not found"
        return res.status(404).json({ message: 'Cliente no encontrado para eliminar.' });
      }
      res.status(500).json({ message: `Error al eliminar el cliente: ${error.message}` });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}