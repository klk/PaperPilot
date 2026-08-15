"use client";

import { PDFDict, PDFDocument, PDFName, PageSizes, rgb, StandardFonts } from "pdf-lib";
import { convertPdfOnServer } from "../../lib/client-worker-api";

export const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
export const safeName = (name: string) => name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").toLowerCase() || "paperpilot-file";

let watermarkFontPromise: Promise<Uint8Array> | null = null;
export function loadChineseWatermarkFont() {
  if (!watermarkFontPromise) {
    watermarkFontPromise = (async () => {
      const response = await fetch("/api/fonts/chinese-watermark");
      if (!response.ok) throw new Error("找不到可用的中文字体。");
      return new Uint8Array(await response.arrayBuffer());
    })();
  }
  return watermarkFontPromise;
}

export async function loadPdf(file: File) {
  return PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: false, updateMetadata: false });
}

export async function savePdf(document: PDFDocument, options: Parameters<PDFDocument["save"]>[0] = { useObjectStreams: true }) {
  const infoRef = document.context.trailerInfo.Info;
  const info = infoRef ? document.context.lookup(infoRef, PDFDict) : undefined;
  const isPdfLibAttribution = (value: string | undefined) => /pdf-lib|Hopding\/pdf-lib/i.test(value || "");
  if (info && isPdfLibAttribution(document.getProducer())) info.delete(PDFName.of("Producer"));
  if (info && isPdfLibAttribution(document.getCreator())) info.delete(PDFName.of("Creator"));
  return document.save(options);
}

export async function downloadBytes(bytes: Uint8Array, name: string, type = "application/pdf") {
  const blob = new Blob([bytes as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  return url;
}

export function parsePages(value: string, max: number) {
  const output: number[] = [];
  value.split(",").forEach((part) => {
    const [startText, endText] = part.trim().split("-");
    const start = Number(startText);
    const end = endText ? Number(endText) : start;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;
    for (let page = Math.max(1, start); page <= Math.min(max, end); page += 1) output.push(page - 1);
  });
  return [...new Set(output)];
}

export async function imageToPdf(files: File[]) {
  const output = await PDFDocument.create({ updateMetadata: false });
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const image = file.type === "image/png" ? await output.embedPng(bytes) : await output.embedJpg(bytes);
    const scale = Math.min(1, 560 / image.width, 760 / image.height);
    const page = output.addPage([Math.max(420, image.width * scale + 48), Math.max(560, image.height * scale + 48)]);
    page.drawImage(image, { x: 24, y: page.getHeight() - image.height * scale - 24, width: image.width * scale, height: image.height * scale });
  }
  return savePdf(output);
}

export async function textToPdf(text: string) {
  const output = await PDFDocument.create({ updateMetadata: false });
  const font = await output.embedFont(StandardFonts.Helvetica);
  const lines = text.split("\n");
  let page = output.addPage(PageSizes.A4);
  let y = page.getHeight() - 54;
  lines.forEach((line) => {
    if (y < 50) { page = output.addPage(PageSizes.A4); y = page.getHeight() - 54; }
    page.drawText(line.slice(0, 120), { x: 48, y, size: 12, font, color: rgb(.12, .16, .23) });
    y -= 20;
  });
  return savePdf(output);
}

async function getPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  return pdfjs;
}

async function renderCompressedPdf(documentProxy: { numPages: number; getPage: (pageNumber: number) => Promise<any> }, dpi: number, quality: number) {
  const output = await PDFDocument.create({ updateMetadata: false });
  const scale = Math.max(.5, Math.min(3, dpi / 72));
  const jpegQuality = Math.max(.25, Math.min(1, quality / 100));

  for (let index = 1; index <= documentProxy.numPages; index += 1) {
    const page = await documentProxy.getPage(index);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("当前浏览器无法创建压缩画布");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport, background: "#ffffff" }).promise;
    const imageBlob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("页面图像压缩失败")), "image/jpeg", jpegQuality));
    const image = await output.embedJpg(await imageBlob.arrayBuffer());
    const outputPage = output.addPage([viewport.width / scale, viewport.height / scale]);
    outputPage.drawImage(image, { x: 0, y: 0, width: outputPage.getWidth(), height: outputPage.getHeight() });
    page.cleanup?.();
  }

  return savePdf(output, { useObjectStreams: true, addDefaultPage: false });
}

