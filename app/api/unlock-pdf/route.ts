import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);
const pythonCandidates = [
  process.env.PDF2UNLOCK_PYTHON,
  process.env.PDF2DOCX_PYTHON,
  path.join(process.cwd(), ".venv-pdf2docx", "bin", "python"),
  "python3",
  "python",
].filter((value): value is string => Boolean(value));
const script = process.env.PDF2UNLOCK_SCRIPT || path.join(process.cwd(), "scripts", "pdf_to_unlocked_pdf.py");

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const password = String(form.get("password") || "");
  if (!(file instanceof File) || !password) return Response.json({ error: "缺少文件或密码。" }, { status: 400 });

  const workdir = await mkdtemp(path.join(tmpdir(), "paperpilot-unlock-"));
  const input = path.join(workdir, "input.pdf");
  const output = path.join(workdir, "output.pdf");
  try {
    await writeFile(input, Buffer.from(await file.arrayBuffer()));
    let lastError = "";
    for (const executable of pythonCandidates) {
      try {
        await execFileAsync(executable, [script, input, output, "--password", password], { timeout: 180000, maxBuffer: 4 * 1024 * 1024 });
        lastError = "";
        break;
      } catch (reason) {
        lastError = reason instanceof Error ? reason.message : String(reason);
      }
    }
    if (lastError) throw new Error(`PDF 解密 Worker 不可用：${lastError}`);
    const bytes = await readFile(output);
    return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="paperpilot-unlocked.pdf"' } });
  } catch (reason) {
    return Response.json({ error: reason instanceof Error ? reason.message : "PDF 解除保护失败。" }, { status: 500 });
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
}
