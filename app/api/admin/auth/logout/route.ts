import { NextResponse } from "next/server";
import { clearAdminSession } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST() { return clearAdminSession(NextResponse.json({ ok: true })); }