export async function compressPdf(file: File, dpi: number, quality: number) {
  const pdfjs = await getPdfJs();
  const documentProxy = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const requestedDpi = Math.max(48, Math.min(216, dpi));
  const requestedQuality = Math.max(25, Math.min(100, quality));
  const candidates = [
    [requestedDpi, requestedQuality],
    [Math.min(requestedDpi, 96), Math.min(requestedQuality, 60)],
    [88, 56],
    [80, 52],
    [72, 45],
    [48, 30],
  ].filter((candidate, index, all) => all.findIndex((item) => item[0] === candidate[0] && item[1] === candidate[1]) === index);
  const targetRatio = .58;
  let best: { bytes: Uint8Array; dpi: number; quality: number; score: number } | null = null;

  for (const [candidateDpi, candidateQuality] of candidates) {
    const bytes = await renderCompressedPdf(documentProxy, candidateDpi, candidateQuality);
    if (bytes.byteLength < file.size) {
      const score = Math.abs(bytes.byteLength / file.size - targetRatio);
      if (!best || score < best.score) best = { bytes, dpi: candidateDpi, quality: candidateQuality, score };
    }
  }

  if (!best) throw new Error("PDF 压缩没有生成有效结果");
  if (best.bytes.byteLength >= file.size) throw new Error("这个 PDF 已经接近当前压缩方式的下限，未生成更大的文件。请尝试降低 DPI 或图片质量，或保留原文件。");
  return { bytes: best.bytes, name: `${safeName(file.name)}-compressed.pdf`, inputBytes: file.size, outputBytes: best.bytes.byteLength, pages: documentProxy.numPages, dpi: best.dpi, quality: best.quality };
}

export async function pdfToImages(file: File) {
  const pdfjs = await getPdfJs();
  const documentProxy = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (let index = 1; index <= documentProxy.numPages; index += 1) {
    const page = await documentProxy.getPage(index);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("当前浏览器无法创建图片画布");
    await page.render({ canvasContext: context, viewport }).promise;
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("图片生成失败")), "image/png"));
    zip.file(`page-${String(index).padStart(3, "0")}.png`, blob);
  }
  return { bytes: await zip.generateAsync({ type: "uint8array" }), name: `${safeName(file.name)}-images.zip`, type: "application/zip" };
}

async function pdfText(file: File) {
  const pdfjs = await getPdfJs();
  const documentProxy = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let index = 1; index <= documentProxy.numPages; index += 1) {
    const page = await documentProxy.getPage(index);
    const content = await page.getTextContent();
    const items = content.items.flatMap((item) => {
      if (!("str" in item) || !("transform" in item) || !item.str.trim()) return [];
      const textItem = item as { str: string; transform: number[]; height: number; width: number };
      return [{ text: textItem.str.replace(/\s+/g, " ").trim(), x: textItem.transform[4], y: textItem.transform[5], size: Math.abs(textItem.transform[0]) || textItem.height || 10, width: textItem.width }];
    });
    const lines: Array<{ y: number; size: number; items: typeof items }> = [];
    for (const item of items) {
      const line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= Math.max(2.5, item.size * .35));
      if (line) { line.items.push(item); line.y = (line.y + item.y) / 2; line.size = Math.max(line.size, item.size); }
      else lines.push({ y: item.y, size: item.size, items: [item] });
    }
    lines.sort((a, b) => b.y - a.y);
    const output: string[] = [];
    let previous: { y: number; size: number } | null = null;
    for (const line of lines) {
      line.items.sort((a, b) => a.x - b.x);
      let text = "";
      let previousItem: (typeof line.items)[number] | null = null;
      for (const item of line.items) {
        if (previousItem) {
          const gap = item.x - (previousItem.x + previousItem.width);
          const asciiBoundary = /[A-Za-z0-9]$/.test(previousItem.text) || /^[A-Za-z0-9]/.test(item.text);
          if (gap > Math.max(2, item.size * .42) && asciiBoundary) text += " ";
          else if (/\s$/.test(previousItem.text)) text += " ";
        }
        text += item.text;
        previousItem = item;
      }
      if (previous && previous.y - line.y > Math.max(14, line.size * 1.75) && output.length && output[output.length - 1] !== "") output.push("");
      output.push(text.trim());
      previous = line;
    }
    pages.push(output.join("\n").replace(/[ \t]+\n/g, "\n").trim());
  }
  return pages;
}

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" })[character] || character);
}

async function pdfToDocxText(file: File) {
  const pages = await pdfText(file);
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const paragraph = (line: string, pageBreak = false) => `<w:p><w:pPr><w:spacing w:after="120" w:line="360" w:lineRule="auto"/>${pageBreak ? '<w:rPr/><w:pageBreakBefore/>' : ""}</w:pPr>${line ? `<w:r><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:eastAsia="PingFang SC"/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r>` : ""}</w:p>`;
  const document = pages.flatMap((page, index) => page.split("\n").map((line, lineIndex) => paragraph(line, index > 0 && lineIndex === 0))).join("");
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.file("word/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:eastAsia="PingFang SC"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>`);
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${document}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`);
  zip.file("docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${escapeXml(file.name)}</dc:title><dc:creator>PaperPilot</dc:creator></cp:coreProperties>`);
  zip.file("docProps/app.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>PaperPilot</Application></Properties>`);
  return new Uint8Array(await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }));
}

