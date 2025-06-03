// pages/api/vendedores/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(`[VENDEDORES API] START - Method: ${req.method}`); // <-- AÑADE ESTO
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`[VENDEDORES API] Request Body:`, req.body); // <-- AÑADE ESTO (si hay body)
  }


  if (req.method === 'GET') {
    console.log("[VENDEDORES API] Entering GET block"); // <-- AÑADE ESTO
    try {
      const sellers = await prisma.seller.findMany({
        // where: { isActive: true },
        orderBy: { name: 'asc' },
      });
      console.log("[VENDEDORES API GET] Sending 200 response"); // <-- AÑADE ESTO
      res.status(200).json(sellers);
    } catch (error) {
      console.error("[VENDEDORES API GET] Error fetching sellers:", error); // <-- Modifica para identificar el bloque
      console.log("[VENDEDORES API GET] Sending 500 response from catch"); // <-- AÑADE ESTO
      res.status(500).json({ message: 'Error al obtener los vendedores' });
    }
  } else if (req.method === 'POST') {
    console.log("[VENDEDORES API] Entering POST block"); // <-- AÑADE ESTO
    const { name, email, phone, isActive } = req.body;

    if (!name) {
      console.log("[VENDEDORES API POST] Name missing. Sending 400 response."); // <-- AÑADE ESTO
      return res.status(400).json({ message: 'El nombre del vendedor es obligatorio.' });
    }

    try {
      console.log("[VENDEDORES API POST] Attempting to create seller..."); // <-- AÑADE ESTO
      const newSeller = await prisma.seller.create({
        data: {
          name,
          email: email || null,
          phone: phone || null,
          isActive: isActive !== undefined ? isActive : true,
        },
      });
      console.log("[VENDEDORES API POST] Seller created. Sending 201 response."); // <-- AÑADE ESTO
      res.status(201).json(newSeller);
    } catch (error: any) { // Especificar 'any' o 'unknown' para 'error'
      console.error("[VENDEDORES API POST] Error creating seller:", error); // <-- Modifica para identificar el bloque
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') { 
          const target = error.meta?.target as string[] | undefined;
          if (target?.includes('name')) {
            console.log("[VENDEDORES API POST] Name conflict. Sending 409 response."); // <-- AÑADE ESTO
            return res.status(409).json({ message: 'Ya existe un vendedor con este nombre.' });
          }
          if (target?.includes('email')) {
            console.log("[VENDEDORES API POST] Email conflict. Sending 409 response."); // <-- AÑADE ESTO
            return res.status(409).json({ message: 'Ya existe un vendedor con este correo electrónico.' });
          }
        }
      }
      console.log("[VENDEDORES API POST] Generic error in catch. Sending 500 response."); // <-- AÑADE ESTO
      res.status(500).json({ message: `Error al crear el vendedor: ${error.message || 'Error desconocido'}` });
    }
  } else {
    console.log(`[VENDEDORES API] Method ${req.method} not allowed. Sending 405.`); // <-- AÑADE ESTO
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  // Este log es para ver si alguna vez la función termina sin haber enviado una respuesta explícita arriba.
  // No debería aparecer si todo va bien.
  // Para evitar que TypeScript se queje de que este log es inalcanzable si todas las rutas tienen `return res...` o `res.end()`,
  // lo comentaremos o lo usaremos con cuidado. Por ahora, si uno de los `console.log` de envío de respuesta no aparece antes,
  // sabremos que hay un problema.
  // console.log("[VENDEDORES API] END - Handler finished. Was a response sent properly?");
}