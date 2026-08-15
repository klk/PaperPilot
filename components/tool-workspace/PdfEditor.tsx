"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { Check, Circle, Copy, Download, Eraser, FileText, ImagePlus, LoaderCircle, MousePointer2, MoveLeft, MoveRight, Pencil, PenLine, RotateCcw, Save, Shapes, ShieldCheck, Signature, Slash, Spline, Square, Star, Trash2, Triangle, Type, Undo2, Upload, X } from "lucide-react";
import { degrees, LineCapStyle, PDFDict, PDFDocument, PDFName, rgb, StandardFonts } from "pdf-lib";
import { workspaceT } from "./copy";

type Point = { x: number; y: number };
type EditorTool = "select" | "pencil" | "line" | "shape" | "text";
type ShapeKind = "rectangle" | "ellipse" | "triangle" | "star";
type EditorBase = { id: string; page: number; color: string; width: number; opacity: number; rotation: number };
type PathObject = EditorBase & { kind: "path"; points: Point[] };
type LineObject = EditorBase & { kind: "line"; start: Point; end: Point };
type ShapeObject = EditorBase & { kind: "shape"; shape: ShapeKind; x: number; y: number; objectWidth: number; objectHeight: number; fill: string; fillOpacity: number };
type TextObject = EditorBase & { kind: "text"; text: string; x: number; y: number; fontSize: number; bold: boolean };
type ImageObject = EditorBase & { kind: "image"; x: number; y: number; objectWidth: number; objectHeight: number; dataUrl: string; mimeType: "image/png" | "image/jpeg"; source?: "signature" };
type EditorObject = PathObject | LineObject | ShapeObject | TextObject | ImageObject;
type SavedSignature = { id: string; dataUrl: string; mimeType: "image/png" | "image/jpeg" };
type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type EditorAction = { type: "draw" | "move" | "resize" | "rotate"; id: string; start: Point; original: EditorObject; handle?: ResizeHandle };
type ObjectBounds = { x: number; y: number; width: number; height: number };

const EDITOR_SIZE = 1000;
const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const safeName = (name: string) => name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").toLowerCase() || "paperpilot-file";
function visibleError(reason: unknown, fallback: string) { return reason instanceof Error && reason.message ? reason.message : fallback; }
async function getPdfJs() { const pdfjs = await import("pdfjs-dist"); pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString(); return pdfjs; }
async function loadPdf(file: File) { return PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false }); }
async function savePdf(document: PDFDocument) { return document.save({ useObjectStreams: true, addDefaultPage: false, updateFieldAppearances: false }); }
async function downloadBytes(bytes: Uint8Array, name: string) { const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; document.body.appendChild(anchor); anchor.click(); anchor.remove(); return url; }

function hexToPdfColor(value: string) {
  const source = value.replace("#", "");
  const expanded = source.length === 3 ? source.split("").map((item) => `${item}${item}`).join("") : source;
  const integer = Number.parseInt(expanded, 16);
  return rgb(((integer >> 16) & 255) / 255, ((integer >> 8) & 255) / 255, (integer & 255) / 255);
}

const limit = (value: number, minimum = 0, maximum = EDITOR_SIZE) => Math.max(minimum, Math.min(maximum, value));
const toPdfX = (value: number, width: number) => value / EDITOR_SIZE * width;
const toPdfY = (value: number, height: number) => height - value / EDITOR_SIZE * height;
const objectStrokeWidth = (value: number, pageWidth: number) => Math.max(.6, value / EDITOR_SIZE * pageWidth);

function starPoints(x: number, y: number, width: number, height: number) {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const points: Point[] = [];
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? .5 : .21;
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    points.push({ x: centerX + Math.cos(angle) * width * radius, y: centerY + Math.sin(angle) * height * radius });
  }
  return points;
}

function trianglePoints(x: number, y: number, width: number, height: number) {
  return [{ x: x + width / 2, y }, { x: x + width, y: y + height }, { x, y: y + height }];
}

function objectBounds(object: EditorObject): ObjectBounds {
  if (object.kind === "shape" || object.kind === "image") return { x: object.x, y: object.y, width: object.objectWidth, height: object.objectHeight };
  if (object.kind === "text") return { x: object.x, y: object.y, width: Math.max(80, object.text.length * object.fontSize * .62), height: object.fontSize * 1.25 };
  const points = object.kind === "path" ? object.points : [object.start, object.end];
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const padding = object.width * 1.8;
  return { x: Math.min(...xs) - padding, y: Math.min(...ys) - padding, width: Math.max(padding * 2, Math.max(...xs) - Math.min(...xs) + padding * 2), height: Math.max(padding * 2, Math.max(...ys) - Math.min(...ys) + padding * 2) };
}

function moveObject(object: EditorObject, dx: number, dy: number): EditorObject {
  if (object.kind === "path") return { ...object, points: object.points.map((point) => ({ x: limit(point.x + dx), y: limit(point.y + dy) })) };
  if (object.kind === "line") return { ...object, start: { x: limit(object.start.x + dx), y: limit(object.start.y + dy) }, end: { x: limit(object.end.x + dx), y: limit(object.end.y + dy) } };
  if (object.kind === "shape" || object.kind === "image") return { ...object, x: limit(object.x + dx, 0, EDITOR_SIZE - object.objectWidth), y: limit(object.y + dy, 0, EDITOR_SIZE - object.objectHeight) };
  return { ...object, x: limit(object.x + dx), y: limit(object.y + dy) };
}

function rotatePoint(point: Point, center: Point, radians: number, aspect = 1): Point {
  const safeAspect = Math.max(.001, aspect);
  const x = (point.x - center.x) * safeAspect;
  const y = point.y - center.y;
  return { x: center.x + (x * Math.cos(radians) - y * Math.sin(radians)) / safeAspect, y: center.y + x * Math.sin(radians) + y * Math.cos(radians) };
}

function rotationTransform(rotation: number, center: Point, aspect: number) {
  if (!rotation) return undefined;
  const radians = rotation * Math.PI / 180;
  const safeAspect = Math.max(.001, aspect);
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const a = cosine;
  const b = sine * safeAspect;
  const c = -sine / safeAspect;
  const d = cosine;
  const e = center.x - a * center.x - c * center.y;
  const f = center.y - b * center.x - d * center.y;
  return `matrix(${a} ${b} ${c} ${d} ${e} ${f})`;
}

function rotateObject(object: EditorObject, radians: number): EditorObject {
  return { ...object, rotation: object.rotation + radians * 180 / Math.PI };
}

