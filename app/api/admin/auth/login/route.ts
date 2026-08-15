import { NextResponse } from "next/server";
import { verifyCaptcha } from "../../../../../lib/admin-captcha";
import { createAdminSession, setAdminSession, verifyAdminCredentials } from "../../../../../lib/admin-auth";
import { enforceRateLimit } from "../../../../../lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function text(value: unknown, maxLength: number) { return typeof value === "string" ? value.trim().slice(0, maxLength) : ""; }

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "admin-login", 10, 15 * 60_000);
  if (limited) return limited;
  const payload = await request.json().catch(() => ({}));
  const username = text(payload.username, 64);
  const password = text(payload.password, 256);
  const captchaId = text(payload.captchaId, 512);
  const captcha = text(payload.captcha, 16);
  if (!verifyCaptcha(captchaId, captcha)) return NextResponse.json({ error: "The verification code is incorrect or expired." }, { status: 400 });
  const user = await verifyAdminCredentials(username, password).catch(() => null);
  if (!user) return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
  return setAdminSession(NextResponse.json({ ok: true, username: user.username }), createAdminSession(user));
}
