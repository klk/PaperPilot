"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Download, FilePlus2, FileText, GripVertical, ImagePlus, LoaderCircle, LockKeyhole, MoveLeft, MoveRight, ShieldCheck, Trash2, Upload, WandSparkles, X } from "lucide-react";
import { degrees, PDFDocument, PageSizes, rgb, StandardFonts } from "pdf-lib";
import { capabilityForTool, type Tool } from "../lib/tools";
import type { Locale } from "../lib/i18n";
import { ReorderPdfWorkspace } from "./tool-workspace/ReorderPdfWorkspace";
import { workspaceCopy, workspaceT } from "./tool-workspace/copy";
import { PdfEditor } from "./tool-workspace/PdfEditor";
import { compressPdf, convertImage, convertPdfOutput, convertToPdf, downloadBytes, formatSize, imageToPdf, loadChineseWatermarkFont, loadPdf, parsePages, safeName, savePdf, textToPdf, pdfToImages } from "./tool-workspace/document-operations";

type LocalFile = { id: string; file: File };
type OverlaySlot = "base" | "overlay";
function visibleError(reason: unknown, fallback: string, t: ReturnType<typeof workspaceT>) {
  const message = reason instanceof Error ? reason.message : "";
  if (!message) return fallback;
  return t.security === workspaceCopy.zh.security || !/[\u4e00-\u9fff]/.test(message) ? message : fallback;
}

function compressionDetail(locale: Locale, input: number, output: number, reduction: number, dpi: number, quality: number) {
  const sizes = `${formatSize(input)} → ${formatSize(output)}`;
  if (locale === "zh") return `${sizes} · ${reduction > 0 ? `减少 ${reduction.toFixed(1)}%` : "已重新编码，文件大小未进一步减少"} · 实际参数 ${dpi} DPI / ${quality} · 重建页面、移除原始字体与页面对象、JPEG 图像压缩、对象流保存`;
  const reduced = reduction > 0 ? `${reduction.toFixed(1)}%` : "0%";
  const copy: Record<Exclude<Locale, "zh">, string> = {
    en: `${reduced} smaller · actual settings ${dpi} DPI / ${quality} · pages rebuilt and JPEG images compressed`,
    de: `${reduced} kleiner · tatsächliche Einstellungen ${dpi} DPI / ${quality} · Seiten neu aufgebaut und JPEG-Bilder komprimiert`,
    fr: `${reduced} de réduction · réglages réels ${dpi} DPI / ${quality} · pages reconstruites et images JPEG compressées`,
    nl: `${reduced} kleiner · werkelijke instellingen ${dpi} DPI / ${quality} · pagina’s opnieuw opgebouwd en JPEG-afbeeldingen gecomprimeerd`,
    ja: `${reduced} 削減 · 実際の設定 ${dpi} DPI / ${quality} · ページを再構築し JPEG 画像を圧縮`,
    ko: `${reduced} 감소 · 실제 설정 ${dpi} DPI / ${quality} · 페이지 재구성 및 JPEG 이미지 압축`,
    ru: `уменьшено на ${reduced} · фактические параметры ${dpi} DPI / ${quality} · страницы пересобраны, изображения JPEG сжаты`,
  };
  return `${sizes} · ${copy[locale]}`;
}

type WorkspaceOptions = {
  pages: string;
  angle: string;
  watermark: string;
  pageSize: string;
  pagesPerSheet: string;
  pageMargin: string;
  pageDirection: "ltr" | "rtl";
  addBorder: boolean;
  metadata: string;
  metadataAuthor: string;
  metadataSubject: string;
  metadataKeywords: string;
  text: string;
  dpi: string;
  quality: string;
  format: string;
  mode: string;
  watermarkFont: "Helvetica" | "Helvetica-Bold" | "Helvetica-Oblique" | "Helvetica-BoldOblique" | "Times-Roman" | "Times-Bold" | "Times-Italic" | "Times-BoldItalic" | "Courier" | "Courier-Bold" | "Courier-Oblique" | "Courier-BoldOblique";
  watermarkBold: boolean;
  watermarkItalic: boolean;
  watermarkSize: string;
  watermarkOpacity: string;
  watermarkColor: string;
  watermarkPosition: "top-left" | "top" | "top-right" | "left" | "center" | "right" | "bottom-left" | "bottom" | "bottom-right" | "tiled";
  watermarkSpaceX: string;
  watermarkSpaceY: string;
  overlayPosition: "foreground" | "background";
  overlayRepeatLast: boolean;
};

async function embedOverlayFile(output: PDFDocument, file: File) {
  if (file.type.startsWith("image/") || /\.(png|jpe?g)$/i.test(file.name)) {
    const bytes = await file.arrayBuffer();
    const image = file.type === "image/png" || file.name.toLowerCase().endsWith(".png")
      ? await output.embedPng(bytes)
      : await output.embedJpg(bytes);
    return { kind: "image" as const, items: [image] as const };
  }
  const overlay = await loadPdf(file);
  const pages = await Promise.all(overlay.getPageIndices().map((index) => output.embedPage(overlay.getPage(index))));
  return { kind: "pdf" as const, items: pages };
}