function resizeObject(object: EditorObject, point: Point, handle: ResizeHandle, aspect: number): EditorObject {
  const bounds = objectBounds(object);
  const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const localPoint = rotatePoint(point, center, -(object.rotation * Math.PI / 180), aspect);
  const right = bounds.x + bounds.width;
  const bottom = bounds.y + bounds.height;
  let nextX = bounds.x;
  let nextY = bounds.y;
  let nextWidth = bounds.width;
  let nextHeight = bounds.height;
  if (handle.includes("e")) nextWidth = Math.max(24, localPoint.x - bounds.x);
  if (handle.includes("w")) { nextX = Math.min(localPoint.x, right - 24); nextWidth = Math.max(24, right - nextX); }
  if (handle.includes("s")) nextHeight = Math.max(24, localPoint.y - bounds.y);
  if (handle.includes("n")) { nextY = Math.min(localPoint.y, bottom - 24); nextHeight = Math.max(24, bottom - nextY); }
  if (["nw", "ne", "se", "sw"].includes(handle)) {
    const scale = Math.max(nextWidth / Math.max(1, bounds.width), nextHeight / Math.max(1, bounds.height));
    nextWidth = Math.max(24, bounds.width * scale);
    nextHeight = Math.max(24, bounds.height * scale);
    if (handle.includes("w")) nextX = right - nextWidth;
    if (handle.includes("n")) nextY = bottom - nextHeight;
  }
  const scaleX = nextWidth / Math.max(1, bounds.width);
  const scaleY = nextHeight / Math.max(1, bounds.height);
  const scalePoint = (value: Point) => ({ x: nextX + (value.x - bounds.x) * scaleX, y: nextY + (value.y - bounds.y) * scaleY });
  if (object.kind === "path") return { ...object, points: object.points.map(scalePoint) };
  if (object.kind === "line") return { ...object, start: scalePoint(object.start), end: scalePoint(object.end) };
  if (object.kind === "shape" || object.kind === "image") return { ...object, x: nextX, y: nextY, objectWidth: nextWidth, objectHeight: nextHeight };
  return { ...object, x: nextX, y: nextY, fontSize: Math.max(18, object.fontSize * Math.max(scaleX, scaleY)) };
}

function svgPoints(points: Point[]) { return points.map((point) => `${point.x},${point.y}`).join(" "); }

function trimSignatureCanvas(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法读取签名画布");
  const source = context.getImageData(0, 0, canvas.width, canvas.height);
  let left = canvas.width;
  let top = canvas.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
    if (source.data[(y * canvas.width + x) * 4 + 3] < 12) continue;
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  if (right < left || bottom < top) throw new Error("请先在签名区域内签名");
  const padding = 24;
  left = Math.max(0, left - padding); top = Math.max(0, top - padding);
  right = Math.min(canvas.width - 1, right + padding); bottom = Math.min(canvas.height - 1, bottom + padding);
  const output = document.createElement("canvas");
  output.width = right - left + 1;
  output.height = bottom - top + 1;
  output.getContext("2d")?.putImageData(context.getImageData(left, top, output.width, output.height), 0, 0);
  return output.toDataURL("image/png");
}

async function signatureImageDataUrl(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器无法处理签名图片");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const red = pixels.data[index];
    const green = pixels.data[index + 1];
    const blue = pixels.data[index + 2];
    const brightness = (red + green + blue) / 3;
    const colorSpread = Math.max(red, green, blue) - Math.min(red, green, blue);
    // Fade light, low-contrast paper/highlight pixels while preserving darker, saturated strokes.
    if (brightness > 10 && colorSpread < 100) {
      const alpha = Math.max(0, Math.min(1, (230 - brightness) / 70));
      pixels.data[index + 3] = Math.round(pixels.data[index + 3] * alpha);
    }
  }
  context.putImageData(pixels, 0, 0);
  return canvas.toDataURL("image/png");
}

