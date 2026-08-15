import { NextResponse } from "next/server";
import { changeAdminPassword, createAdminSession, requireAdmin, setAdminSession } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function text(value: unknown, maxLength: number) { return typeof value === "string" ? value.trim().slice(0, maxLength) : ""; }

export async function PATCH(request: Request) {
  const { denied } = await requireAdmin(request);
  if (denied) return denied;
  const payload = await request.json().catch(() => ({}));
  const currentPassword = text(payload.currentPassword, 256);
  const nextPassword = text(payload.nextPassword, 256);
  if (nextPassword.length < 6) return NextResponse.json({ error: "New passwords must contain at least 6 characters." }, { status: 400 });
  if (nextPassword === currentPassword) return NextResponse.json({ error: "Choose a password different from the current password." }, { status: 400 });
  const user = await changeAdminPassword(currentPassword, nextPassword);
  if (!user) return NextResponse.json({ error: "The current password is incorrect." }, { status: 400 });
  return setAdminSession(NextResponse.json({ ok: true }), createAdminSession(user));
}
