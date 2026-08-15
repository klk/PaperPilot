"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download, GripVertical, LoaderCircle, MoveLeft, MoveRight, Trash2, WandSparkles } from "lucide-react";
import { PDFDocument } from "pdf-lib";

export type ReorderCopy = {
  previewFailed: string; processFailed: string; reorderLabel: string; previewingPages: string;
  reorderSummary: (count: number) => string; changeFile: string; loadingPages: string;
  pageLabel: (page: number) => string; originalPageLabel: (page: number) => string;
  moveForward: string; moveBackward: string; movePageForward: (page: number) => string;
  movePageBackward: (page: number) => string; generating: string; generatePdf: string;
  reorderHint: string; generated: string; downloadAgain: string;
};

const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const safeName = (name: string) => name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").toLowerCase() || "paperpilot-file";
function visibleError(reason: unknown, fallback: string) { return reason instanceof Error && reason.message ? reason.message : fallback; }
async function getPdfJs() { const pdfjs = await import("pdfjs-dist"); pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString(); return pdfjs; }
async function loadPdf(file: File) { return PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false }); }
async function savePdf(document: PDFDocument) { return document.save({ useObjectStreams: true, addDefaultPage: false, updateFieldAppearances: false }); }
async function downloadBytes(bytes: Uint8Array, name: string) { const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; document.body.appendChild(anchor); anchor.click(); anchor.remove(); return url; }

type ReorderPage = { id: string; originalIndex: number; thumbnail: string };

export function ReorderPdfWorkspace({ file, onReset, t }: { file: File; onReset: () => void; t: ReorderCopy }) {
  const [pages, setPages] = useState<ReorderPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const draggedIdRef = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function createThumbnails() {
      setLoading(true); setError(""); setResult(null);
      try {
        const pdfjs = await getPdfJs();
        const documentProxy = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
        const rendered: ReorderPage[] = [];
        for (let index = 1; index <= documentProxy.numPages; index += 1) {
          const page = await documentProxy.getPage(index);
          const sourceViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(1, 190 / sourceViewport.width);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const context = canvas.getContext("2d", { alpha: false });
          if (!context) throw new Error("当前浏览器无法生成页面缩略图");
          context.fillStyle = "#fff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: context, viewport, background: "#fff" }).promise;
          rendered.push({ id: `${file.name}-${index}-${crypto.randomUUID()}`, originalIndex: index - 1, thumbnail: canvas.toDataURL("image/jpeg", .82) });
          page.cleanup?.();
        }
        if (!cancelled) setPages(rendered);
        documentProxy.cleanup?.();
      } catch (reason) {
        if (!cancelled) setError(visibleError(reason, t.previewFailed));
      } finally { if (!cancelled) setLoading(false); }
    }
    void createThumbnails();
    return () => {
      cancelled = true;
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, [file]);

  function movePage(targetId: string, sourceId = draggedIdRef.current) {
    if (!sourceId || sourceId === targetId) return;
    setPages((current) => {
      const sourceIndex = current.findIndex((page) => page.id === sourceId);
      const targetIndex = current.findIndex((page) => page.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setOverId(null);
  }

  function moveBy(pageId: string, direction: -1 | 1) {
    setPages((current) => {
      const sourceIndex = current.findIndex((page) => page.id === pageId);
      const targetIndex = sourceIndex + direction;
      if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      [next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]];
      return next;
    });
  }

  async function generate() {
    if (!pages.length) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const source = await loadPdf(file);
      const output = await PDFDocument.create({ updateMetadata: false });
      const copiedPages = await output.copyPages(source, pages.map((page) => page.originalIndex));
      copiedPages.forEach((page) => output.addPage(page));
      const bytes = await savePdf(output);
      const name = `${safeName(file.name)}-rearranged.pdf`;
      const url = await downloadBytes(bytes, name);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = url;
      setResult({ url, name, size: bytes.byteLength });
    } catch (reason) { setError(visibleError(reason, t.processFailed)); }
    finally { setBusy(false); setDraggedId(null); setOverId(null); draggedIdRef.current = null; }
  }

  return <section className="reorder-workspace" aria-label={t.reorderLabel}>
    <div className="reorder-header"><div><strong>{file.name}</strong><span>{loading ? t.previewingPages : t.reorderSummary(pages.length)}</span></div><button type="button" className="secondary" onClick={onReset}><Trash2 size={16} /> {t.changeFile}</button></div>
    {loading && <div className="reorder-loading"><LoaderCircle size={22} className="spin" /> {t.loadingPages}</div>}
    {!loading && pages.length > 0 && <div className="reorder-grid" onDragEnd={() => { setDraggedId(null); setOverId(null); draggedIdRef.current = null; }}>
      {pages.map((page, index) => <article key={page.id} className={`reorder-page ${draggedId === page.id ? "is-dragging" : ""} ${overId === page.id ? "is-over" : ""}`} draggable onDragStart={(event) => { draggedIdRef.current = page.id; setDraggedId(page.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", page.id); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; if (draggedIdRef.current !== page.id) setOverId(page.id); }} onDrop={(event) => { event.preventDefault(); movePage(page.id); }} onDragLeave={() => setOverId((current) => current === page.id ? null : current)}>
        <div className="reorder-page-toolbar"><span>{t.pageLabel(index + 1)} <small>{t.originalPageLabel(page.originalIndex + 1)}</small></span><div className="reorder-page-controls"><button type="button" className="reorder-move-button" title={t.moveForward} aria-label={t.movePageForward(index + 1)} disabled={index === 0} onClick={() => moveBy(page.id, -1)}><MoveLeft size={14} /></button><button type="button" className="reorder-move-button" title={t.moveBackward} aria-label={t.movePageBackward(index + 1)} disabled={index === pages.length - 1} onClick={() => moveBy(page.id, 1)}><MoveRight size={14} /></button><GripVertical size={16} aria-hidden="true" /></div></div><div className="reorder-thumbnail"><img src={page.thumbnail} alt={t.originalPageLabel(page.originalIndex + 1)} draggable={false} /><span>{page.originalIndex + 1}</span></div>
      </article>)}
    </div>}
    {error && <div className="result-panel reorder-error" role="alert">{error}</div>}
    <div className="reorder-actions"><button className="primary" type="button" disabled={loading || busy || pages.length < 1} onClick={() => void generate()}>{busy ? <LoaderCircle size={17} className="spin" /> : <WandSparkles size={17} />} {busy ? t.generating : t.generatePdf}</button><span>{t.reorderHint}</span></div>
    {result && <div className="result-panel"><span><Check size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />{t.generated} {result.name} · {formatSize(result.size)}</span><a href={result.url} download={result.name}><Download size={15} style={{ verticalAlign: "-3px", marginRight: 5 }} />{t.downloadAgain}</a></div>}
  </section>;
}