async function savePdfObjects(file: File, objects: EditorObject[]) {
  const output = await loadPdf(file);
  const font = await output.embedFont(StandardFonts.Helvetica);
  for (const object of objects) {
    const page = output.getPage(object.page);
    const width = page.getWidth();
    const height = page.getHeight();
    const color = hexToPdfColor(object.color);
    const thickness = objectStrokeWidth(object.width, width);
    if (object.kind === "path") {
      const bounds = objectBounds(object);
      const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
      const points = object.rotation ? object.points.map((point) => rotatePoint(point, center, object.rotation * Math.PI / 180, width / height)) : object.points;
      if (points.length === 1) page.drawCircle({ x: toPdfX(points[0].x, width), y: toPdfY(points[0].y, height), size: thickness / 2, color, opacity: object.opacity });
      for (let index = 1; index < points.length; index += 1) page.drawLine({ start: { x: toPdfX(points[index - 1].x, width), y: toPdfY(points[index - 1].y, height) }, end: { x: toPdfX(points[index].x, width), y: toPdfY(points[index].y, height) }, thickness, color, opacity: object.opacity, lineCap: LineCapStyle.Round });
      continue;
    }
    if (object.kind === "line") {
      const bounds = objectBounds(object);
      const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
      const points = object.rotation ? [rotatePoint(object.start, center, object.rotation * Math.PI / 180, width / height), rotatePoint(object.end, center, object.rotation * Math.PI / 180, width / height)] : [object.start, object.end];
      page.drawLine({ start: { x: toPdfX(points[0].x, width), y: toPdfY(points[0].y, height) }, end: { x: toPdfX(points[1].x, width), y: toPdfY(points[1].y, height) }, thickness, color, opacity: object.opacity, lineCap: LineCapStyle.Round });
      continue;
    }
    if (object.kind === "text") {
      page.drawText(object.text || "Text", { x: toPdfX(object.x, width), y: toPdfY(object.y + object.fontSize, height), size: objectStrokeWidth(object.fontSize, width), font, color, opacity: object.opacity, rotate: degrees(object.rotation) });
      continue;
    }
    if (object.kind === "image") {
      const imageBytes = await fetch(object.dataUrl).then((response) => response.arrayBuffer());
      const image = object.mimeType === "image/png" ? await output.embedPng(imageBytes) : await output.embedJpg(imageBytes);
      const imageWidth = toPdfX(object.objectWidth, width);
      const imageHeight = object.objectHeight / EDITOR_SIZE * height;
      const centerX = toPdfX(object.x + object.objectWidth / 2, width);
      const centerY = toPdfY(object.y + object.objectHeight / 2, height);
      const radians = -object.rotation * Math.PI / 180;
      const x = centerX - imageWidth / 2 * Math.cos(radians) + imageHeight / 2 * Math.sin(radians);
      const y = centerY - imageWidth / 2 * Math.sin(radians) - imageHeight / 2 * Math.cos(radians);
      page.drawImage(image, { x, y, width: imageWidth, height: imageHeight, opacity: object.opacity, rotate: degrees(-object.rotation) });
      continue;
    }
    const fill = hexToPdfColor(object.fill);
    const center = { x: object.x + object.objectWidth / 2, y: object.y + object.objectHeight / 2 };
    if (object.shape === "ellipse") {
      page.drawEllipse({ x: toPdfX(center.x, width), y: toPdfY(center.y, height), xScale: toPdfX(object.objectWidth, width) / 2, yScale: object.objectHeight / EDITOR_SIZE * height / 2, color: fill, opacity: object.fillOpacity, borderColor: color, borderOpacity: object.opacity, borderWidth: thickness, rotate: degrees(-object.rotation) });
      continue;
    }
    const sourcePoints = object.shape === "rectangle" ? [
      { x: object.x, y: object.y }, { x: object.x + object.objectWidth, y: object.y },
      { x: object.x + object.objectWidth, y: object.y + object.objectHeight }, { x: object.x, y: object.y + object.objectHeight },
    ] : object.shape === "triangle" ? trianglePoints(object.x, object.y, object.objectWidth, object.objectHeight) : starPoints(object.x, object.y, object.objectWidth, object.objectHeight);
    const points = object.rotation ? sourcePoints.map((point) => rotatePoint(point, center, object.rotation * Math.PI / 180, width / height)) : sourcePoints;
    const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${toPdfX(point.x, width)} ${toPdfY(point.y, height)}`).join(" ") + " Z";
    page.drawSvgPath(path, { color: fill, opacity: object.fillOpacity, borderColor: color, borderOpacity: object.opacity, borderWidth: thickness });
  }
  return savePdf(output);
}

function hexToHsl(value: string) {
  const hex = value.replace("#", "");
  const red = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const green = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(hex.slice(4, 6), 16) / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  let hue = 0;
  if (delta) hue = maximum === red ? 60 * (((green - blue) / delta) % 6) : maximum === green ? 60 * ((blue - red) / delta + 2) : 60 * ((red - green) / delta + 4);
  const lightness = (maximum + minimum) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return { hue: (hue + 360) % 360, saturation: saturation * 100, lightness: lightness * 100 };
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const chroma = (1 - Math.abs(2 * lightness / 100 - 1)) * saturation / 100;
  const offset = hue / 60;
  const second = chroma * (1 - Math.abs(offset % 2 - 1));
  const [red, green, blue] = offset < 1 ? [chroma, second, 0] : offset < 2 ? [second, chroma, 0] : offset < 3 ? [0, chroma, second] : offset < 4 ? [0, second, chroma] : offset < 5 ? [second, 0, chroma] : [chroma, 0, second];
  const match = lightness / 100 - chroma / 2;
  return `#${[red, green, blue].map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, "0")).join("")}`;
}

function CustomColorPicker({ label, value, alpha = 1, onChange, onAlphaChange, cancelLabel = "Cancel", selectLabel = "Select" }: { label: string; value: string; alpha?: number; onChange: (value: string) => void; onAlphaChange?: (value: number) => void; cancelLabel?: string; selectLabel?: string }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [draft, setDraft] = useState(value);
  const [draftAlpha, setDraftAlpha] = useState(alpha);
  const [initial, setInitial] = useState({ color: value, alpha });
  const pickerId = useId();
  const color = useMemo(() => hexToHsl(draft), [draft]);
  useEffect(() => {
    const closeOtherPickers = (event: Event) => { if ((event as CustomEvent<string>).detail !== pickerId) setOpen(false); };
    window.addEventListener("paperpilot:color-picker-open", closeOtherPickers);
    return () => window.removeEventListener("paperpilot:color-picker-open", closeOtherPickers);
  }, [pickerId]);
  const updatePosition = () => {
    const bounds = triggerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const pickerWidth = Math.min(318, window.innerWidth - 28);
    setPosition({ top: Math.min(bounds.bottom + 8, window.innerHeight - 340), left: Math.max(14, Math.min(bounds.right - pickerWidth, window.innerWidth - pickerWidth - 14)) });
  };
  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => { window.removeEventListener("resize", updatePosition); window.removeEventListener("scroll", updatePosition, true); };
  }, [open]);
  const openPicker = () => { window.dispatchEvent(new CustomEvent("paperpilot:color-picker-open", { detail: pickerId })); setDraft(value); setDraftAlpha(alpha); setInitial({ color: value, alpha }); updatePosition(); setOpen(true); };
  const setPlaneColor = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const saturation = limit((event.clientX - bounds.left) / bounds.width * 100, 0, 100);
    const lightness = limit(100 - (event.clientY - bounds.top) / bounds.height * 100, 0, 100);
    const next = hslToHex(color.hue, saturation, lightness);
    setDraft(next); onChange(next);
  };
  const setHue = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const hue = limit((event.clientY - bounds.top) / bounds.height * 360, 0, 360);
    const next = hslToHex(hue, color.saturation, color.lightness);
    setDraft(next); onChange(next);
  };
  const setAlpha = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const next = limit((event.clientX - bounds.left) / bounds.width, 0, 1);
    setDraftAlpha(next); onAlphaChange?.(next);
  };
  const rgb = hexToPdfColor(draft);
  const rgbText = `rgb(${Math.round(rgb.red * 255)}, ${Math.round(rgb.green * 255)}, ${Math.round(rgb.blue * 255)})`;
  const picker = <div className="color-picker-popover reference-picker color-picker-portal" style={position} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}><div className="picker-color-row"><div className="color-plane" style={{ backgroundColor: `hsl(${color.hue} 100% 50%)` }} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setPlaneColor(event); }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) setPlaneColor(event); }}><span className="color-plane-thumb" style={{ left: `${color.saturation}%`, top: `${100 - color.lightness}%` }} /></div><div className="hue-rail" aria-label={`${label} hue`} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setHue(event); }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) setHue(event); }}><span style={{ top: `${color.hue / 360 * 100}%` }} /></div></div>{onAlphaChange && <div className="alpha-rail" aria-label={`${label} opacity`} style={{ "--picker-color": draft } as CSSProperties} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setAlpha(event); }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) setAlpha(event); }}><span style={{ left: `${draftAlpha * 100}%` }} /></div>}<input className="rgb-input" aria-label={`${label} RGB`} value={rgbText} readOnly /><div className="color-picker-actions"><button type="button" onClick={() => { onChange(initial.color); onAlphaChange?.(initial.alpha); setOpen(false); }}>{cancelLabel}</button><button type="button" onClick={() => setOpen(false)}>{selectLabel}</button></div></div>;
  return <div className="custom-color-picker"><button ref={triggerRef} className="color-swatch-button" type="button" aria-label={label} data-tooltip={label} style={{ backgroundColor: value, opacity: alpha }} onClick={(event) => { event.preventDefault(); event.stopPropagation(); openPicker(); }} /><span className="sr-only">{label}</span>{open && typeof document !== "undefined" && createPortal(picker, document.body)}</div>;
}

