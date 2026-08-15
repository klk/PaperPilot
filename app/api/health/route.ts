import { workerQueueStatus } from "../../../lib/worker-queue";
import { getPool } from "../../../lib/db";

export async function GET() {
  let database: "connected" | "not-configured" | "unavailable" = process.env.DATABASE_URL ? "unavailable" : "not-configured";
  if (process.env.DATABASE_URL) {
    try {
      await getPool().query("select 1");
      database = "connected";
    } catch {
      database = "unavailable";
    }
  }
  const ok = database !== "unavailable";
  return Response.json({ ok, service: "paperpilot", database, workerQueue: workerQueueStatus(), timestamp: new Date().toISOString() }, { status: ok ? 200 : 503 });
}