async function transformPdf(tool: Tool, files: LocalFile[], options: WorkspaceOptions, openPassword = "") {
  const input = files[0]?.file;
  if (tool.operation === "text-pdf") return textToPdf(options.text || "PaperPilot document");
  if (tool.operation === "images-to-pdf") return imageToPdf(files.map((item) => item.file));
  if (!input) throw new Error("请先选择文件");
  if (tool.operation === "password") {
    const form = new FormData();
    form.append("file", input, input.name);
    form.append("password", openPassword || options.text || "");
    const response = await fetch(tool.slug === "unlock-pdf" ? "/api/unlock-pdf" : "/api/protect-pdf", { method: "POST", body: form });
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(payload?.error || (tool.slug === "unlock-pdf" ? "PDF 解除保护失败" : "PDF 保护失败"));
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  if (tool.operation === "merge") {
    const output = await PDFDocument.create({ updateMetadata: false });
    for (const item of files) { const source = await loadPdf(item.file); const pages = await output.copyPages(source, source.getPageIndices()); pages.forEach((page) => output.addPage(page)); }
    return savePdf(output);
  }

  const source = await loadPdf(input);
  const pageCount = source.getPageCount();
  const indexes = parsePages(options.pages || `1-${pageCount}`, pageCount);
  if (["split", "extract-pages", "remove-pages", "rearrange"].includes(tool.operation)) {
    const selected = tool.operation === "remove-pages" ? source.getPageIndices().filter((page) => !indexes.includes(page)) : indexes.length ? indexes : source.getPageIndices();
    const output = await PDFDocument.create({ updateMetadata: false });
    const pages = await output.copyPages(source, selected);
    pages.forEach((page) => output.addPage(page));
    return savePdf(output);
  }
  if (tool.operation === "overlay" && files[1]) {
    const output = await PDFDocument.create({ updateMetadata: false });
    const basePages = await Promise.all(source.getPageIndices().map((index) => output.embedPage(source.getPage(index))));
      const overlay = await embedOverlayFile(output, files[1].file);
      basePages.forEach((basePage, index) => {
        const page = output.addPage([basePage.width, basePage.height]);
        const overlayIndex = index < overlay.items.length ? index : options.overlayRepeatLast ? overlay.items.length - 1 : -1;
        const drawOverlay = () => {
          if (overlayIndex < 0) return;
          const item = overlay.items[overlayIndex];
          if (!item) return;
          if (overlay.kind === "pdf") page.drawPage(item as Awaited<ReturnType<typeof output.embedPage>>, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
          else {
            const image = item as Awaited<ReturnType<typeof output.embedPng>> | Awaited<ReturnType<typeof output.embedJpg>>;
            page.drawImage(image, {
              x: (page.getWidth() - image.width) / 2,
              y: (page.getHeight() - image.height) / 2,
              width: image.width,
              height: image.height,
            });
          }
        };
      if (options.overlayPosition === "background") drawOverlay();
      page.drawPage(basePage, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
      if (options.overlayPosition === "foreground") drawOverlay();
    });
    return savePdf(output);
  }
  if (tool.operation === "pages-per-sheet") {
    const output = await PDFDocument.create({ updateMetadata: false });
    const embeddedPages = await Promise.all(source.getPageIndices().map((index) => output.embedPage(source.getPage(index))));
    const requestedCount = Number(options.pagesPerSheet) || 2;
    const columns = requestedCount === 4 ? 2 : requestedCount;
    const rows = Math.ceil(requestedCount / columns);
    const baseSize = options.pageSize === "letter" ? PageSizes.Letter : PageSizes.A4;
    const [sheetWidth, sheetHeight] = baseSize;
    const margin = Math.max(0, Math.min(25, Number(options.pageMargin) || 0)) / 100 * Math.min(sheetWidth, sheetHeight);
    const gap = margin;
    const cellWidth = (sheetWidth - margin * 2 - gap * (columns - 1)) / columns;
    const cellHeight = (sheetHeight - margin * 2 - gap * (rows - 1)) / rows;
    for (let start = 0; start < embeddedPages.length; start += requestedCount) {
      const page = output.addPage([sheetWidth, sheetHeight]);
      for (let offset = 0; offset < requestedCount; offset += 1) {
        const embedded = embeddedPages[start + offset];
        if (!embedded) continue;
        const logicalColumn = offset % columns;
        const column = options.pageDirection === "rtl" ? columns - logicalColumn - 1 : logicalColumn;
        const row = Math.floor(offset / columns);
        const scale = Math.min(cellWidth / embedded.width, cellHeight / embedded.height);
        const width = embedded.width * scale;
        const height = embedded.height * scale;
        const x = margin + column * (cellWidth + gap) + (cellWidth - width) / 2;
        const y = sheetHeight - margin - (row + 1) * cellHeight - row * gap + (cellHeight - height) / 2;
        page.drawPage(embedded, { x, y, width, height });
        if (options.addBorder) page.drawRectangle({ x: margin + column * (cellWidth + gap), y: sheetHeight - margin - (row + 1) * cellHeight - row * gap, width: cellWidth, height: cellHeight, borderColor: rgb(.55, .58, .63), borderWidth: .7 });
      }
    }
    return savePdf(output);
  }
  if (["rotate", "watermark", "page-numbers", "metadata", "page-size", "crop", "compress"].includes(tool.operation)) {
  const output = await PDFDocument.create({ updateMetadata: false });
  if (tool.operation === "watermark") {
      const fontkitModule = await import("@pdf-lib/fontkit");
      output.registerFontkit((fontkitModule as any).default ?? fontkitModule);
  }
  const pages = await output.copyPages(source, source.getPageIndices());
  let watermarkFont = null as Awaited<ReturnType<typeof output.embedFont>> | null;
  if (tool.operation === "watermark") {
      const fontBytes = await loadChineseWatermarkFont();
      watermarkFont = await output.embedFont(fontBytes, { subset: false });
  }
    for (const [index, page] of pages.entries()) {
      const next = output.addPage(page);
      if (tool.operation === "rotate") next.setRotation(degrees(Number(options.angle) || 90));
      if (tool.operation === "watermark" && watermarkFont) {
        const text = options.watermark.trim() || "PaperPilot";
        const size = Math.max(8, Number(options.watermarkSize) || 40);
        const opacity = Math.max(0, Math.min(1, Number(options.watermarkOpacity) || .35));
        const color = options.watermarkColor.replace("#", "");
        const red = Number.parseInt(color.slice(0, 2), 16) / 255;
        const green = Number.parseInt(color.slice(2, 4), 16) / 255;
        const blue = Number.parseInt(color.slice(4, 6), 16) / 255;
        const angle = Number(options.angle) || -45;
        const mmToPt = (value: number) => Math.max(20, value * 2.8346457);
        const xGap = mmToPt(Number(options.watermarkSpaceX) || 5);
        const yGap = mmToPt(Number(options.watermarkSpaceY) || 5);
        const drawWatermark = (x: number, y: number) => next.drawText(text, { x, y, size, font: watermarkFont, rotate: degrees(angle), opacity, color: rgb(red, green, blue) });
        if (options.watermarkPosition === "tiled") {
          for (let y = -yGap; y < next.getHeight() + yGap; y += yGap) {
            for (let x = -xGap; x < next.getWidth() + xGap; x += xGap) drawWatermark(x, y);
          }
        } else {
          const width = next.getWidth();
          const height = next.getHeight();
          const placements = {
            "top-left": [36, height - 54],
            top: [width / 2 - 120, height - 54],
            "top-right": [width - 220, height - 54],
            left: [36, height / 2],
            center: [width / 2 - 120, height / 2],
            right: [width - 220, height / 2],
            "bottom-left": [36, 36],
            bottom: [width / 2 - 120, 36],
            "bottom-right": [width - 220, 36],
          } as const;
          const [x, y] = placements[options.watermarkPosition];
          drawWatermark(x, y);
        }
      }
      if (tool.operation === "page-numbers") next.drawText(`${index + 1} / ${pageCount}`, { x: next.getWidth() / 2 - 20, y: 24, size: 10, color: rgb(.3, .35, .45) });
      if (tool.operation === "page-size") { const size = options.pageSize === "letter" ? PageSizes.Letter : PageSizes.A4; next.setSize(size[0], size[1]); }
      if (tool.operation === "crop") next.setCropBox(20, 20, Math.max(20, next.getWidth() - 40), Math.max(20, next.getHeight() - 40));
    }
    if (tool.operation === "metadata") {
      output.setTitle(options.metadata.trim());
      output.setAuthor(options.metadataAuthor.trim());
      output.setSubject(options.metadataSubject.trim());
      output.setKeywords(options.metadataKeywords.split(",").map((keyword) => keyword.trim()).filter(Boolean));
    }
    return savePdf(output);
  }
  throw new Error("该工具需要服务器端文档转换组件，目前工作区已就绪，正在等待部署转换 worker。");
}

export function ToolWorkspace({ tool, locale }: { tool: Tool; locale: Locale }) {
  const t = workspaceT(locale);
  const inputRef = useRef<HTMLInputElement>(null);
  const downloadUrlRef = useRef<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; name: string; detail?: string } | null>(null);
  const initialFormat = tool.formatHint === "word" ? "docx" : tool.formatHint === "powerpoint" ? "pptx" : tool.formatHint === "excel" ? "xlsx" : tool.formatHint || "txt";
  const watermarkDefaults: Record<Locale, string> = { en: "Confidential", de: "Vertraulich", fr: "Confidentiel", nl: "Vertrouwelijk", ja: "機密", ko: "기밀", zh: "机密", ru: "Конфиденциально" };
  const [options, setOptions] = useState<WorkspaceOptions>({
    pages: "",
    angle: "-45",
    watermark: watermarkDefaults[locale],
    pageSize: "a4",
    pagesPerSheet: "2",
    pageMargin: "0",
    pageDirection: "ltr",
    addBorder: false,
    metadata: "",
    metadataAuthor: "",
    metadataSubject: "",
    metadataKeywords: "",
    text: "",
    dpi: "144",
    quality: "75",
    format: initialFormat,
    mode: "flow",
    watermarkFont: "Helvetica",
    watermarkBold: false,
    watermarkItalic: false,
    watermarkSize: "40",
    watermarkOpacity: "0.4",
    watermarkColor: "#f28a16",
    watermarkPosition: "top-right",
    watermarkSpaceX: "5",
    watermarkSpaceY: "5",
    overlayPosition: "foreground",
    overlayRepeatLast: true,
  });
  const [openPassword, setOpenPassword] = useState("");
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const baseInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const [overlayBaseFile, setOverlayBaseFile] = useState<LocalFile | null>(null);
  const [overlayAssetFile, setOverlayAssetFile] = useState<LocalFile | null>(null);
  const [overlayDragging, setOverlayDragging] = useState<OverlaySlot | null>(null);
  const [permissions, setPermissions] = useState({
    contentModify: true,
    comments: true,
    print: true,
    highQualityPrint: true,
    combine: true,
    fillForms: true,
    copy: true,
    copyForAccessibility: true,
  });
  const [webpageUrl, setWebpageUrl] = useState("");
  useEffect(() => {
    if (tool.operation !== "metadata" || !files[0]) return;
    let cancelled = false;
    void loadPdf(files[0].file).then((document) => {
      if (cancelled) return;
      const keywords = document.getKeywords();
      setOptions((current) => ({
        ...current,
        metadata: document.getTitle() || "",
        metadataAuthor: document.getAuthor() || "",
        metadataSubject: document.getSubject() || "",
        metadataKeywords: Array.isArray(keywords) ? keywords.join(", ") : keywords || "",
      }));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [files, tool.operation]);
  const permissionEntries = [
    { key: "contentModify", label: t.permissionLabels[0] },
    { key: "comments", label: t.permissionLabels[1] },
    { key: "print", label: t.permissionLabels[2] },
    { key: "highQualityPrint", label: t.permissionLabels[3] },
    { key: "combine", label: t.permissionLabels[4] },
    { key: "fillForms", label: t.permissionLabels[5] },
    { key: "copy", label: t.permissionLabels[6] },
    { key: "copyForAccessibility", label: t.permissionLabels[7] },
  ] as const;
  const accepts = tool.operation === "images-to-pdf" || tool.operation === "image-convert" ? "image/*" : tool.operation === "convert-to-pdf" ? ".doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.ods,.odp,.txt,.rtf,.epub,.md,.html,image/*" : ".pdf";
  const webpageTool = tool.operation === "webpage";
  const unlockTool = tool.slug === "unlock-pdf";
  const capability = capabilityForTool(tool);
  const unavailable = capability === "coming-soon" || capability === "worker-required";
  const disabled = webpageTool ? busy || !webpageUrl.trim() : (!files.length || busy || unavailable || (tool.operation === "password" && unlockTool && !openPassword.trim()));

  const clearDownload = () => {
    if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
    downloadUrlRef.current = null;
  };

  useEffect(() => () => clearDownload(), []);

  const publishDownload = async (bytes: Uint8Array, name: string, type = "application/pdf", detail?: string) => {
    clearDownload();
    const url = await downloadBytes(bytes, name, type);
    downloadUrlRef.current = url;
    setResult({ url, name, detail });
  };

  const setOption = (key: keyof typeof options, value: string) => setOptions((current) => ({ ...current, [key]: value }));
  const addFiles = (incoming: FileList | File[]) => {
    setError(""); setResult(null);
    const allowedToPdf = ["doc", "docx", "ppt", "pptx", "xls", "xlsx", "odt", "ods", "odp", "txt", "rtf", "epub", "md", "html"];
    const added = Array.from(incoming).filter((file) => {
      if (tool.operation === "convert-to-pdf") return file.type.startsWith("image/") || allowedToPdf.some((extension) => file.name.toLowerCase().endsWith(`.${extension}`));
      return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf") || (tool.operation === "image-convert" && file.type.startsWith("image/"));
    });
    setFiles((current) => [...current, ...added.map((file) => ({ id: `${file.name}-${file.size}-${crypto.randomUUID()}`, file }))]);
  };
  const remove = (id: string) => setFiles((current) => current.filter((file) => file.id !== id));
  const move = (id: string, direction: -1 | 1) => setFiles((current) => { const index = current.findIndex((file) => file.id === id); const next = index + direction; if (index < 0 || next < 0 || next >= current.length) return current; const copy = [...current]; [copy[index], copy[next]] = [copy[next], copy[index]]; return copy; });
  const setOverlayFile = (slot: OverlaySlot, incoming: FileList | File[]) => {
    const file = Array.from(incoming).find((item) => {
      if (slot === "base") return item.type === "application/pdf" || item.name.toLowerCase().endsWith(".pdf");
      return item.type === "application/pdf" || item.type.startsWith("image/") || /\.(pdf|png|jpe?g)$/i.test(item.name);
    });
    if (!file) return;
    setError(""); setResult(null);
    const nextFile = { id: `${slot}-${file.name}-${file.size}-${crypto.randomUUID()}`, file };
    if (slot === "base") setOverlayBaseFile(nextFile);
    else setOverlayAssetFile(nextFile);
  };
  const run = async () => {
    setBusy(true); setError(""); clearDownload(); setResult(null);
    try {
      if (webpageTool) {
        const response = await fetch("/api/webpage-to-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: webpageUrl }) });
        if (!response.ok) {
          const payload = await response.json().catch(() => null) as { error?: string } | null;
          throw new Error(payload?.error || "网页转 PDF 失败");
        }
        await publishDownload(new Uint8Array(await response.arrayBuffer()), "webpage.pdf");
        return;
      }
      if (tool.operation === "compress") {
        const output = await compressPdf(files[0].file, Number(options.dpi) || 144, Number(options.quality) || 75);
        const reduction = output.inputBytes > 0 ? ((1 - output.outputBytes / output.inputBytes) * 100) : 0;
        await publishDownload(output.bytes, output.name, "application/pdf", compressionDetail(locale, output.inputBytes, output.outputBytes, reduction, output.dpi, output.quality));
        return;
      }
      if (tool.operation === "pdf-to-images") { const output = await pdfToImages(files[0].file); await publishDownload(output.bytes, output.name, output.type); return; }
      if (tool.operation === "image-convert") { const target = tool.slug.endsWith("-png") ? "png" : "jpg"; const output = await convertImage(files[0].file, target); await publishDownload(output.bytes, output.name, output.type); return; }
      if (tool.operation === "convert-to-pdf") { const output = await convertToPdf(files[0].file); await publishDownload(output, `${safeName(files[0].file.name)}.pdf`); return; }
      if (tool.operation === "convert-from-pdf") {
        const output = await convertPdfOutput(files[0].file, options.format, Number(options.dpi) || 144, Number(options.quality) || 85, options.mode);
        const detail = locale === "zh" ? (options.format === "docx"
          ? (options.mode === "flow" ? "服务端版式重建：文本和表格可编辑，复杂图形可能需要人工微调。" : "视觉保真模式：每页以高分辨率图像嵌入 Word，文字不可单独编辑。")
          : options.format === "pptx"
            ? "服务端版式重建：文字、常见线条和矩形均为独立 PowerPoint 对象，可直接选择和编辑。"
          : options.format === "epub"
            ? (options.mode === "fixed" ? "固定版式 EPUB：保留每页视觉效果，适合图文和表格；文字不可自由重排。" : options.mode === "pdf-flow" ? "分页 EPUB：保留 PDF 的页面顺序，并将文字转换为可调节字号的阅读内容。" : "流式 EPUB：提取正文、标题和章节，适合电子书阅读器自由调节字号与排版。")
          : options.format === "xlsx"
            ? "服务端表格重建：识别 PDF 网格并生成可编辑单元格、合并区域、填充色和边框；正文页面保留在独立工作表。"
          : undefined) : options.format === "docx" ? (options.mode === "flow" ? "Server layout reconstruction: text and tables remain editable." : "Visual fidelity mode: each page is embedded as a high-resolution image.")
          : options.format === "pptx" ? "Server layout reconstruction: text and common shapes remain editable."
          : options.format === "epub" ? "The EPUB has been generated with the selected layout mode."
          : options.format === "xlsx" ? "Server table reconstruction: detected grids are converted into editable cells."
          : undefined;
        await publishDownload(output.bytes, output.name, output.type, detail);
        return;
      }
      const processingFiles = tool.operation === "overlay" && overlayBaseFile && overlayAssetFile ? [overlayBaseFile, overlayAssetFile] : files;
      const bytes = await transformPdf(tool, processingFiles, options, openPassword); const name = `${safeName(tool.enLabel)}.pdf`; await publishDownload(bytes, name);
    }
    catch (err) { setError(visibleError(err, t.processFailed, t)); }
    finally { setBusy(false); }
  };
  const passwordDialog = permissionsOpen && tool.operation === "password" && typeof document !== "undefined" ? createPortal(
    <div className="password-permissions-overlay" role="presentation" onMouseDown={() => setPermissionsOpen(false)}>
      <section className="password-permissions-dialog" role="dialog" aria-modal="true" aria-labelledby="permission-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div><h2 id="permission-dialog-title">{t.moreOptions}</h2></div>
          <button type="button" className="password-permissions-close" aria-label={t.closePermissions} onClick={() => setPermissionsOpen(false)}>×</button>
        </header>
        <div className="password-permissions-list">
          {permissionEntries.map((item) => <label className="password-permissions-item" key={item.key}><span>{item.label}</span><input type="checkbox" checked={permissions[item.key]} onChange={(event) => setPermissions((current) => ({ ...current, [item.key]: event.target.checked }))} /></label>)}
        </div>
      </section>
    </div>,
    document.body,
  ) : null;

  const optionPanel = useMemo(() => {
    if (webpageTool) return <div className="option-panel webpage-option-panel"><label className="field wide-field webpage-url-field"><span className="webpage-title">{t.webpageUrl}</span><input value={webpageUrl} onChange={(event) => setWebpageUrl(event.target.value)} placeholder="https://www.example.com" /></label><p className="webpage-note">{t.webpageNote}</p></div>;
    if (["split", "extract-pages", "remove-pages", "rearrange"].includes(tool.operation)) return <div className="option-panel"><label className="field wide-field">{t.pageRange}<input value={options.pages} onChange={(event) => setOption("pages", event.target.value)} placeholder={t.pageRangePlaceholder} /></label></div>;
    if (tool.operation === "rotate") return <div className="option-panel"><label className="field">{t.rotateAngle}<select value={options.angle} onChange={(event) => setOption("angle", event.target.value)}><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select></label></div>;
    if (tool.operation === "watermark") return <div className="option-panel watermark-panel">
      <label className="field watermark-text"><span>{t.text}</span><input value={options.watermark} onChange={(event) => setOption("watermark", event.target.value)} placeholder="Confidential" /></label>
      <label className="field watermark-font"><span>{t.font}</span><select value={options.watermarkFont} onChange={(event) => setOption("watermarkFont", event.target.value)}><option value="Helvetica">Sans</option><option value="Helvetica-Bold">Sans Bold</option><option value="Helvetica-Oblique">Sans Italic</option><option value="Times-Roman">Serif</option><option value="Courier">Mono</option></select></label>
      <div className="watermark-switches"><span className="watermark-switch-label">{t.style}</span><div className="watermark-switch-row"><button type="button" className={`watermark-switch ${options.watermarkBold ? "active" : ""}`} onClick={() => setOptions((current) => ({ ...current, watermarkBold: !current.watermarkBold }))}>B</button><button type="button" className={`watermark-switch ${options.watermarkItalic ? "active" : ""}`} onClick={() => setOptions((current) => ({ ...current, watermarkItalic: !current.watermarkItalic }))}><span className="watermark-italic-glyph">I</span></button></div></div>
      <label className="field watermark-size"><span>{t.fontSize}</span><input type="number" min="8" max="120" value={options.watermarkSize} onChange={(event) => setOption("watermarkSize", event.target.value)} /></label>
      <label className="field watermark-color"><span>{t.colorOpacity}</span><div className="watermark-color-row"><input type="color" value={options.watermarkColor} onChange={(event) => setOption("watermarkColor", event.target.value)} /><input type="number" min="0" max="1" step="0.05" value={options.watermarkOpacity} onChange={(event) => setOption("watermarkOpacity", event.target.value)} /></div></label>
      <label className="field watermark-position"><span>{t.position}</span><select value={options.watermarkPosition} onChange={(event) => setOption("watermarkPosition", event.target.value as WorkspaceOptions["watermarkPosition"])}><option value="top-left">{t.topLeft}</option><option value="top">{t.top}</option><option value="top-right">{t.topRight}</option><option value="left">{t.left}</option><option value="center">{t.center}</option><option value="right">{t.right}</option><option value="bottom-left">{t.bottomLeft}</option><option value="bottom">{t.bottom}</option><option value="bottom-right">{t.bottomRight}</option><option value="tiled">{t.tiled}</option></select></label>
      <label className="field watermark-angle"><span>{t.angle}</span><input type="number" min="-180" max="180" value={options.angle} onChange={(event) => setOption("angle", event.target.value)} /></label>
      <label className="field watermark-space"><span>{t.space}</span><div className="watermark-space-row"><input type="number" min="20" max="500" value={options.watermarkSpaceX} onChange={(event) => setOption("watermarkSpaceX", event.target.value)} /><input type="number" min="20" max="500" value={options.watermarkSpaceY} onChange={(event) => setOption("watermarkSpaceY", event.target.value)} /><span>mm</span></div></label>
    </div>;
    if (tool.operation === "pages-per-sheet") return <div className="option-panel nup-options"><label className="nup-control"><span>每页页面数</span><select value={options.pagesPerSheet} onChange={(event) => setOption("pagesPerSheet", event.target.value)}><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="6">6</option></select></label><label className="nup-control"><span>页面尺寸</span><select value={options.pageSize} onChange={(event) => setOption("pageSize", event.target.value)}><option value="a4">A4</option><option value="letter">Letter</option></select></label><label className="nup-control"><span>页边距</span><span className="nup-unit-input"><input type="number" min="0" max="25" value={options.pageMargin} onChange={(event) => setOption("pageMargin", event.target.value)} /><b>%</b></span></label><label className="nup-control"><span>方向</span><select value={options.pageDirection} onChange={(event) => setOption("pageDirection", event.target.value as WorkspaceOptions["pageDirection"])}><option value="ltr">LTR</option><option value="rtl">RTL</option></select></label><label className="nup-check"><input type="checkbox" checked={options.addBorder} onChange={(event) => setOptions((current) => ({ ...current, addBorder: event.target.checked }))} /><span>添加边框</span></label></div>;
    if (tool.operation === "page-size") return <div className="option-panel"><label className="field">{t.targetSize}<select value={options.pageSize} onChange={(event) => setOption("pageSize", event.target.value)}><option value="a4">A4</option><option value="letter">Letter</option></select></label></div>;
    if (tool.operation === "metadata") return <div className="option-panel metadata-panel"><label className="field wide-field">标题<input value={options.metadata} onChange={(event) => setOption("metadata", event.target.value)} /></label><label className="field wide-field">作者<input value={options.metadataAuthor} onChange={(event) => setOption("metadataAuthor", event.target.value)} /></label><label className="field wide-field">主题元数据<input value={options.metadataSubject} onChange={(event) => setOption("metadataSubject", event.target.value)} /></label><label className="field wide-field">关键字<input value={options.metadataKeywords} onChange={(event) => setOption("metadataKeywords", event.target.value)} placeholder="多个关键字用逗号分隔" /></label></div>;
    if (tool.operation === "compress") return <div className="option-panel"><label className="field">{t.renderDpi}<input type="number" min="48" max="216" step="1" value={options.dpi} onChange={(event) => setOption("dpi", event.target.value)} /></label><label className="field">{t.jpegQuality}<input type="number" min="25" max="100" step="1" value={options.quality} onChange={(event) => setOption("quality", event.target.value)} /></label><div className="field"><strong>{t.compressionMode}</strong><span>{t.compressionHint}</span></div></div>;
    if (tool.operation === "convert-from-pdf") {
      const format = options.format;
      const modes = format === "epub" ? ["fixed", "flow", "pdf-flow"] : ["blocks", "flow"];
      return <div className="option-panel converter-options"><label className="field">{t.format}<select aria-label={t.format} value={format} onChange={(event) => setOption("format", event.target.value)}><optgroup label="Text"><option value="txt">Text (.txt)</option><option value="rtf">Rich Text (.rtf)</option><option value="html">HTML (.html)</option></optgroup><optgroup label="Microsoft Office"><option value="docx">Word (.docx)</option><option value="pptx">PowerPoint (.pptx)</option><option value="xlsx">Excel (.xlsx)</option></optgroup><optgroup label="Images"><option value="png">PNG (.png)</option><option value="jpg">JPG (.jpg)</option></optgroup><optgroup label="Other"><option value="epub">EPUB (.epub)</option></optgroup></select></label>{!['png','jpg','html'].includes(format) && <label className="field">{t.mode}<select aria-label={t.mode} value={options.mode} onChange={(event) => setOption("mode", event.target.value)}>{modes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select></label>}{['png','jpg'].includes(format) && <label className="field">{t.dpi}<input type="number" min="48" max="300" value={options.dpi} onChange={(event) => setOption("dpi", event.target.value)} /></label>}{format === "jpg" && <label className="field">{t.imageQuality}<input type="number" min="25" max="100" value={options.quality} onChange={(event) => setOption("quality", event.target.value)} /></label>}</div>;
    }
    if (tool.operation === "convert-to-pdf") return <div className="option-panel"><div className="field wide-field"><strong>{t.convertToPdf}</strong><span>{t.convertToPdfHint}</span></div></div>;
    if (tool.operation === "text-pdf") return <div className="option-panel"><label className="field wide-field">{t.documentContent}<textarea value={options.text} onChange={(event) => setOption("text", event.target.value)} placeholder={t.documentPlaceholder} /></label></div>;
    if (tool.operation === "password") return <div className="option-panel password-panel"><label className="field wide-field password-field"><span className="password-label-row"><strong>{unlockTool ? t.currentPassword : t.openPassword}</strong>{!unlockTool && <button type="button" className="password-gear-button" onClick={() => setPermissionsOpen(true)} aria-label={t.permissions}><span className="password-gear-icon" aria-hidden="true">⚙</span><span>{t.permissions}</span></button>}</span><input ref={unlockTool ? passwordInputRef : undefined} type="password" value={unlockTool ? openPassword : options.text} onChange={(event) => unlockTool ? setOpenPassword(event.target.value) : setOption("text", event.target.value)} placeholder={unlockTool ? t.currentPassword : t.openPassword} /></label></div>;
    if (["office", "ocr", "image-convert", "generic"].includes(tool.operation)) return <div className="option-panel"><div className="field wide-field"><strong>{t.browserReady}</strong><span>{t.browserReadyHint}</span></div></div>;
    return null;
  }, [options, tool.operation, webpageTool, webpageUrl, t, unlockTool]);

  if ((tool.operation === "edit" || tool.operation === "sign" || tool.operation === "redact") && files[0]) return <PdfEditor file={files[0].file} t={t} mode={tool.operation === "sign" ? "sign" : tool.operation === "redact" ? "redact" : "edit"} onReset={() => { setFiles([]); setError(""); }} />;
  if (tool.operation === "rearrange" && files[0]) return <ReorderPdfWorkspace file={files[0].file} t={t} onReset={() => { setFiles([]); setError(""); setResult(null); }} />;
  if (webpageTool) return <section className="workspace webpage-workspace" aria-label={`${tool.enLabel} workspace`}><div className="security-note"><ShieldCheck size={16} /> {t.webpageSecurity}</div>{optionPanel}{error && <div className="result-panel" style={{ background: "#fff0ef", color: "#b42318" }} role="alert">{error}</div>}<div className="workspace-tools"><div className="process-action"><button className="primary" disabled={disabled} onClick={run}>{busy ? <LoaderCircle size={17} className="spin" /> : <WandSparkles size={17} />} {busy ? t.generating : t.generate}</button><span className="process-note">{t.webpageProcessNote}</span></div></div>{result && <div className="result-panel"><span><LockKeyhole size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />{t.generated} {result.name}{result.detail && <small style={{ display: "block", marginTop: 5, opacity: .82 }}>{result.detail}</small>}</span><a href={result.url} download={result.name}><Download size={15} style={{ verticalAlign: "-3px", marginRight: 5 }} />{t.downloadAgain}</a></div>}</section>;
  if (tool.operation === "overlay") {
    const overlayDisabled = busy || !overlayBaseFile || !overlayAssetFile;
    const renderOverlaySlot = (slot: OverlaySlot) => {
      const item = slot === "base" ? overlayBaseFile : overlayAssetFile;
      const input = slot === "base" ? baseInputRef : overlayInputRef;
      const title = slot === "base" ? "文档" : "叠图 / 底图";
      const accept = slot === "base" ? ".pdf,application/pdf" : ".pdf,image/png,image/jpeg,application/pdf";
      return <div className={`overlay-slot ${overlayDragging === slot ? "dragging" : ""} ${item ? "has-file" : ""}`} onDragOver={(event) => { event.preventDefault(); setOverlayDragging(slot); }} onDragLeave={() => setOverlayDragging((current) => current === slot ? null : current)} onDrop={(event) => { event.preventDefault(); setOverlayDragging(null); setOverlayFile(slot, event.dataTransfer.files); }}>
        {!item ? <><strong>{title}</strong><button type="button" className="upload-button" onClick={() => input.current?.click()}><FilePlus2 size={18} /> {t.chooseFile}</button><small>{slot === "base" ? "上传需要处理的 PDF 文件" : "上传 PDF、PNG 或 JPG 作为叠加素材"}</small></> : <div className="overlay-file-card"><button type="button" className="overlay-remove" aria-label={t.remove} onClick={() => slot === "base" ? setOverlayBaseFile(null) : setOverlayAssetFile(null)}><Trash2 size={20} /></button><div className="overlay-file-icon">{item.file.type.startsWith("image/") ? <ImagePlus size={34} /> : <FileText size={34} />}</div><span>{item.file.name}</span><small>{formatSize(item.file.size)}</small></div>}
        <input ref={input} hidden type="file" accept={accept} onChange={(event) => { if (event.target.files) setOverlayFile(slot, event.target.files); event.currentTarget.value = ""; }} />
      </div>;
    };
    return <section className="workspace overlay-workspace" aria-label={`${tool.enLabel} workspace`}>
      <div className="security-note"><ShieldCheck size={16} /> {t.security}</div>
      <div className="overlay-dropgrid">{renderOverlaySlot("base")}{renderOverlaySlot("overlay")}</div>
      {(overlayBaseFile || overlayAssetFile) && <div className="overlay-controls">
        <div className="overlay-control-row"><span>位置</span><div className="segmented-control"><button type="button" className={options.overlayPosition === "background" ? "active" : ""} onClick={() => setOptions((current) => ({ ...current, overlayPosition: "background" }))}>背景</button><button type="button" className={options.overlayPosition === "foreground" ? "active" : ""} onClick={() => setOptions((current) => ({ ...current, overlayPosition: "foreground" }))}>前景</button></div></div>
        <label className="overlay-repeat"><span>重复最后一页</span><input type="checkbox" checked={options.overlayRepeatLast} onChange={(event) => setOptions((current) => ({ ...current, overlayRepeatLast: event.target.checked }))} /></label>
      </div>}
      {error && <div className="result-panel" style={{ background: "#fff0ef", color: "#b42318" }} role="alert">{error}</div>}
      <div className="workspace-tools"><div className="process-action"><button className="primary overlay-primary" disabled={overlayDisabled} onClick={run}>{busy ? <LoaderCircle size={17} className="spin" /> : <WandSparkles size={17} />} {busy ? t.processing : "结合"}</button><span className="process-note">选择文档和叠图后，可设置叠图在前景或背景。</span></div>{(overlayBaseFile || overlayAssetFile) && <button className="secondary workspace-clear" onClick={() => { setOverlayBaseFile(null); setOverlayAssetFile(null); clearDownload(); setResult(null); setError(""); }}><Trash2 size={16} /> {t.clear}</button>}</div>
      {result && <div className="result-panel"><span><LockKeyhole size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />{t.generated} {result.name}</span><a href={result.url}><Download size={15} style={{ verticalAlign: "-3px", marginRight: 5 }} />{t.downloadAgain}</a></div>}
    </section>;
  }

  return <section className="workspace" aria-label={`${tool.enLabel} workspace`}>
    <div className="security-note"><ShieldCheck size={16} /> {tool.operation === "password"
      ? locale === "zh" ? "文件将发送到临时服务器 Worker 处理，完成后立即清理" : "The file is sent to a temporary server worker and removed after processing"
      : t.security}</div>
    <div className={`dropzone ${dragging ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}>
      <Upload size={30} color="var(--blue)" />
      <button className="upload-button" onClick={() => inputRef.current?.click()}><FilePlus2 size={18} /> {t.chooseFile}</button>
      <small>{unlockTool ? t.dropSingle : t.dropMulti}</small>
      <input ref={inputRef} hidden type="file" multiple={tool.operation === "merge" || tool.operation === "images-to-pdf"} accept={accepts} onChange={(event) => { if (event.target.files) addFiles(event.target.files); }} />
    </div>
    {files.length > 0 && <div className="file-list">{files.map((item) => <div className="file-row" key={item.id}><FileText size={18} color="var(--blue)" /><div className="file-meta"><div className="file-name">{item.file.name}</div><div className="file-size">{formatSize(item.file.size)}</div></div><div className="file-actions"><button className="icon-button" title={t.moveUp} aria-label={t.moveUp} onClick={() => move(item.id, -1)}><MoveLeft size={16} /></button><button className="icon-button" title={t.moveDown} aria-label={t.moveDown} onClick={() => move(item.id, 1)}><MoveRight size={16} /></button><button className="icon-button" title={t.remove} aria-label={t.remove} onClick={() => remove(item.id)}><Trash2 size={16} /></button></div><GripVertical size={15} color="#a6b8cb" /></div>)}</div>}
    {unlockTool && files.length > 0 && <div className="password-workflow"><div className="password-field-inline"><input ref={passwordInputRef} type="password" value={openPassword} onChange={(event) => setOpenPassword(event.target.value)} placeholder={t.currentPassword} /></div></div>}
    {optionPanel}
    {error && <div className="result-panel" style={{ background: "#fff0ef", color: "#b42318" }} role="alert">{error}</div>}
    <div className="workspace-tools"><div className="process-action"><button className="primary" disabled={disabled} onClick={run}>{busy ? <LoaderCircle size={17} className="spin" /> : <WandSparkles size={17} />} {busy ? t.processing : unlockTool ? t.removePassword : t.start}</button><span className="process-note">{unlockTool ? t.unlockNote : tool.operation === "generic" ? t.genericNote : t.doneAuto}</span></div>{files.length > 0 && <button className="secondary workspace-clear" onClick={() => { setFiles([]); clearDownload(); setResult(null); setError(""); setOpenPassword(""); setPermissionsOpen(false); }}><Trash2 size={16} /> {t.clear}</button>}</div>
    {result && <div className="result-panel"><span><LockKeyhole size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />{t.generated} {result.name}{result.detail && <small style={{ display: "block", marginTop: 5, opacity: .82 }}>{result.detail}</small>}</span><a href={result.url}><Download size={15} style={{ verticalAlign: "-3px", marginRight: 5 }} />{t.downloadAgain}</a></div>}
    {passwordDialog}
  </section>;
}
