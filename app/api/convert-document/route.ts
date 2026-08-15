import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sofficeCandidates = [
  process.env.SOFFICE_PATH,
  "soffice",
  "/Users/jwhklk/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/override/soffice",
].filter((value): value is string => Boolean(value));

const pdf2docxPythonCandidates = [
  process.env.PDF2DOCX_PYTHON,
  path.join(process.cwd(), ".venv-pdf2docx", "bin", "python"),
  "python3",
  "python",
].filter((value): value is string => Boolean(value));

const pdf2docxScript = process.env.PDF2DOCX_SCRIPT || path.join(process.cwd(), "scripts", "pdf_to_docx.py");
const pdf2pptxPythonCandidates = [
  process.env.PDF2PPTX_PYTHON,
  path.join(process.cwd(), ".venv-pdf2pptx", "bin", "python"),
  "python3",
  "python",
].filter((value): value is string => Boolean(value));
const pdf2pptxScript = process.env.PDF2PPTX_SCRIPT || path.join(process.cwd(), "scripts", "pdf_to_pptx.py");
const pdf2epubPythonCandidates = [
  process.env.PDF2EPUB_PYTHON,
  path.join(process.cwd(), ".venv-pdf2epub", "bin", "python"),
  path.join(process.cwd(), ".venv-pdf2docx", "bin", "python"),
  "python3",
  "python",
].filter((value): value is string => Boolean(value));
const pdf2epubScript = process.env.PDF2EPUB_SCRIPT || path.join(process.cwd(), "scripts", "pdf_to_epub.py");
const pdf2xlsxPythonCandidates = [
  process.env.PDF2XLSX_PYTHON,
  path.join(process.cwd(), ".venv-pdf2docx", "bin", "python"),
  path.join(process.cwd(), ".venv-pdf2xlsx", "bin", "python"),
  "python3",
  "python",
].filter((value): value is string => Boolean(value));
const pdf2xlsxScript = process.env.PDF2XLSX_SCRIPT || path.join(process.cwd(), "scripts", "pdf_to_xlsx.py");
const pdf2rtfPythonCandidates = [
  process.env.PDF2RTF_PYTHON,
  path.join(process.cwd(), ".venv-pdf2docx", "bin", "python"),
  path.join(process.cwd(), ".venv-pdf2epub", "bin", "python"),
  "python3",
  "python",
].filter((value): value is string => Boolean(value));
const pdf2rtfScript = process.env.PDF2RTF_SCRIPT || path.join(process.cwd(), "scripts", "pdf_to_rtf.py");

function extensionFor(format: string) {
  const allowed = new Set(["docx", "pptx", "xlsx", "odt", "odp", "ods", "rtf", "epub"]);
  return allowed.has(format) ? format : null;
}

async function convertPdfToDocx(input: string, output: string) {
  let lastError = "";
  for (const executable of pdf2docxPythonCandidates) {
    try {
      await execFileAsync(executable, [pdf2docxScript, input, output], { timeout: 180000, maxBuffer: 4 * 1024 * 1024 });
      return;
    } catch (reason) {
      lastError = reason instanceof Error ? reason.message : String(reason);
    }
  }
  throw new Error(`PDF→Word 转换 Worker 不可用：${lastError}`);
}

async function convertPdfToPptx(input: string, output: string) {
  let lastError = "";
  for (const executable of pdf2pptxPythonCandidates) {
    try {
      await execFileAsync(executable, [pdf2pptxScript, input, output], { timeout: 180000, maxBuffer: 4 * 1024 * 1024 });
      return;
    } catch (reason) {
      lastError = reason instanceof Error ? reason.message : String(reason);
    }
  }
  throw new Error(`PDF→PowerPoint 转换 Worker 不可用：${lastError}`);
}

