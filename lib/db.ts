import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var paperpilotPool: Pool | undefined;
}

export function getPool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  if (!global.paperpilotPool) {
    global.paperpilotPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return global.paperpilotPool;
}