async function pdfToDocxPages(file: File, dpi: number) {
  const pdfjs = await getPdfJs();
  const documentProxy = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const relationships: string[] = [];
  const paragraphs: string[] = [];
  const scale = Math.max(1, Math.min(2.25, dpi / 72));
  for (let index = 1; index <= documentProxy.numPages; index += 1) {
    const page = await documentProxy.getPage(index);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("当前浏览器无法创建 Word 页面图像");
    context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport, background: "#fff" }).promise;
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("页面渲染失败")), "image/png"));
    zip.file(`word/media/page-${index}.png`, blob);
    relationships.push(`<Relationship Id="rId${index}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/page-${index}.png"/>`);
    const imageWidth = 6858000;
    const imageHeight = Math.round(imageWidth * viewport.height / viewport.width);
    const pageBreak = index > 1 ? '<w:br w:type="page"/>' : "";
    paragraphs.push(`<w:p><w:r>${pageBreak}<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${imageWidth}" cy="${imageHeight}"/><wp:docPr id="${index}" name="PDF page ${index}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${index}" name="page-${index}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId${index}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${imageWidth}" cy="${imageHeight}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`);
    page.cleanup?.();
  }
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships.join("")}</Relationships>`);
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${paragraphs.join("")}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr></w:body></w:document>`);
  zip.file("docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${escapeXml(file.name)}</dc:title><dc:creator>PaperPilot</dc:creator></cp:coreProperties>`);
  zip.file("docProps/app.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>PaperPilot</Application></Properties>`);
  return new Uint8Array(await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }));
}

export async function convertPdfOutput(file: File, format: string, dpi: number, quality: number, mode: string) {
  const textFormats = ["txt", "html"];
  if (textFormats.includes(format)) {
    const pages = await pdfText(file);
    if (format === "txt") return { bytes: new TextEncoder().encode(`\uFEFF${pages.join("\n\n")}`), name: `${safeName(file.name)}.txt`, type: "text/plain" };
    const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeXml(file.name)}</title><style>body{font-family:system-ui;max-width:860px;margin:40px auto;line-height:1.7}section{margin-bottom:32px;page-break-after:always}h2{color:#60718a}</style></head><body>${pages.map((page, index) => `<section><h2>Page ${index + 1}</h2><p>${escapeXml(page).replace(/\n/g, "<br>")}</p></section>`).join("")}</body></html>`;
    return { bytes: new TextEncoder().encode(html), name: `${safeName(file.name)}.html`, type: "text/html" };
  }
  if (format === "docx") {
    if (mode === "flow") return convertPdfOnServer(file, "docx");
    return { bytes: await pdfToDocxPages(file, dpi), name: `${safeName(file.name)}.docx`, type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
  }
  if (format === "pptx") {
    const output = await convertPdfOnServer(file, "pptx");
    return { bytes: output.bytes, name: output.name, type: output.type };
  }
  if (format === "epub") {
    const output = await convertPdfOnServer(file, "epub", mode);
    return { bytes: output.bytes, name: output.name, type: output.type };
  }
  if (format === "xlsx") {
    const output = await convertPdfOnServer(file, "xlsx");
    return { bytes: output.bytes, name: output.name, type: output.type };
  }
  if (format === "rtf") {
    const output = await convertPdfOnServer(file, "rtf");
    return { bytes: output.bytes, name: output.name, type: output.type };
  }
  if (format === "png" || format === "jpg") {
    const pdfjs = await getPdfJs();
    const documentProxy = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const scale = Math.max(.5, Math.min(3, dpi / 72));
    for (let index = 1; index <= documentProxy.numPages; index += 1) {
      const page = await documentProxy.getPage(index);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("当前浏览器无法创建图片画布");
      context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: context, viewport, background: "#fff" }).promise;
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("图片生成失败")), format === "jpg" ? "image/jpeg" : "image/png", Math.max(.25, Math.min(1, quality / 100))));
      zip.file(`page-${String(index).padStart(3, "0")}.${format}`, blob);
    }
    return { bytes: await zip.generateAsync({ type: "uint8array" }), name: `${safeName(file.name)}-${format}.zip`, type: "application/zip" };
  }
  if (["odt", "odp", "ods"].includes(format)) return convertPdfOnServer(file, format);
  throw new Error("当前格式需要对应的转换引擎，暂不支持直接生成。");
}

export async function convertToPdf(file: File) {
  if (file.type.startsWith("image/")) return imageToPdf([file]);
  if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt") || file.name.toLowerCase().endsWith(".md") || file.name.toLowerCase().endsWith(".html")) return textToPdf(await file.text());
  throw new Error("Word、Excel、PowerPoint、OpenDocument 和 EPUB 需要启用 Office 转换 worker，目前图片、TXT、MD 和 HTML 可直接转换。");
}

export async function convertImage(file: File, target: "jpg" | "png") {
  if (file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic")) throw new Error("HEIC 需要额外的解码组件，请先转换为 JPG 或 PNG 后重试。");
  const image = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.width; canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器无法创建图片画布");
  context.drawImage(image, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("图片转换失败")), target === "jpg" ? "image/jpeg" : "image/png", .92));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), name: `${safeName(file.name)}.${target}`, type: target === "jpg" ? "image/jpeg" : "image/png" };
}