export function PdfEditor({ file, onReset, t, mode = "edit" }: { file: File; onReset: () => void; t: ReturnType<typeof workspaceT>; mode?: "edit" | "sign" | "redact" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<SVGSVGElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const signatureUploadRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef<any>(null);
  const actionRef = useRef<EditorAction | null>(null);
  const downloadUrlRef = useRef<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageAspect, setPageAspect] = useState(1);
  const [objects, setObjects] = useState<EditorObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<EditorTool>(mode === "redact" ? "pencil" : "select");
  const [shape, setShape] = useState<ShapeKind>("rectangle");
  const [paintType, setPaintType] = useState<"pencil" | "marker">("pencil");
  const [color, setColor] = useState(mode === "redact" ? "#000000" : "#e2524b");
  const [fillColor, setFillColor] = useState(mode === "redact" ? "#000000" : "#e2524b");
  const [fillOpacity, setFillOpacity] = useState(1);
  const [width, setWidth] = useState(mode === "redact" ? 18 : 5);
  const [opacity, setOpacity] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signatureView, setSignatureView] = useState<"draw" | "upload" | "library">("draw");
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([]);
  const [signatureUpload, setSignatureUpload] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ text: string; left: number; top: number; placement: "top" | "bottom" } | null>(null);

  const clearDownload = () => {
    if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
    downloadUrlRef.current = null;
  };

  const showTooltip = (target: EventTarget | null) => {
    const trigger = target instanceof Element ? target.closest<HTMLElement>("[data-tooltip]") : null;
    const text = trigger?.dataset.tooltip;
    if (!trigger || !text || trigger.matches(":disabled")) return;
    const bounds = trigger.getBoundingClientRect();
    const placement = bounds.top > 54 ? "top" : "bottom";
    setTooltip({ text, left: Math.max(12, Math.min(bounds.left + bounds.width / 2, window.innerWidth - 12)), top: placement === "top" ? bounds.top - 9 : bounds.bottom + 9, placement });
  };

  const hideTooltip = (target: EventTarget | null, relatedTarget: EventTarget | null) => {
    const trigger = target instanceof Element ? target.closest<HTMLElement>("[data-tooltip]") : null;
    const next = relatedTarget instanceof Element ? relatedTarget.closest<HTMLElement>("[data-tooltip]") : null;
    if (trigger !== next) setTooltip(null);
  };

  useEffect(() => () => clearDownload(), []);

  useEffect(() => {
    if (!signatureOpen) return;
    const { overflow: bodyOverflow, paddingRight: bodyPaddingRight } = document.body.style;
    const { overflow: htmlOverflow } = document.documentElement.style;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
      document.body.style.paddingRight = bodyPaddingRight;
    };
  }, [signatureOpen]);

  useEffect(() => {
    if (!signatureOpen || signatureView !== "draw") return;
    const canvas = signatureCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#111111";
    context.lineWidth = 11;
    context.lineCap = "round";
    context.lineJoin = "round";
  }, [signatureOpen, signatureView]);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setError("");
    setObjects([]);
    setSelectedId(null);
    clearDownload();
    setResult(null);
    (async () => {
      try {
        const pdfjs = await getPdfJs();
        const documentProxy = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
        if (cancelled) { documentProxy.destroy?.(); return; }
        documentRef.current = documentProxy;
        setPageCount(documentProxy.numPages);
        setPage(0);
        setLoaded(true);
      } catch (reason) {
        if (!cancelled) setError(visibleError(reason, t.previewFailed));
      }
    })();
    return () => { cancelled = true; documentRef.current?.destroy?.(); documentRef.current = null; };
  }, [file]);

  useEffect(() => {
    if (!loaded || !documentRef.current || !canvasRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const sourcePage = await documentRef.current.getPage(page + 1);
        const viewport = sourcePage.getViewport({ scale: 1.55 });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        setPageAspect(viewport.width / viewport.height);
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("当前浏览器无法渲染编辑画布");
        await sourcePage.render({ canvasContext: context, viewport, background: "#ffffff" }).promise;
      } catch (reason) {
        if (!cancelled) setError(visibleError(reason, t.previewFailed));
      }
    })();
    return () => { cancelled = true; };
  }, [loaded, page]);

  const pointFromClient = (clientX: number, clientY: number): Point | null => {
    const bounds = layerRef.current?.getBoundingClientRect();
    if (!bounds || !bounds.width || !bounds.height) return null;
    return { x: limit((clientX - bounds.left) / bounds.width * EDITOR_SIZE), y: limit((clientY - bounds.top) / bounds.height * EDITOR_SIZE) };
  };
  const pointFromEvent = (event: ReactPointerEvent<SVGSVGElement>): Point | null => pointFromClient(event.clientX, event.clientY);
  const updateObject = (id: string, update: (object: EditorObject) => EditorObject) => setObjects((current) => current.map((object) => object.id === id ? update(object) : object));
  const beginHandle = (event: ReactPointerEvent<SVGRectElement | SVGEllipseElement>, type: "resize" | "rotate", handle?: ResizeHandle) => {
    event.stopPropagation();
    const point = pointFromClient(event.clientX, event.clientY);
    const selected = selectedId ? objects.find((object) => object.id === selectedId) : null;
    if (!point || !selected) return;
    layerRef.current?.setPointerCapture(event.pointerId);
    actionRef.current = { type, id: selected.id, start: point, original: selected, handle };
  };
  const startDrawing = (event: ReactPointerEvent<SVGSVGElement>) => {
    const point = pointFromEvent(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const element = event.target as Element;
    const handle = element.closest("[data-editor-handle]")?.getAttribute("data-editor-handle");
    const objectId = element.closest("[data-object-id]")?.getAttribute("data-object-id");
    if (tool === "select") {
      const selected = objectId ? objects.find((object) => object.id === objectId) : undefined;
      if (!selected) { setSelectedId(null); return; }
      setSelectedId(selected.id);
      actionRef.current = { type: handle === "resize" ? "resize" : handle === "rotate" ? "rotate" : "move", id: selected.id, start: point, original: selected };
      return;
    }
    if (tool === "text") {
      const text: TextObject = { id: crypto.randomUUID(), kind: "text", page, x: point.x, y: point.y, text: "Text", fontSize: 44, rotation: 0, bold: false, color, width: 1, opacity };
      setObjects((current) => [...current, text]); setSelectedId(null);
      return;
    }
    const id = crypto.randomUUID();
    const object: EditorObject = tool === "pencil" ? { id, kind: "path", page, points: [point], color, width: paintType === "marker" ? Math.max(12, width * 2) : width, opacity, rotation: 0 } : tool === "line" ? { id, kind: "line", page, start: point, end: point, color, width, opacity, rotation: 0 } : { id, kind: "shape", page, shape, x: point.x, y: point.y, objectWidth: 1, objectHeight: 1, color, width, opacity, fill: fillColor, fillOpacity, rotation: 0 };
    setObjects((current) => [...current, object]); setSelectedId(null); actionRef.current = { type: "draw", id, start: point, original: object };
  };
  const continueDrawing = (event: ReactPointerEvent<SVGSVGElement>) => {
    const action = actionRef.current;
    const point = pointFromEvent(event);
    if (!action || !point) return;
    updateObject(action.id, (current) => {
      if (action.type === "draw") {
        if (current.kind === "path") return { ...current, points: [...current.points, point] };
        if (current.kind === "line") return { ...current, end: point };
        if (current.kind === "shape") return { ...current, x: Math.min(action.start.x, point.x), y: Math.min(action.start.y, point.y), objectWidth: Math.max(8, Math.abs(point.x - action.start.x)), objectHeight: Math.max(8, Math.abs(point.y - action.start.y)) };
      }
      if (action.type === "move") return moveObject(action.original, point.x - action.start.x, point.y - action.start.y);
      if (action.type === "resize" && action.handle) return resizeObject(action.original, point, action.handle, pageAspect);
      if (action.type === "rotate") {
        const bounds = objectBounds(action.original);
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        const startAngle = Math.atan2(action.start.y - centerY, (action.start.x - centerX) * pageAspect);
        const currentAngle = Math.atan2(point.y - centerY, (point.x - centerX) * pageAspect);
        return rotateObject(action.original, currentAngle - startAngle);
      }
      return current;
    });
  };
  const finishDrawing = () => { actionRef.current = null; };
  const undo = () => setObjects((current) => { const index = [...current].map((object, objectIndex) => ({ object, objectIndex })).reverse().find((item) => item.object.page === page)?.objectIndex; return index === undefined ? current : current.filter((_, objectIndex) => objectIndex !== index); });
  const clearPage = () => { setObjects((current) => current.filter((object) => object.page !== page)); setSelectedId(null); };
  const deleteSelected = () => { if (selectedId) setObjects((current) => current.filter((object) => object.id !== selectedId)); setSelectedId(null); };
  const copySelected = () => {
    const selected = objects.find((object) => object.id === selectedId);
    if (!selected) return;
    const copy = moveObject({ ...selected, id: crypto.randomUUID() }, 28, 28);
    setObjects((current) => [...current, copy]); setSelectedId(null);
  };
  const insertImageObject = async (dataUrl: string, mimeType: "image/png" | "image/jpeg", source?: "signature") => {
    const preview = new Image();
    await new Promise<void>((resolve, reject) => { preview.onload = () => resolve(); preview.onerror = () => reject(new Error("图片预览失败")); preview.src = dataUrl; });
    const layerBounds = layerRef.current?.getBoundingClientRect();
    const pageRatio = layerBounds?.width && layerBounds.height ? layerBounds.width / layerBounds.height : 1;
    const imageRatio = preview.naturalWidth / Math.max(1, preview.naturalHeight);
    let objectWidth = source === "signature" ? 300 : 360;
    let objectHeight = objectWidth / imageRatio * pageRatio;
    if (objectHeight > 440) { objectHeight = 440; objectWidth = objectHeight * imageRatio / pageRatio; }
    const image: ImageObject = {
      id: crypto.randomUUID(), kind: "image", page,
      x: (EDITOR_SIZE - objectWidth) / 2, y: (EDITOR_SIZE - objectHeight) / 2,
      objectWidth, objectHeight, dataUrl, mimeType, source,
      color: "", width: 0, opacity: 1, rotation: 0,
    };
    setObjects((current) => [...current, image]);
    setSelectedId(null);
  };
  const addLocalImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const imageFile = event.target.files?.[0];
    event.target.value = "";
    if (!imageFile) return;
    const mimeType = imageFile.type === "image/png" ? "image/png" : imageFile.type === "image/jpeg" ? "image/jpeg" : null;
    if (!mimeType) { setError(t.previewFailed); return; }
    setError("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("图片读取失败")); reader.readAsDataURL(imageFile); });
      await insertImageObject(dataUrl, mimeType);
    } catch (reason) { setError(visibleError(reason, t.previewFailed)); }
  };
  const signaturePoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) / bounds.width * canvas.width, y: (event.clientY - bounds.top) / bounds.height * canvas.height };
  };
  const startSignatureDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = signaturePoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    context.beginPath(); context.moveTo(point.x, point.y);
  };
  const continueSignatureDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = signaturePoint(event);
    context.lineTo(point.x, point.y); context.stroke();
  };
  const clearSignatureDrawing = () => {
    const canvas = signatureCanvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  };
  const uploadSignature = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const imageFile = event.target.files?.[0];
    event.target.value = "";
    if (!imageFile) return;
    if (imageFile.type !== "image/png" && imageFile.type !== "image/jpeg") { setError(t.previewFailed); return; }
    try { setSignatureUpload(await signatureImageDataUrl(imageFile)); setError(""); }
    catch (reason) { setError(visibleError(reason, t.previewFailed)); }
  };
  const saveSignature = () => {
    try {
      const dataUrl = signatureView === "draw" ? trimSignatureCanvas(signatureCanvasRef.current!) : signatureUpload;
      if (!dataUrl) throw new Error(t.previewFailed);
      setSavedSignatures((current) => [...current, { id: crypto.randomUUID(), dataUrl, mimeType: "image/png" }]);
      setSignatureView("library");
    } catch (reason) { setError(visibleError(reason, t.previewFailed)); }
  };
  const placeSignature = async (signature: SavedSignature) => {
    try { await insertImageObject(signature.dataUrl, signature.mimeType, "signature"); setSignatureOpen(false); }
    catch (reason) { setError(visibleError(reason, t.previewFailed)); }
  };
  const openSignatureDialog = () => { setError(""); setSignatureView(savedSignatures.length ? "library" : "draw"); setSignatureOpen(true); };
  const save = async () => {
    if (!objects.length) { setError(t.editorStatusDraw); return; }
    setSaving(true); setError(""); clearDownload(); setResult(null);
    try {
      const bytes = await savePdfObjects(file, objects);
      const name = `${safeName(file.name)}-edited.pdf`;
      const url = await downloadBytes(bytes, name);
      downloadUrlRef.current = url;
      setResult({ url, name, size: bytes.byteLength });
    } catch (reason) { setError(visibleError(reason, t.saveFailed)); }
    finally { setSaving(false); }
  };

  const pageObjects = objects.filter((object) => object.page === page);
  const selectedObject = objects.find((object) => object.id === selectedId) || null;
  const selectedBounds = selectedObject ? objectBounds(selectedObject) : null;
  const selectedRotation = selectedObject?.rotation || 0;
  const setSelectedValue = (update: (object: EditorObject) => EditorObject) => { if (selectedObject) updateObject(selectedObject.id, update); };
  const renderResizeHandle = (handle: ResizeHandle, x: number, y: number) => {
    const size = 18;
    const width = size / Math.max(.001, pageAspect);
    return <rect key={handle} data-editor-handle={handle} onPointerDown={(event) => beginHandle(event, "resize", handle)} x={x - width / 2} y={y - size / 2} width={width} height={size} />;
  };
  const renderObject = (object: EditorObject) => {
    const selected = object.id === selectedId;
    const common = { "data-object-id": object.id, className: selected ? "editor-svg-object selected" : "editor-svg-object", opacity: object.opacity };
    if (object.kind === "path") { const bounds = objectBounds(object); return <polyline key={object.id} {...common} points={svgPoints(object.points)} fill="none" stroke={object.color} strokeWidth={object.width} strokeLinecap="round" strokeLinejoin="round" transform={rotationTransform(object.rotation, { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }, pageAspect)} />; }
    if (object.kind === "line") { const bounds = objectBounds(object); return <line key={object.id} {...common} x1={object.start.x} y1={object.start.y} x2={object.end.x} y2={object.end.y} stroke={object.color} strokeWidth={object.width} strokeLinecap="round" transform={rotationTransform(object.rotation, { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }, pageAspect)} />; }
    if (object.kind === "text") { const bounds = objectBounds(object); return <text key={object.id} {...common} x={object.x} y={object.y + object.fontSize} fill={object.color} fontSize={object.fontSize} fontWeight={object.bold ? 700 : 400} transform={rotationTransform(object.rotation, { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }, pageAspect)}>{object.text || "Text"}</text>; }
    if (object.kind === "image") return <image key={object.id} {...common} href={object.dataUrl} x={object.x} y={object.y} width={object.objectWidth} height={object.objectHeight} preserveAspectRatio="none" transform={rotationTransform(object.rotation, { x: object.x + object.objectWidth / 2, y: object.y + object.objectHeight / 2 }, pageAspect)} />;
    const points = object.shape === "triangle" ? trianglePoints(object.x, object.y, object.objectWidth, object.objectHeight) : object.shape === "star" ? starPoints(object.x, object.y, object.objectWidth, object.objectHeight) : [];
    const transform = rotationTransform(object.rotation, { x: object.x + object.objectWidth / 2, y: object.y + object.objectHeight / 2 }, pageAspect);
    if (object.shape === "rectangle") return <rect key={object.id} {...common} x={object.x} y={object.y} width={object.objectWidth} height={object.objectHeight} fill={object.fill} fillOpacity={object.fillOpacity} stroke={object.color} strokeWidth={object.width} transform={transform} />;
    if (object.shape === "ellipse") return <ellipse key={object.id} {...common} cx={object.x + object.objectWidth / 2} cy={object.y + object.objectHeight / 2} rx={object.objectWidth / 2} ry={object.objectHeight / 2} fill={object.fill} fillOpacity={object.fillOpacity} stroke={object.color} strokeWidth={object.width} transform={transform} />;
    return <polygon key={object.id} {...common} points={svgPoints(points)} fill={object.fill} fillOpacity={object.fillOpacity} stroke={object.color} strokeWidth={object.width} strokeLinejoin="round" transform={transform} />;
  };
  const colorPickerLabels = { cancelLabel: t.cancel, selectLabel: t.select };
  const objectTypeLabel = selectedObject?.kind === "shape" ? t.objectShape : selectedObject?.kind === "text" ? t.objectText : selectedObject?.kind === "image" ? selectedObject.source === "signature" ? t.objectSignature : t.objectImage : selectedObject?.kind === "line" ? t.objectLine : t.brush;
  const footerStatus = objects.length ? t.editorStatusAdded(objects.length) : tool === "text" ? t.editorStatusText : tool === "select" ? t.editorStatusSelect : t.editorStatusDraw;
  return <section className="pdf-editor" aria-label={t.editorLabel} onPointerOver={(event) => showTooltip(event.target)} onPointerOut={(event) => hideTooltip(event.target, event.relatedTarget)} onFocusCapture={(event) => showTooltip(event.target)} onBlurCapture={(event) => hideTooltip(event.target, event.relatedTarget)}>
    <div className="pdf-editor-topbar">
      <div className="editor-file"><FileText size={18} /><span>{file.name}</span></div>
      <div className="editor-actions"><button className="editor-icon-button" type="button" data-tooltip={t.undoPage} aria-label={t.undoPage} disabled={!pageObjects.length || saving} onClick={undo}><Undo2 size={19} /></button><button className="editor-icon-button" type="button" data-tooltip={t.clearPage} aria-label={t.clearPage} disabled={!pageObjects.length || saving} onClick={clearPage}><Eraser size={19} /></button><button className="editor-save" type="button" disabled={!objects.length || saving} onClick={save}>{saving ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}{saving ? t.saving : t.savePdf}</button></div>
    </div>
    <div className="pdf-editor-toolbar">
      <div className="page-control"><button className="editor-icon-button" type="button" data-tooltip={t.previousPage} aria-label={t.previousPage} disabled={page === 0} onClick={() => { setPage((current) => current - 1); setSelectedId(null); }}><MoveLeft size={18} /></button><strong>{loaded ? `${page + 1} / ${pageCount}` : t.loading}</strong><button className="editor-icon-button" type="button" data-tooltip={t.nextPage} aria-label={t.nextPage} disabled={!pageCount || page >= pageCount - 1} onClick={() => { setPage((current) => current + 1); setSelectedId(null); }}><MoveRight size={18} /></button></div>
      {mode === "sign" && <div className="editor-tools"><button className={`editor-icon-button ${tool === "select" ? "active" : ""}`} type="button" data-tooltip={t.selectObject} aria-label={t.selectObject} onClick={() => setTool("select")}><MousePointer2 size={19} /></button><button className="editor-icon-button" type="button" data-tooltip={t.addSignature} aria-label={t.addSignature} onClick={openSignatureDialog}><Signature size={20} /></button><button className={`editor-icon-button ${tool === "text" ? "active" : ""}`} type="button" data-tooltip={t.textTool} aria-label={t.textTool} onClick={() => setTool("text")}><Type size={20} /></button><button className="editor-icon-button" type="button" data-tooltip={t.addImage} aria-label={t.addImage} onClick={() => imageInputRef.current?.click()}><ImagePlus size={20} /></button><input ref={imageInputRef} hidden type="file" accept="image/png,image/jpeg" onChange={addLocalImage} /><button className="editor-icon-button" type="button" data-tooltip={t.copySelected} aria-label={t.copySelected} disabled={!selectedObject} onClick={copySelected}><Copy size={18} /></button><button className="editor-icon-button" type="button" data-tooltip={t.deleteSelected} aria-label={t.deleteSelected} disabled={!selectedObject} onClick={deleteSelected}><Trash2 size={18} /></button></div>}
      {mode === "edit" && <div className="editor-tools"><button className={`editor-icon-button ${tool === "select" ? "active" : ""}`} type="button" data-tooltip={t.selectObject} aria-label={t.selectObject} onClick={() => setTool("select")}><MousePointer2 size={19} /></button><button className={`editor-icon-button ${tool === "pencil" || tool === "line" ? "active" : ""}`} type="button" data-tooltip={t.pencilTool} aria-label={t.pencilTool} onClick={() => setTool("pencil")}><Pencil size={19} /></button><button className={`editor-icon-button ${tool === "text" ? "active" : ""}`} type="button" data-tooltip={t.textTool} aria-label={t.textTool} onClick={() => setTool("text")}><Type size={20} /></button><button className={`editor-icon-button ${tool === "shape" ? "active" : ""}`} type="button" data-tooltip={t.shapeTool} aria-label={t.shapeTool} onClick={() => setTool("shape")}><Shapes size={20} /></button><button className="editor-icon-button" type="button" data-tooltip={t.addImage} aria-label={t.addImage} onClick={() => imageInputRef.current?.click()}><ImagePlus size={20} /></button><input ref={imageInputRef} hidden type="file" accept="image/png,image/jpeg" onChange={addLocalImage} /><button className="editor-icon-button" type="button" data-tooltip={t.copySelected} aria-label={t.copySelected} disabled={!selectedObject} onClick={copySelected}><Copy size={18} /></button><button className="editor-icon-button" type="button" data-tooltip={t.deleteSelected} aria-label={t.deleteSelected} disabled={!selectedObject} onClick={deleteSelected}><Trash2 size={18} /></button></div>}
      {mode === "redact" && <div className="editor-tools redact-editor-tools"><button className={`editor-icon-button ${tool === "pencil" ? "active" : ""}`} type="button" data-tooltip={t.pencilTool} aria-label={t.pencilTool} onClick={() => setTool("pencil")}><Pencil size={19} /></button><button className={`editor-icon-button ${tool === "shape" ? "active" : ""}`} type="button" data-tooltip={t.shapeTool} aria-label={t.shapeTool} onClick={() => { setShape("rectangle"); setTool("shape"); }}><Shapes size={20} /></button><button className="editor-icon-button" type="button" data-tooltip={t.deleteSelected} aria-label={t.deleteSelected} disabled={!selectedObject} onClick={deleteSelected}><Trash2 size={18} /></button></div>}
      {(mode === "edit" || mode === "redact") && (tool === "pencil" || tool === "line") && <div className="drawing-settings"><span>{t.brush}</span>{mode === "edit" && <><label>{t.type}<select aria-label={t.type} value={paintType} onChange={(event) => setPaintType(event.target.value as "pencil" | "marker")}><option value="pencil">{t.pencil}</option><option value="marker">{t.marker}</option></select></label><div className="stroke-mode"><button className={tool === "pencil" ? "active" : ""} type="button" data-tooltip={t.freeCurve} aria-label={t.freeCurve} onClick={() => setTool("pencil")}><Spline size={17} /></button><button className={tool === "line" ? "active" : ""} type="button" data-tooltip={t.straightLine} aria-label={t.straightLine} onClick={() => setTool("line")}><Slash size={17} /></button></div></>}<label>{t.width}<input aria-label={t.width} type="range" min="1" max="32" value={width} onChange={(event) => setWidth(Number(event.target.value))} /><output>{width}</output></label><label>{t.color}<CustomColorPicker label={t.color} value={color} alpha={opacity} onChange={setColor} onAlphaChange={setOpacity} {...colorPickerLabels} /></label></div>}
      {(mode === "edit" || mode === "redact") && tool === "shape" && <div className="drawing-settings shape-settings"><span><Shapes size={16} /> {t.shape}</span>{([ ["rectangle", Square, t.rectangle], ["ellipse", Circle, t.ellipse], ["triangle", Triangle, t.triangle], ["star", Star, t.star] ] as const).map(([kind, Icon, label]) => <button key={kind} className={`shape-choice ${shape === kind ? "active" : ""}`} type="button" data-tooltip={label} aria-label={label} onClick={() => setShape(kind)}><Icon size={17} /></button>)}<div className="color-alpha-field"><label>{t.fill}<CustomColorPicker label={t.fill} value={fillColor} alpha={fillOpacity} onChange={setFillColor} onAlphaChange={setFillOpacity} {...colorPickerLabels} /></label></div><div className="color-alpha-field"><label>{t.stroke}<CustomColorPicker label={t.stroke} value={color} alpha={opacity} onChange={setColor} onAlphaChange={setOpacity} {...colorPickerLabels} /></label></div><label>{t.width}<input aria-label={t.width} type="range" min="1" max="20" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></label></div>}
      {selectedObject && <div className="object-settings"><span>{objectTypeLabel}</span>{selectedObject.kind === "text" && <><label><input aria-label={t.textContent} value={selectedObject.text} onChange={(event) => setSelectedValue((object) => object.kind === "text" ? { ...object, text: event.target.value } : object)} /></label><label>{t.fontSize}<input aria-label={t.textSize} type="number" min="12" max="180" value={Math.round(selectedObject.fontSize)} onChange={(event) => setSelectedValue((object) => object.kind === "text" ? { ...object, fontSize: Number(event.target.value) || 12 } : object)} /></label></>}{selectedObject.kind === "shape" ? <><div className="color-alpha-field"><label>{t.fill}<CustomColorPicker label={t.fill} value={selectedObject.fill} alpha={selectedObject.fillOpacity} onChange={(value) => setSelectedValue((object) => object.kind === "shape" ? { ...object, fill: value } : object)} onAlphaChange={(value) => setSelectedValue((object) => object.kind === "shape" ? { ...object, fillOpacity: value } : object)} {...colorPickerLabels} /></label></div><div className="color-alpha-field"><label>{t.stroke}<CustomColorPicker label={t.stroke} value={selectedObject.color} alpha={selectedObject.opacity} onChange={(value) => setSelectedValue((object) => ({ ...object, color: value }))} onAlphaChange={(value) => setSelectedValue((object) => ({ ...object, opacity: value }))} {...colorPickerLabels} /></label></div><label>{t.width}<input aria-label={t.width} type="range" min="1" max="32" value={selectedObject.width} onChange={(event) => setSelectedValue((object) => ({ ...object, width: Number(event.target.value) }))} /></label></> : selectedObject.kind === "image" ? <label>{t.opacity}<input aria-label={t.opacity} type="range" min="0" max="100" value={Math.round(selectedObject.opacity * 100)} onChange={(event) => setSelectedValue((object) => object.kind === "image" ? { ...object, opacity: Number(event.target.value) / 100 } : object)} /><output>{Math.round(selectedObject.opacity * 100)}%</output></label> : <><label>{t.color}<CustomColorPicker label={t.color} value={selectedObject.color} alpha={selectedObject.opacity} onChange={(value) => setSelectedValue((object) => ({ ...object, color: value }))} onAlphaChange={(value) => setSelectedValue((object) => ({ ...object, opacity: value }))} {...colorPickerLabels} /></label>{selectedObject.kind !== "text" && <label>{t.width}<input aria-label={t.width} type="range" min="1" max="32" value={selectedObject.width} onChange={(event) => setSelectedValue((object) => ({ ...object, width: Number(event.target.value) }))} /></label>}</>}</div>}
    </div>
    <div className="pdf-editor-stage">
      {!loaded && !error && <div className="editor-loading"><LoaderCircle className="spin" size={22} /> {t.openingPdf}</div>}
      <div className="pdf-canvas-stack" style={{ visibility: loaded ? "visible" : "hidden" }}>
        <canvas ref={canvasRef} className="pdf-page-canvas" />
        <svg ref={layerRef} className={`pdf-object-layer tool-${tool}`} viewBox={`0 0 ${EDITOR_SIZE} ${EDITOR_SIZE}`} preserveAspectRatio="none" onPointerDown={startDrawing} onPointerMove={continueDrawing} onPointerUp={finishDrawing} onPointerCancel={finishDrawing}>{pageObjects.map(renderObject)}{selectedBounds && selectedObject?.page === page && <g className="selection-box" transform={rotationTransform(selectedRotation, { x: selectedBounds.x + selectedBounds.width / 2, y: selectedBounds.y + selectedBounds.height / 2 }, pageAspect)}><rect x={selectedBounds.x} y={selectedBounds.y} width={selectedBounds.width} height={selectedBounds.height} fill="none" />{renderResizeHandle("nw", selectedBounds.x, selectedBounds.y)}{renderResizeHandle("n", selectedBounds.x + selectedBounds.width / 2, selectedBounds.y)}{renderResizeHandle("ne", selectedBounds.x + selectedBounds.width, selectedBounds.y)}{renderResizeHandle("e", selectedBounds.x + selectedBounds.width, selectedBounds.y + selectedBounds.height / 2)}{renderResizeHandle("se", selectedBounds.x + selectedBounds.width, selectedBounds.y + selectedBounds.height)}{renderResizeHandle("s", selectedBounds.x + selectedBounds.width / 2, selectedBounds.y + selectedBounds.height)}{renderResizeHandle("sw", selectedBounds.x, selectedBounds.y + selectedBounds.height)}{renderResizeHandle("w", selectedBounds.x, selectedBounds.y + selectedBounds.height / 2)}<line x1={selectedBounds.x + selectedBounds.width / 2} y1={selectedBounds.y} x2={selectedBounds.x + selectedBounds.width / 2} y2={selectedBounds.y - 46} /><ellipse data-editor-handle="rotate" onPointerDown={(event) => beginHandle(event, "rotate")} cx={selectedBounds.x + selectedBounds.width / 2} cy={selectedBounds.y - 54} rx={10 / Math.max(.001, pageAspect)} ry="10" /></g>}</svg>
      </div>
    </div>
    {tooltip && typeof document !== "undefined" && createPortal(<div className={`editor-tooltip editor-tooltip-${tooltip.placement}`} role="tooltip" style={{ left: tooltip.left, top: tooltip.top }}>{tooltip.text}</div>, document.body)}
    {signatureOpen && typeof document !== "undefined" && createPortal(<div className="signature-overlay" role="dialog" aria-modal="true" aria-label={t.addSignature} onPointerOver={(event) => showTooltip(event.target)} onPointerOut={(event) => hideTooltip(event.target, event.relatedTarget)} onFocusCapture={(event) => showTooltip(event.target)} onBlurCapture={(event) => hideTooltip(event.target, event.relatedTarget)}><section className="signature-dialog"><button className="signature-close" type="button" aria-label={t.close} data-tooltip={t.close} onClick={() => setSignatureOpen(false)}><X size={25} /></button><div className="signature-tabs"><button className={signatureView === "draw" ? "active" : ""} type="button" onClick={() => setSignatureView("draw")}><PenLine size={21} /> {t.drawSignature}</button><button className={signatureView === "upload" ? "active" : ""} type="button" onClick={() => setSignatureView("upload")}><Upload size={21} /> {t.uploadImage}</button></div>{signatureView === "draw" && <div className="signature-workspace"><p>{t.signBelow}</p><canvas ref={signatureCanvasRef} className="signature-canvas" width="1000" height="360" onPointerDown={startSignatureDrawing} onPointerMove={continueSignatureDrawing} onPointerUp={finishDrawing} onPointerCancel={finishDrawing} /><div className="signature-actions"><button type="button" className="signature-icon-action" data-tooltip={t.clearSignature} aria-label={t.clearSignature} onClick={clearSignatureDrawing}><RotateCcw size={22} /></button><button type="button" className="signature-confirm" onClick={saveSignature}><Check size={22} /> {t.createSignature}</button></div></div>}{signatureView === "upload" && <div className="signature-workspace signature-upload-workspace"><p>{t.chooseSignatureImage}</p><button type="button" className="signature-upload-button" onClick={() => signatureUploadRef.current?.click()}><Upload size={22} /> {t.upload}</button><input ref={signatureUploadRef} hidden type="file" accept="image/png,image/jpeg" onChange={uploadSignature} />{signatureUpload && <><div className="signature-upload-preview"><img src={signatureUpload} alt={t.signaturePreview} /></div><div className="signature-actions"><button type="button" className="signature-confirm" onClick={saveSignature}><Check size={22} /> {t.createSignature}</button></div></>}</div>}{signatureView === "library" && <div className="signature-library"><p>{t.addSavedSignature}</p><div className="signature-library-grid">{savedSignatures.map((signature) => <button type="button" className="signature-card" key={signature.id} onClick={() => placeSignature(signature)}><img src={signature.dataUrl} alt={t.savedSignature} /></button>)}</div></div>}</section></div>, document.body)}
    <div className="pdf-editor-footer"><span>{footerStatus}</span><button className="secondary" type="button" onClick={onReset}><Trash2 size={16} /> {t.changeFile}</button></div>
    {error && <div className="result-panel" style={{ background: "#fff0ef", color: "#b42318" }} role="alert">{error}</div>}
    {result && <div className="editor-result"><div><ShieldCheck size={20} /><span><strong>{t.editedReady}</strong><small>{result.name} · {formatSize(result.size)}</small></span></div><a href={result.url} download={result.name}><Download size={17} /> {t.downloadPdf}</a></div>}
  </section>;
}
