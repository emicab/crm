import type { NextApiRequest, NextApiResponse } from 'next';
import { resetProfileCache } from '../../../lib/prisma';
import { handleApiError } from '../../../lib/apiErrorHandler';
import { setActiveProfile, getProfileById } from '../../../lib/profiles';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ message: `Método ${req.method} no permitido.` });
    return;
  }

  try {
    const { id } = req.body || {};
    if (!id || typeof id !== 'string') {
      res.status(400).json({ message: 'El id del negocio es obligatorio.' });
      return;
    }

    const profile = getProfileById(id);
    if (!profile) {
      res.status(404).json({ message: 'El negocio no existe.' });
      return;
    }

    await setActiveProfile(id);
    resetProfileCache();

    res.status(200).json({ success: true, activeProfileId: id, name: profile.name });
  } catch (error) {
    handleApiError(res, error, 'activating profile');
  }
}
