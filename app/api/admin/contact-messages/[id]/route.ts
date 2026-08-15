import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/admin-auth";
import { deleteContactMessage, type ContactMessageStatus, updateContactMessageStatus } from "../../../../../lib/contact-messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };
const statuses = new Set<ContactMessageStatus>(["new", "in_progress", "closed"]);

export async function PATCH(request: Request, { params }: RouteContext) {
  const { denied } = await requireAdmin(request);
  if (denied) return denied;
  const payload = await request.json().catch(() => ({}));
  const status = payload.status;
  if (typeof status !== "string" || !statuses.has(status as ContactMessageStatus)) return NextResponse.json({ error: "无效的消息状态。" }, { status: 400 });
  const message = await updateContactMessageStatus((await params).id, status as ContactMessageStatus);
  if (!message) return NextResponse.json({ error: "消息不存在。" }, { status: 404 });
  return NextResponse.json({ message });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { denied } = await requireAdmin(request);
  if (denied) return denied;
  const deleted = await deleteContactMessage((await params).id);
  if (!deleted) return NextResponse.json({ error: "消息不存在。" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
