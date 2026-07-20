import { PrismaClient } from '@prisma/client';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

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

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

// Correr migraciones SQL locales pendientes de forma programática para actualizar la base del usuario
async function runPendingMigrations(client: PrismaClient) {
  try {
    const migrationsPath = path.join(process.cwd(), 'prisma', 'migrations');
    
    if (!fs.existsSync(migrationsPath)) {
      console.log('[DB Migration] Carpeta de migraciones no encontrada en:', migrationsPath);
      return;
    }

    // 1. Asegurarse de que existe la tabla _prisma_migrations
    const tableCheck = await client.$queryRawUnsafe<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='_prisma_migrations'"
    );
    
    if (tableCheck.length === 0) {
      console.log('[DB Migration] Tabla _prisma_migrations no encontrada. Creándola...');
      await client.$executeRawUnsafe(`
        CREATE TABLE "_prisma_migrations" (
          "id" TEXT PRIMARY KEY NOT NULL,
          "checksum" TEXT NOT NULL,
          "finished_at" DATETIME,
          "migration_name" TEXT NOT NULL,
          "logs" TEXT,
          "rolled_back_at" DATETIME,
          "started_at" DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "applied_steps_count" INTEGER DEFAULT 0 NOT NULL
        )
      `);
    }

    // 2. Obtener migraciones aplicadas
    const applied = await client.$queryRawUnsafe<{ migration_name: string }[]>(
      "SELECT migration_name FROM _prisma_migrations WHERE rolled_back_at IS NULL"
    );
    const appliedNames = new Set(applied.map(row => row.migration_name));

    // 3. Leer las carpetas de migración locales
    const folders = fs.readdirSync(migrationsPath)
      .filter(name => fs.statSync(path.join(migrationsPath, name)).isDirectory())
      .sort(); // Ordenar cronológicamente

    console.log(`[DB Migration] Encontradas ${folders.length} migraciones locales.`);

    for (const folder of folders) {
      if (appliedNames.has(folder)) {
        continue;
      }

      console.log(`[DB Migration] Aplicando migración pendiente: ${folder}`);
      const sqlFilePath = path.join(migrationsPath, folder, 'migration.sql');
      if (!fs.existsSync(sqlFilePath)) {
        console.warn(`[DB Migration] Archivo sql faltante para ${folder}`);
        continue;
      }

      const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
      
      // Separar instrucciones SQL por ";" para ejecutarlas secuencialmente
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      // Registrar inicio de la migración
      const migrationId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      const startTime = new Date().toISOString();
      
      await client.$executeRawUnsafe(`
        INSERT INTO _prisma_migrations (id, checksum, started_at, migration_name)
        VALUES ('${migrationId}', 'temp-checksum', '${startTime}', '${folder}')
      `);

      let stepsCount = 0;
      try {
        for (const statement of statements) {
          await client.$executeRawUnsafe(statement);
          stepsCount++;
        }

        // Registrar éxito
        const finishedTime = new Date().toISOString();
        await client.$executeRawUnsafe(`
          UPDATE _prisma_migrations
          SET finished_at = '${finishedTime}', applied_steps_count = ${stepsCount}
          WHERE id = '${migrationId}'
        `);
        console.log(`[DB Migration] Migración ${folder} aplicada con éxito.`);
      } catch (err: any) {
        console.error(`[DB Migration] ERROR al aplicar la migración ${folder}:`, err);
        const errorLogs = String(err.message || err).replace(/'/g, "''");
        await client.$executeRawUnsafe(`
          UPDATE _prisma_migrations
          SET logs = '${errorLogs}', rolled_back_at = '${new Date().toISOString()}'
          WHERE id = '${migrationId}'
        `);
        throw err;
      }
    }
  } catch (error) {
    console.error('[DB Migration] Falló la ejecución automática de migraciones:', error);
    throw error;
  }
}

// Autoseed de datos obligatorios para modularización (Vendedor por defecto ID=1)
async function seed(client: PrismaClient) {
  try {
    // 0. Correr migraciones pendientes para garantizar tablas actualizadas
    await runPendingMigrations(client);

    // 1. Vendedor por defecto
    await client.seller.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        name: "Caja Principal",
        isActive: true,
      },
    });
    console.log('[DB] Seeding: Vendedor por defecto (ID=1) asegurado.');

    // 2. Usuarios por defecto (roles)
    await client.user.upsert({
      where: { name: "Administrador" },
      update: {},
      create: {
        name: "Administrador",
        role: "ADMIN",
        pinHash: hashPin("1234"),
      },
    });
    await client.user.upsert({
      where: { name: "Supervisor" },
      update: {},
      create: {
        name: "Supervisor",
        role: "SUPERVISOR",
        pinHash: hashPin("4321"),
      },
    });
    await client.user.upsert({
      where: { name: "Cajero" },
      update: {},
      create: {
        name: "Cajero",
        role: "CASHIER",
        pinHash: hashPin("0000"),
      },
    });
    console.log('[DB] Seeding: Usuarios por defecto asegurados.');
  } catch (error) {
    console.error('[DB] Error en autoseed:', error);
  }
}

seed(prisma);

export default prisma;