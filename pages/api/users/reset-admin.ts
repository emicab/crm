import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.status(403).json({
    message: 'Este endpoint ha sido desactivado por razones de seguridad.',
  });
}
