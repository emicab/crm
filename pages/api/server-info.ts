import type { NextApiRequest, NextApiResponse } from 'next';
import * as os from 'os';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const interfaces = os.networkInterfaces();
  let ip = '127.0.0.1';

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ip = iface.address;
        break;
      }
    }
    if (ip !== '127.0.0.1') break;
  }

  res.status(200).json({ ip, hostname: os.hostname() });
}
