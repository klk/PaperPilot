import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { enforceRateLimit, rejectOversizedRequest, validatePdfBytes, validateUploadedFile } from "../../../lib/request-security";
import { acquireWorkerSlot } from "../../../lib/worker-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);
const maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES) || 50 * 1024 * 1024;
const pythonCandidates = [
  process.env.PDF2UNLOCK_PYTHON,
  process.env.PDF2DOCX_PYTHON,
  path.join(process.cwd(), ".venv-pdf2docx", "bin", "python"),
  "python3",
  "python",
].filter((value): value is string => Boolean(value));
const script = process.env.PDF2UNLOCK_SCRIPT || path.join(process.cwd(), "scripts", "pdf_to_unlocked_pdf.py");

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "unlock-pdf", 10, 60_000);
  if (limited) return limited;
  const oversized = rejectOversizedRequest(request, maxUploadBytes);
  if (oversized) return oversized;
  const form = await request.formData();
  const file = form.get("file");
  const password = String(form.get("password") || "");
  const fileError = validateUploadedFile(file, maxUploadBytes);
  if (fileError || !password) return Response.json({ error: fileError || "缺少密码。" }, { status: fileError?.startsWith("文件过大") ? 413 : 400 });
  if (!(file instanceof File)) return Response.json({ error: "缺少上传文件。" }, { status: 400 });

  const workdir = await mkdtemp(path.join(tmpdir(), "paperpilot-unlock-"));
  const input = path.join(workdir, "input.pdf");
  const output = path.join(workdir, "output.pdf");
  let releaseWorker: (() => void) | undefined;
  try {
    releaseWorker = await acquireWorkerSlot();
    const inputBytes = Buffer.from(await file.arrayBuffer());
    const pdfError = await validatePdfBytes(inputBytes);
    if (pdfError) return Response.json({ error: pdfError }, { status: 400 });
    await writeFile(input, inputBytes);
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
    console.error("PDF unlock failed", reason);
    const busy = reason instanceof Error && reason.message.startsWith("WORKER_QUEUE_");
    return Response.json({ error: busy ? "转换服务繁忙，请稍后重试。" : "PDF 解除保护失败或转换服务暂不可用。" }, { status: busy ? 503 : 500 });
  } finally {
    releaseWorker?.();
    await rm(workdir, { recursive: true, force: true });
  }
}
