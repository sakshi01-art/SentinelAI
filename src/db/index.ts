import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { createMemoryDatabase } from "./mem_db";

const globalForDb = globalThis as typeof globalThis & {
  __sentinelaiPool?: any;
  __sentinelaiDb?: any;
};

function initDb() {
  if (globalForDb.__sentinelaiDb && globalForDb.__sentinelaiPool) {
    return {
      pool: globalForDb.__sentinelaiPool,
      db: globalForDb.__sentinelaiDb,
    };
  }

  const databaseUrl = process.env.DATABASE_URL;

  // If a real PostgreSQL connection string is provided, try using standard pg.Pool
  if (databaseUrl && databaseUrl.trim().length > 0 && !databaseUrl.includes("127.0.0.1:5432/app_db")) {
    try {
      const pool = new Pool({ connectionString: databaseUrl });
      const db = drizzle(pool);
      globalForDb.__sentinelaiPool = pool;
      globalForDb.__sentinelaiDb = db;
      return { pool, db };
    } catch (e) {
      console.warn("Failed to connect to external PostgreSQL, falling back to embedded database:", e);
    }
  }

  // Use embedded in-memory database for seamless zero-config execution
  const { pool, db } = createMemoryDatabase();
  globalForDb.__sentinelaiPool = pool;
  globalForDb.__sentinelaiDb = db;
  return { pool, db };
}

const { pool, db } = initDb();

export { pool, db };
