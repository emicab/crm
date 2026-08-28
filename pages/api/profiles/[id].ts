import type { NextApiRequest, NextApiResponse } from 'next';
import { resetProfileCache } from '../../../lib/prisma';
import { handleApiError } from '../../../lib/apiErrorHandler';
import { getProfileById, deleteProfile, getDefaultDbFileName, resolveDbFile, listProfiles } from '../../../lib/profiles';
import fs from 'fs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    res.status(405).json({ message: `Método ${req.method} no permitido.` });
    return;
  }

  try {
    const id = String(req.query.id || '');
    if (!id) {
      res.status(400).json({ message: 'El id del negocio es obligatorio.' });
      return;
    }

    const profile = getProfileById(id);
    if (!profile) {
      res.status(404).json({ message: 'El negocio no existe.' });
      return;
    }

    if (profile.dbFile === getDefaultDbFileName()) {
      res.status(400).json({
        message: 'No se puede eliminar el negocio principal de esta instalación.',
      });
      return;
    }

    if (listProfiles().length <= 1) {
      res.status(400).json({ message: 'Debe quedar al menos un negocio registrado.' });
      return;
    }

    deleteProfile(id);
    resetProfileCache();

    // Borrar el archivo de DB asociado (solo negocios clonados, no el principal).
    try {
      const abs = resolveDbFile(profile.dbFile);
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    } catch (e) {
      console.warn('[Profiles] No se pudo borrar el archivo de DB:', e);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    handleApiError(res, error, 'deleting profile');
  }
}
