import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getPool } from "./db";

const fallbackPath = path.join(process.cwd(), "data", "tool-publish-state.json");

export type ToolPublishState = Record<string, { published: boolean }>;

export async function ensureToolPublishTable() {
  const pool = getPool();
  await pool.query(`
    create table if not exists tool_publish_state (
      slug text primary key,
      published boolean not null default true,
      updated_at timestamptz not null default now()
    )
  `);
}

export async function loadToolPublishState(): Promise<ToolPublishState> {
  if (process.env.DATABASE_URL) {
    await ensureToolPublishTable();
    const pool = getPool();
    const { rows } = await pool.query<{ slug: string; published: boolean }>({ text: "select slug, published from tool_publish_state" });
    return Object.fromEntries(rows.map((row) => [row.slug, { published: row.published }]));
  }
  try {
    const raw = await (await import("node:fs/promises")).readFile(fallbackPath, "utf8");
    return JSON.parse(raw) as ToolPublishState;
  } catch {
    return {};
  }
}

export async function saveToolPublishState(state: ToolPublishState) {
  if (process.env.DATABASE_URL) {
    await ensureToolPublishTable();
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("delete from tool_publish_state");
      for (const [slug, value] of Object.entries(state)) {
        await client.query("insert into tool_publish_state (slug, published) values ($1, $2)", [slug, value.published]);
      }
      await client.query("commit");
    } catch (reason) {
      await client.query("rollback");
      throw reason;
    } finally {
      client.release();
    }
    return;
  }
  await mkdir(path.dirname(fallbackPath), { recursive: true });
  await writeFile(fallbackPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}
