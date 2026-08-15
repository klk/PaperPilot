import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import { mergeToolPublishState } from "../../../../lib/tools";
import { loadToolPublishState, saveToolPublishState } from "../../../../lib/tool-publish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { denied } = await requireAdmin(request);
  if (denied) return denied;
  const state = await loadToolPublishState();
  return NextResponse.json({ tools: mergeToolPublishState(state), state });
}

export async function PATCH(request: Request) {
  const { denied } = await requireAdmin(request);
  if (denied) return denied;
  const payload = await request.json().catch(() => ({}));
  const slug = payload.slug;
  const published = payload.published;
  if (typeof slug !== "string" || typeof published !== "boolean") return NextResponse.json({ error: "参数不正确。" }, { status: 400 });
  const state = await loadToolPublishState();
  state[slug] = { published };
  await saveToolPublishState(state);
  return NextResponse.json({ ok: true, state, tools: mergeToolPublishState(state) });
}

