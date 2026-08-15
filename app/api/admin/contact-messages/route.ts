import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import { listContactMessages } from "../../../../lib/contact-messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { denied } = await requireAdmin(request);
  if (denied) return denied;
  return NextResponse.json({ messages: await listContactMessages() });
}
