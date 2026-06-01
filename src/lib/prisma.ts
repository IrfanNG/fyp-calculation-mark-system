import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

declare global {
  var prisma: PrismaClient | undefined;
}

const datasourceUrl = process.env.DATABASE_URL ?? "file:./dev.db";

function getSqliteFilePath(url: string) {
  // Prisma SQLite URLs look like: file:./dev.db
  if (!url.startsWith("file:")) return "dev.db";
  const path = url.slice("file:".length);
  return path.startsWith("./") ? path.slice(2) : path;
}

const sqliteFilePath = getSqliteFilePath(datasourceUrl);
const adapter = new PrismaBetterSqlite3({ url: sqliteFilePath });

export const prisma = global.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
