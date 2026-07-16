import { PrismaClient } from "@prisma/client";

const SCHEMA_VERSION = "ugc-opportunities-v1";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaVersion?: string;
  prismaReady?: Promise<void>;
};

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

if (
  process.env.NODE_ENV !== "production" &&
  globalForPrisma.prisma &&
  globalForPrisma.prismaSchemaVersion !== SCHEMA_VERSION
) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
  globalForPrisma.prismaReady = undefined;
}

export const prisma = globalForPrisma.prisma ?? createClient();

async function warmSqlite(client: PrismaClient) {
  try {
    await client.$queryRawUnsafe("PRAGMA journal_mode=WAL;");
    await client.$queryRawUnsafe("PRAGMA synchronous=NORMAL;");
    await client.$queryRawUnsafe("PRAGMA busy_timeout=5000;");
  } catch {
    // ignore — non-sqlite or locked
  }
}

if (!globalForPrisma.prismaReady) {
  globalForPrisma.prismaReady = warmSqlite(prisma);
}

export const prismaReady = globalForPrisma.prismaReady;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaVersion = SCHEMA_VERSION;
}
