import type { NextApiRequest, NextApiResponse } from 'next';
import forge from 'node-forge';
import prisma from '@/lib/prisma';
import { encryptText } from '@/lib/encryption';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const { cuit, businessName } = req.body;

    if (!cuit) {
      return res.status(400).json({ error: 'El CUIT es obligatorio.' });
    }

    const cleanCuit = cuit.replace(/\D/g, '');
    if (cleanCuit.length !== 11) {
      return res.status(400).json({ error: 'El CUIT debe tener exactamente 11 dígitos.' });
    }

    const orgName = (businessName || 'ClinPOS Comercio').trim();

    // 1. Generar par de claves RSA de 2048 bits
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);

    // 2. Crear solicitud de firma de certificado (CSR PKCS#10)
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = keys.publicKey;
    csr.setSubject([
      { name: 'countryName', value: 'AR' },
      { name: 'organizationName', value: orgName },
      { name: 'commonName', value: 'ClinPOS' },
      { name: 'serialNumber', value: `CUIT ${cleanCuit}` },
    ]);

    // Firmar el CSR con SHA-256
    csr.sign(keys.privateKey, forge.md.sha256.create());
    const csrPem = forge.pki.certificationRequestToPem(csr);

    // 3. Auto-guardar la clave privada encriptada con AES-256 + DPAPI en la DB local
    const encryptedKey = encryptText(privateKeyPem);

    await prisma.setting.upsert({
      where: { key: 'arcaKey' },
      update: { value: encryptedKey },
      create: { key: 'arcaKey', value: encryptedKey },
    });

    await prisma.setting.upsert({
      where: { key: 'arcaCuit' },
      update: { value: cleanCuit },
      create: { key: 'arcaCuit', value: cleanCuit },
    });

    return res.status(200).json({
      success: true,
      csrPem,
      filename: `solicitud_afip_${cleanCuit}.csr`,
      message: 'Clave privada generada y guardada exitosamente.',
    });
  } catch (error: any) {
    console.error('Error al generar CSR:', error);
    return res.status(500).json({
      error: 'Error interno al generar la solicitud de certificado.',
      details: error.message,
    });
  }
}
