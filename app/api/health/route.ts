export async function GET() {
  return Response.json({ ok: true, service: "paperpilot", timestamp: new Date().toISOString() });
}
