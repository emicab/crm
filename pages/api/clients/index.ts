// pages/api/clients/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma'; // Adjust the path if necessary
import { Prisma } from '@prisma/client'; // For error typing
import { handleApiError } from '../../../lib/apiErrorHandler';
import { sanitizeString } from '../../../lib/sanitize';

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

    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string) || 50, 100) : 50;
    const skip = page ? (page - 1) * limit : undefined;

    try {
      const [clients, total] = await Promise.all([
        prisma.client.findMany({
          where: prismaWhereClause, // Use the constructed where clause
          orderBy: [
            { firstName: 'asc' },
            { lastName: 'asc' },
          ],
          ...(skip !== undefined && { skip, take: limit }),
        }),
        prisma.client.count({ where: prismaWhereClause }),
      ]);

      if (page !== undefined) {
        res.status(200).json({
          data: clients,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          }
        });
      } else {
        res.status(200).json(clients);
      }
    } catch (error) {
      handleApiError(res, error, "fetching clients");
    }
  } else if (req.method === 'POST') {
    let { firstName, lastName, email, phone, address, notes } = req.body;

    if (!firstName) {
      return res.status(400).json({ message: 'El nombre es obligatorio.' });
    }

    firstName = sanitizeString(firstName);
    if (lastName) lastName = sanitizeString(lastName);
    if (email) email = sanitizeString(email);
    if (phone) phone = sanitizeString(phone);
    if (address) address = sanitizeString(address);
    if (notes) notes = sanitizeString(notes);

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
      handleApiError(res, error, "creating client");
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}