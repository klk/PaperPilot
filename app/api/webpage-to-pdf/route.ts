import { chromium } from "@playwright/test";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const browserCandidates = [
  process.env.PLAYWRIGHT_CHROME_PATH,
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter((value): value is string => Boolean(value));

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function safeFilename(url: string) {
  try {
    const parsed = new URL(url);
    return (parsed.hostname || "webpage").replace(/[^a-z0-9.-]+/gi, "-").toLowerCase();
  } catch {
    return "webpage";
  }
}

async function launchBrowser() {
  for (const executablePath of browserCandidates) {
    try {
      return await chromium.launch({ headless: true, executablePath });
    } catch {
      // Try next candidate.
    }
  }
  return await chromium.launch({ headless: true });
}

export async function POST(request: Request) {
  const payload = request.headers.get("content-type")?.includes("application/json")
    ? await request.json().catch(() => ({}))
    : Object.fromEntries((await request.formData()).entries());
  const url = normalizeUrl(String((payload as Record<string, unknown>).url || ""));
  if (!url) return Response.json({ error: "请输入有效的网页地址。" }, { status: 400 });

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({ viewport: { width: 1365, height: 768 }, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.emulateMedia({ media: "screen" });
    const title = (await page.title().catch(() => "")) || safeFilename(url);
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" },
      displayHeaderFooter: false,
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${title.replace(/[^a-z0-9.-]+/gi, "-").toLowerCase() || "paperpilot-webpage"}.pdf"`,
      },
    });
  } catch (reason) {
    return Response.json({ error: reason instanceof Error ? reason.message : "网页转 PDF 失败。" }, { status: 500 });
  } finally {
    await browser.close().catch(() => {});
  }
}
