import { NextResponse } from "next/server";
import { createContactMessage } from "../../../lib/contact-messages";
import { enforceRateLimit, rejectOversizedRequest } from "../../../lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function text(value: unknown, maxLength: number) { return typeof value === "string" ? value.trim().slice(0, maxLength) : ""; }

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "contact", 5, 10 * 60_000);
  if (limited) return limited;
  const oversized = rejectOversizedRequest(request, 16 * 1024);
  if (oversized) return oversized;
  let payload: Record<string, unknown>;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "提交内容格式不正确。" }, { status: 400 }); }
  const name = text(payload.name, 120);
  const email = text(payload.email, 254);
  const subject = text(payload.subject, 200);
  const message = text(payload.message, 5000);
  const website = text(payload.website, 200);

  // Quietly accept automated form fills without forwarding them.
  if (website) return NextResponse.json({ ok: true });
  if (!name || !emailPattern.test(email) || !subject || !message) return NextResponse.json({ error: "请完整填写姓名、有效邮箱、主题和消息。" }, { status: 400 });

  const contactMessage = await createContactMessage({ name, email, subject, message });
  const webhookUrl = process.env.CONTACT_WEBHOOK_URL;
  let webhookDelivered = false;
  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": "PaperPilot-Contact-Form/1.0" }, body: JSON.stringify({ ...contactMessage, source: "paperpilot-contact" }), signal: AbortSignal.timeout(10_000) });
      webhookDelivered = response.ok;
    } catch { /* The message remains available in the administration dashboard. */ }
  }
  return NextResponse.json({ ok: true, id: contactMessage.id, webhookDelivered });
}
