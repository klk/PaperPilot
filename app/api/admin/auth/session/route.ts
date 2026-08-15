import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAdminSession(request).catch(() => null);
  if (!user) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({ authenticated: true, username: user.username });
}