async function convertPdfToEpub(input: string, output: string, mode: string) {
  let lastError = "";
  for (const executable of pdf2epubPythonCandidates) {
    try {
      await execFileAsync(executable, [pdf2epubScript, input, output, "--mode", mode], { timeout: 180000, maxBuffer: 4 * 1024 * 1024 });
      return;
    } catch (reason) {
      lastError = reason instanceof Error ? reason.message : String(reason);
    }
  }
  throw new Error(`PDF→EPUB 转换 Worker 不可用：${lastError}`);
}

async function convertPdfToXlsx(input: string, output: string) {
  let lastError = "";
  for (const executable of pdf2xlsxPythonCandidates) {
    try {
      await execFileAsync(executable, [pdf2xlsxScript, input, output], { timeout: 180000, maxBuffer: 4 * 1024 * 1024 });
      return;
    } catch (reason) {
      lastError = reason instanceof Error ? reason.message : String(reason);
    }
  }
  throw new Error(`PDF→Excel 转换 Worker 不可用：${lastError}`);
}

async function convertPdfToRtf(input: string, output: string) {
  let lastError = "";
  for (const executable of pdf2rtfPythonCandidates) {
    try {
      await execFileAsync(executable, [pdf2rtfScript, input, output], { timeout: 180000, maxBuffer: 4 * 1024 * 1024 });
      return;
    } catch (reason) {
      lastError = reason instanceof Error ? reason.message : String(reason);
    }
  }
  throw new Error(`PDF→Rich Text 转换 Worker 不可用：${lastError}`);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const format = String(form.get("format") || "docx").toLowerCase();
  const mode = String(form.get("mode") || "flow");
  const extension = extensionFor(format);
  if (!(file instanceof File) || !extension) return Response.json({ error: "缺少文件或不支持的转换格式。" }, { status: 400 });

  const workdir = await mkdtemp(path.join(tmpdir(), "paperpilot-convert-"));
  const input = path.join(workdir, "input.pdf");
  const output = path.join(workdir, `input.${extension}`);
  try {
    await writeFile(input, Buffer.from(await file.arrayBuffer()));
    if (format === "docx") {
      await convertPdfToDocx(input, output);
      const bytes = await readFile(output);
      return new Response(bytes, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Content-Disposition": 'attachment; filename="paperpilot.docx"' } });
    }
    if (format === "pptx") {
      await convertPdfToPptx(input, output);
      const bytes = await readFile(output);
      return new Response(bytes, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "Content-Disposition": 'attachment; filename="paperpilot.pptx"' } });
    }
    if (format === "epub") {
      await convertPdfToEpub(input, output, ["flow", "pdf-flow", "fixed"].includes(mode) ? mode : "flow");
      const bytes = await readFile(output);
      return new Response(bytes, { headers: { "Content-Type": "application/epub+zip", "Content-Disposition": 'attachment; filename="paperpilot.epub"' } });
    }
    if (format === "xlsx") {
      await convertPdfToXlsx(input, output);
      const bytes = await readFile(output);
      return new Response(bytes, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="paperpilot.xlsx"' } });
    }
    if (format === "rtf") {
      await convertPdfToRtf(input, output);
      const bytes = await readFile(output);
      return new Response(bytes, { headers: { "Content-Type": "application/rtf", "Content-Disposition": 'attachment; filename="paperpilot.rtf"' } });
    }
    let lastError = "";
    for (const executable of sofficeCandidates) {
      try {
        await execFileAsync(executable, ["--headless", "--convert-to", extension, "--outdir", workdir, input], { timeout: 120000, maxBuffer: 2 * 1024 * 1024 });
        lastError = "";
        break;
      } catch (reason) {
        lastError = reason instanceof Error ? reason.message : String(reason);
      }
    }
    if (lastError) throw new Error(`Office 转换引擎不可用：${lastError}`);
    const bytes = await readFile(output);
    return new Response(bytes, { headers: { "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="paperpilot.${extension}"` } });
  } catch (reason) {
    return Response.json({ error: reason instanceof Error ? reason.message : "文档转换失败。" }, { status: 500 });
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
}
