import { PrismaClient } from '@prisma/client';
import path from 'path';

// Asegurar que DATABASE_URL esté definida en el entorno antes de instanciar PrismaClient
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${path.join(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/')}`;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // En desarrollo, evita crear múltiples instancias de PrismaClient
  // debido a la recarga en caliente de Next.js
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default prisma;