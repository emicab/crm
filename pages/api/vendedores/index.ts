// pages/api/vendedores/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    
    try {
      const sellers = await prisma.seller.findMany({
        // where: { isActive: true },
        orderBy: { name: 'asc' },
      });
      
      res.status(200).json(sellers);
    } catch (error) {

      res.status(500).json({ message: 'Error al obtener los vendedores' });
    }
  } else if (req.method === 'POST') {
    
    const { name, email, phone, isActive } = req.body;

    if (!name) {
      
      return res.status(400).json({ message: 'El nombre del vendedor es obligatorio.' });
    }

    try {
      
      const newSeller = await prisma.seller.create({
        data: {
          name,
          email: email || null,
          phone: phone || null,
          isActive: isActive !== undefined ? isActive : true,
        },
      });
      
      res.status(201).json(newSeller);
    } catch (error: any) { // Especificar 'any' o 'unknown' para 'error'
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') { 
          const target = error.meta?.target as string[] | undefined;
          if (target?.includes('name')) {
            return res.status(409).json({ message: 'Ya existe un vendedor con este nombre.' });
          }
          if (target?.includes('email')) {
            return res.status(409).json({ message: 'Ya existe un vendedor con este correo electrónico.' });
          }
        }
      }
      
      res.status(500).json({ message: `Error al crear el vendedor: ${error.message || 'Error desconocido'}` });
    }
  } else {
    
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  
}