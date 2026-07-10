// pages/api/brands/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma'; // Ajusta la ruta si es necesario
import { handleApiError } from '../../../lib/apiErrorHandler';
import { sanitizeString } from '../../../lib/sanitize';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const brandIdQuery = req.query.id as string;

  if (!brandIdQuery || isNaN(parseInt(brandIdQuery))) {
    return res.status(400).json({ message: 'ID de marca inválido.' });
  }
  
  const id = parseInt(brandIdQuery);

  if (req.method === 'GET') {
    try {
      const brand = await prisma.brand.findUnique({
        where: { id },
      });
      if (!brand) {
        return res.status(404).json({ message: 'Marca no encontrada' });
      }
      res.status(200).json(brand);
    } catch (error) {
      handleApiError(res, error, `fetching brand ${id}`);
    }
  } else if (req.method === 'PUT') {
    let { name, logoUrl } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'El nombre es obligatorio para la actualización y debe ser una cadena de texto no vacía.' });
    }
    // logoUrl es opcional, puede ser string o null
    name = sanitizeString(name);
    if (logoUrl) logoUrl = sanitizeString(logoUrl);

    try {
      const updatedBrand = await prisma.brand.update({
        where: { id },
        data: {
          name: name.trim(),
          logoUrl: logoUrl !== undefined ? (logoUrl === '' ? null : logoUrl) : undefined, // Solo actualiza si se provee, permite vaciarlo
        },
      });
      res.status(200).json(updatedBrand);
    } catch (error) {
      handleApiError(res, error, `updating brand ${id}`);
    }
  } else if (req.method === 'DELETE') {
    try {
      // Verificar si hay productos asociados antes de eliminar (mantenemos esta lógica)
      const productsInBrand = await prisma.product.count({
        where: { brandId: id },
      });

      if (productsInBrand > 0) {
        return res.status(409).json({ // 409 Conflict
          message: `No se puede eliminar la marca porque tiene ${productsInBrand} producto(s) asociado(s). Primero reasigna o elimina esos productos.`
        });
      }
      
      await prisma.brand.delete({
        where: { id },
      });
      res.status(204).end(); // 204 No Content: Éxito, sin cuerpo de respuesta
    } catch (error) {
      handleApiError(res, error, `deleting brand ${id}`);
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}