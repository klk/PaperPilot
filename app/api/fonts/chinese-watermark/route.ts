import { readFile } from "node:fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fontCandidates = [
  "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
  "/Library/Fonts/Arial Unicode.ttf",
  "/System/Library/Fonts/Hiragino Sans GB.ttc",
  "/System/Library/Fonts/STHeiti Medium.ttc",
  "/System/Library/Fonts/Supplemental/Songti.ttc",
];

export async function GET() {
  for (const candidate of fontCandidates) {
    try {
      const bytes = await readFile(/* turbopackIgnore: true */ candidate);
      return new Response(bytes, {
        headers: {
          "Content-Type": candidate.toLowerCase().endsWith(".ttf") ? "font/ttf" : "font/ttc",
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch {
      // Try next font.
    }
  }
  return Response.json({ error: "找不到可用的中文字体。" }, { status: 500 });
}
