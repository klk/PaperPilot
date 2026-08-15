import { NextResponse } from "next/server";
import { createCaptcha } from "../../../../lib/admin-captcha";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() { return NextResponse.json(createCaptcha(), { headers: { "Cache-Control": "no-store" } }); }
