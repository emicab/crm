// pages/api/clients/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma'; // Adjust the path if necessary
import { Prisma } from '@prisma/client'; // For error typing

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { search } = req.query;
    // Define a prismaWhereClause object that we'll build conditionally
    let prismaWhereClause: Prisma.ClientWhereInput = {};

    if (search && typeof search === 'string' && search.trim() !== '') {
      prismaWhereClause = {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
        ],
      };
    }

    try {
      const clients = await prisma.client.findMany({
        where: prismaWhereClause, // Use the constructed where clause
        orderBy: [
          { firstName: 'asc' },
          { lastName: 'asc' },
        ],
      });
      res.status(200).json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: 'Error al obtener los clientes' });
    }
  } else if (req.method === 'POST') {
    const { firstName, lastName, email, phone, address, notes } = req.body;

    if (!firstName) {
      return res.status(400).json({ message: 'El nombre es obligatorio.' });
    }

    try {
      const newClient = await prisma.client.create({
        data: {
          firstName,
          lastName: lastName || null,
          email: email || null,
          phone: phone || null,
          address: address || null,
          notes: notes || null,
        },
      });
      res.status(201).json(newClient);
    } catch (error) {
      console.error("Error creating client:", error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
          return res.status(409).json({ message: 'Ya existe un cliente con este correo electrónico.' });
        }
      }
      res.status(500).json({ message: 'Error al crear el cliente' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}