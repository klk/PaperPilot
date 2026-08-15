"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { Check, Circle, Copy, Download, Eraser, FilePlus2, FileText, GripVertical, ImagePlus, LoaderCircle, LockKeyhole, MousePointer2, MoveLeft, MoveRight, Pencil, PenLine, RotateCcw, Save, Shapes, ShieldCheck, Signature, Slash, Spline, Square, Star, Trash2, Triangle, Type, Undo2, Upload, WandSparkles, X } from "lucide-react";
import { degrees, LineCapStyle, PDFDict, PDFDocument, PDFName, PageSizes, rgb, StandardFonts } from "pdf-lib";
import type { Tool } from "../lib/tools";
import type { Locale } from "../lib/i18n";

type LocalFile = { id: string; file: File };
type OverlaySlot = "base" | "overlay";
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

const workspaceCopy = {
  zh: {
    security: "文件保护已激活，默认在此浏览器中处理", unlockSecurity: "仅在浏览器中完成 PDF 解密", chooseFile: "选择文件", dropMulti: "或将文件拖放到这里 · 支持单个或多个文件", dropSingle: "或将文件拖放到这里 · 支持单个 PDF 文件", processing: "处理中...", start: "开始处理", removePassword: "移除密码", clear: "清空", doneAuto: "处理完成后自动下载结果", unlockNote: "上传受密码保护的 PDF 后输入当前密码即可解密", genericNote: "功能页面已上线，复杂处理组件可插拔", generated: "已生成", downloadAgain: "再次下载", moveUp: "上移", moveDown: "下移", remove: "移除", currentPassword: "当前密码", permissions: "权限设置", moreOptions: "更多选项", closePermissions: "关闭权限设置", webpageSecurity: "网页内容会被渲染为 PDF，链接会保留为可点击区域", webpageUrl: "要转换为PDF的网页网址", webpageNote: "使用此功能，即表示您接受我们的使用条款。生成后的 PDF 会保留网页链接，便于点击。", generating: "生成中...", generate: "确定生成", webpageProcessNote: "输入网页地址后直接生成 PDF", pageRange: "页面范围（例如 1-3,5）", pageRangePlaceholder: "留空表示全部页面", rotateAngle: "旋转角度", text: "文本", font: "字体", style: "样式", fontSize: "字体尺寸", colorOpacity: "彩色和透明度", position: "位置", angle: "角度", space: "空格", targetSize: "目标尺寸", newTitle: "新标题（留空会清除常见元数据）", renderDpi: "渲染 DPI", jpegQuality: "JPEG 图片质量", compressionMode: "压缩方式", compressionHint: "将页面重新渲染为 JPEG，适合扫描件和图片型 PDF。", format: "格式", mode: "模式", dpi: "DPI 值", imageQuality: "图像质量", convertToPdf: "转换为 PDF", convertToPdfHint: "支持图像、TXT、Markdown 和 HTML 文件。Office 与 EPUB 文件需要启用转换 worker。", documentContent: "文档内容", documentPlaceholder: "在这里输入文本，每行会成为 PDF 中的一行", openPassword: "打开PDF的密码", browserReady: "浏览器工作区已就绪", browserReadyHint: "该工具需要额外的转换或识别 worker 才能完整运行。当前可上传文件并查看处理边界，核心 PDF 操作无需上传到服务器。", topLeft: "顶端，左", top: "顶端", topRight: "顶端，右", left: "左侧", center: "居中", right: "右侧", bottomLeft: "底部，左", bottom: "底部", bottomRight: "底部，右", tiled: "平铺", processFailed: "处理失败，请检查文件后重试。", previewFailed: "无法预览该文件，请检查 PDF 后重试。", saveFailed: "保存 PDF 失败。", cancel: "取消", select: "选择", editorLabel: "PDF 编辑器", undoPage: "撤销本页最后一个对象", clearPage: "清除本页对象", saving: "正在保存", savePdf: "保存 PDF", previousPage: "上一页", nextPage: "下一页", loading: "正在载入", selectObject: "选择对象", addSignature: "添加签名", textTool: "文字工具", addImage: "添加图片", copySelected: "复制选中对象", deleteSelected: "删除选中对象", pencilTool: "画笔工具", shapeTool: "图形工具", brush: "画笔", type: "类型", pencil: "铅笔", marker: "荧光笔", freeCurve: "自由曲线", straightLine: "直线", width: "宽度", color: "色彩", shape: "图形", rectangle: "矩形", ellipse: "椭圆", triangle: "三角", star: "星形", fill: "填充", stroke: "描边", objectShape: "图形", objectText: "文字", objectSignature: "签名", objectImage: "图片", objectLine: "直线", textContent: "文字内容", textSize: "文字大小", opacity: "透明", openingPdf: "正在打开 PDF", close: "关闭", drawSignature: "手绘签名", uploadImage: "上传图片", signBelow: "在下方区域内签名", clearSignature: "清除签名", createSignature: "创建签名", chooseSignatureImage: "选择本地签名图片", upload: "上传", signaturePreview: "签名预览", addSavedSignature: "点击签名以添加到当前页面", savedSignature: "已保存签名", editorStatusAdded: (count: number) => `已添加 ${count} 个编辑元素`, editorStatusText: "点击页面以添加文字", editorStatusSelect: "选择对象后可移动、缩放、旋转、复制或删除", editorStatusDraw: "在页面上按住鼠标或手指即可开始编辑", changeFile: "更换文件", editedReady: "编辑后的 PDF 已准备好", downloadPdf: "下载 PDF", reorderLabel: "重排 PDF 页面工作区", previewingPages: "正在生成页面预览...", reorderSummary: (count: number) => `共 ${count} 页 · 拖动页面调整顺序`, loadingPages: "正在加载 PDF 页面", pageLabel: (page: number) => `第 ${page} 页`, originalPageLabel: (page: number) => `原第 ${page} 页`, moveForward: "向前移动", moveBackward: "向后移动", movePageForward: (page: number) => `将第 ${page} 页向前移动`, movePageBackward: (page: number) => `将第 ${page} 页向后移动`, generatePdf: "生成 PDF", reorderHint: "调整页面顺序后，点击生成并下载新的 PDF", permissionLabels: ["内容修改", "评论", "打印", "高品质打印", "结合文档", "填写表格", "复制内容", "可使用简易内容复制"] },
  en: {
    security: "File protection is active. Processing stays in this browser by default", unlockSecurity: "PDF unlocking happens in this browser only", chooseFile: "Choose file", dropMulti: "or drop files here · supports one or more files", dropSingle: "or drop a file here · supports one PDF file", processing: "Processing...", start: "Start processing", removePassword: "Remove password", clear: "Clear", doneAuto: "The result downloads automatically when processing finishes", unlockNote: "Upload a protected PDF and enter the current password to unlock it", genericNote: "This tool page is ready. Advanced workers can be plugged in.", generated: "Generated", downloadAgain: "Download again", moveUp: "Move up", moveDown: "Move down", remove: "Remove", currentPassword: "Current password", permissions: "Permissions", moreOptions: "More options", closePermissions: "Close permissions", webpageSecurity: "The webpage will be rendered as a PDF and links remain clickable", webpageUrl: "Webpage URL to convert to PDF", webpageNote: "By using this feature, you accept our terms. Generated PDFs keep webpage links clickable.", generating: "Generating...", generate: "Generate", webpageProcessNote: "Enter a webpage URL and generate the PDF", pageRange: "Page range, e.g. 1-3,5", pageRangePlaceholder: "Leave blank for all pages", rotateAngle: "Rotation angle", text: "Text", font: "Font", style: "Style", fontSize: "Font size", colorOpacity: "Color and opacity", position: "Position", angle: "Angle", space: "Space", targetSize: "Target size", newTitle: "New title, blank clears common metadata", renderDpi: "Render DPI", jpegQuality: "JPEG quality", compressionMode: "Compression mode", compressionHint: "Rerenders pages as JPEG, suitable for scanned or image-heavy PDFs.", format: "Format", mode: "Mode", dpi: "DPI", imageQuality: "Image quality", convertToPdf: "Convert to PDF", convertToPdfHint: "Supports images, TXT, Markdown, and HTML. Office and EPUB need a conversion worker.", documentContent: "Document content", documentPlaceholder: "Enter text here. Each line becomes a line in the PDF.", openPassword: "PDF open password", browserReady: "Browser workspace is ready", browserReadyHint: "This tool needs an extra conversion or recognition worker for full processing. You can upload files and review processing boundaries now.", topLeft: "Top left", top: "Top", topRight: "Top right", left: "Left", center: "Center", right: "Right", bottomLeft: "Bottom left", bottom: "Bottom", bottomRight: "Bottom right", tiled: "Tiled", processFailed: "Processing failed. Check the file and try again.", previewFailed: "The file could not be previewed. Check the PDF and try again.", saveFailed: "Saving the PDF failed.", cancel: "Cancel", select: "Select", editorLabel: "PDF editor", undoPage: "Undo last object on this page", clearPage: "Clear objects on this page", saving: "Saving", savePdf: "Save PDF", previousPage: "Previous page", nextPage: "Next page", loading: "Loading", selectObject: "Select object", addSignature: "Add signature", textTool: "Text tool", addImage: "Add image", copySelected: "Copy selected object", deleteSelected: "Delete selected object", pencilTool: "Drawing tool", shapeTool: "Shape tool", brush: "Brush", type: "Type", pencil: "Pencil", marker: "Highlighter", freeCurve: "Free curve", straightLine: "Straight line", width: "Width", color: "Color", shape: "Shape", rectangle: "Rectangle", ellipse: "Ellipse", triangle: "Triangle", star: "Star", fill: "Fill", stroke: "Stroke", objectShape: "Shape", objectText: "Text", objectSignature: "Signature", objectImage: "Image", objectLine: "Line", textContent: "Text content", textSize: "Text size", opacity: "Opacity", openingPdf: "Opening PDF", close: "Close", drawSignature: "Draw signature", uploadImage: "Upload image", signBelow: "Sign in the area below", clearSignature: "Clear signature", createSignature: "Create signature", chooseSignatureImage: "Choose a local signature image", upload: "Upload", signaturePreview: "Signature preview", addSavedSignature: "Click a signature to add it to the current page", savedSignature: "Saved signature", editorStatusAdded: (count: number) => `${count} edit item${count === 1 ? "" : "s"} added`, editorStatusText: "Click the page to add text", editorStatusSelect: "Select an object to move, resize, rotate, copy, or delete it", editorStatusDraw: "Press on the page with mouse or touch to start editing", changeFile: "Change file", editedReady: "Edited PDF is ready", downloadPdf: "Download PDF", reorderLabel: "Reorder PDF pages workspace", previewingPages: "Generating page previews...", reorderSummary: (count: number) => `${count} pages · drag pages to reorder`, loadingPages: "Loading PDF pages", pageLabel: (page: number) => `Page ${page}`, originalPageLabel: (page: number) => `Original page ${page}`, moveForward: "Move forward", moveBackward: "Move backward", movePageForward: (page: number) => `Move page ${page} forward`, movePageBackward: (page: number) => `Move page ${page} backward`, generatePdf: "Generate PDF", reorderHint: "Reorder pages, then generate and download the new PDF", permissionLabels: ["Content changes", "Comments", "Print", "High-quality print", "Combine documents", "Fill forms", "Copy content", "Copy for accessibility"] },
  de: { security: "Dateischutz ist aktiv. Die Verarbeitung erfolgt standardmäßig in diesem Browser", unlockSecurity: "PDFs werden nur in diesem Browser entsperrt", chooseFile: "Datei auswählen", dropMulti: "oder Dateien hier ablegen · eine oder mehrere Dateien möglich", dropSingle: "oder Datei hier ablegen · eine PDF-Datei möglich", processing: "Wird verarbeitet...", start: "Verarbeitung starten", removePassword: "Passwort entfernen", clear: "Leeren", doneAuto: "Das Ergebnis wird nach Abschluss automatisch heruntergeladen", unlockNote: "Geschützte PDF hochladen und aktuelles Passwort eingeben", generated: "Erstellt", downloadAgain: "Erneut herunterladen", moveUp: "Nach oben", moveDown: "Nach unten", remove: "Entfernen", currentPassword: "Aktuelles Passwort", permissions: "Berechtigungen", moreOptions: "Weitere Optionen", closePermissions: "Berechtigungen schließen", webpageSecurity: "Die Webseite wird als PDF gerendert; Links bleiben anklickbar", webpageUrl: "Webseiten-URL für die PDF-Konvertierung", webpageNote: "Mit der Nutzung akzeptieren Sie unsere Bedingungen. Links bleiben im PDF anklickbar.", generating: "Wird erstellt...", generate: "Erstellen", webpageProcessNote: "Webseiten-URL eingeben und PDF erstellen", pageRange: "Seitenbereich, z. B. 1-3,5", pageRangePlaceholder: "Leer lassen für alle Seiten", rotateAngle: "Drehwinkel", text: "Text", font: "Schriftart", style: "Stil", fontSize: "Schriftgröße", colorOpacity: "Farbe und Deckkraft", position: "Position", angle: "Winkel", space: "Abstand", targetSize: "Zielgröße", newTitle: "Neuer Titel; leer entfernt übliche Metadaten", renderDpi: "Render-DPI", jpegQuality: "JPEG-Qualität", compressionMode: "Komprimierung", compressionHint: "Rendert Seiten als JPEG neu; geeignet für Scans und bildlastige PDFs.", format: "Format", mode: "Modus", imageQuality: "Bildqualität", openPassword: "PDF-Passwort", processFailed: "Verarbeitung fehlgeschlagen. Prüfen Sie die Datei und versuchen Sie es erneut.", cancel: "Abbrechen", select: "Auswählen", savePdf: "PDF speichern", saving: "Wird gespeichert", previousPage: "Vorherige Seite", nextPage: "Nächste Seite", loading: "Wird geladen", addSignature: "Signatur hinzufügen", textTool: "Textwerkzeug", addImage: "Bild hinzufügen", deleteSelected: "Auswahl löschen", pencilTool: "Zeichenwerkzeug", shapeTool: "Formwerkzeug", width: "Breite", color: "Farbe", fill: "Füllung", stroke: "Kontur", opacity: "Deckkraft", close: "Schließen", drawSignature: "Signatur zeichnen", uploadImage: "Bild hochladen", signBelow: "Im Bereich unten unterschreiben", clearSignature: "Signatur löschen", createSignature: "Signatur erstellen", upload: "Hochladen", changeFile: "Datei wechseln", downloadPdf: "PDF herunterladen", generatePdf: "PDF erstellen", permissionLabels: ["Inhalt ändern", "Kommentare", "Drucken", "Hochwertiger Druck", "Dokumente zusammenführen", "Formulare ausfüllen", "Inhalt kopieren", "Barrierefrei kopieren"] },
  fr: { security: "La protection des fichiers est active. Le traitement reste par défaut dans ce navigateur", unlockSecurity: "Le déverrouillage du PDF s’effectue uniquement dans ce navigateur", chooseFile: "Choisir un fichier", dropMulti: "ou déposez les fichiers ici · un ou plusieurs fichiers acceptés", dropSingle: "ou déposez un fichier ici · un seul PDF accepté", processing: "Traitement...", start: "Démarrer le traitement", removePassword: "Supprimer le mot de passe", clear: "Effacer", doneAuto: "Le résultat se télécharge automatiquement à la fin", unlockNote: "Importez un PDF protégé et saisissez son mot de passe", generated: "Généré", downloadAgain: "Télécharger à nouveau", moveUp: "Monter", moveDown: "Descendre", remove: "Supprimer", currentPassword: "Mot de passe actuel", permissions: "Autorisations", moreOptions: "Plus d’options", closePermissions: "Fermer les autorisations", webpageSecurity: "La page web sera rendue en PDF et les liens resteront cliquables", webpageUrl: "URL de la page web à convertir en PDF", webpageNote: "En utilisant cette fonction, vous acceptez nos conditions. Les liens restent cliquables dans le PDF.", generating: "Génération...", generate: "Générer", webpageProcessNote: "Saisissez une URL puis générez le PDF", pageRange: "Plage de pages, ex. 1-3,5", pageRangePlaceholder: "Laisser vide pour toutes les pages", rotateAngle: "Angle de rotation", text: "Texte", font: "Police", style: "Style", fontSize: "Taille de police", colorOpacity: "Couleur et opacité", position: "Position", angle: "Angle", space: "Espacement", targetSize: "Format cible", newTitle: "Nouveau titre ; vide pour effacer les métadonnées courantes", renderDpi: "DPI de rendu", jpegQuality: "Qualité JPEG", compressionMode: "Mode de compression", compressionHint: "Recrée les pages en JPEG, idéal pour les scans et PDF riches en images.", format: "Format", mode: "Mode", imageQuality: "Qualité d’image", openPassword: "Mot de passe d’ouverture du PDF", processFailed: "Échec du traitement. Vérifiez le fichier et réessayez.", cancel: "Annuler", select: "Sélectionner", savePdf: "Enregistrer le PDF", saving: "Enregistrement", previousPage: "Page précédente", nextPage: "Page suivante", loading: "Chargement", addSignature: "Ajouter une signature", textTool: "Outil texte", addImage: "Ajouter une image", deleteSelected: "Supprimer la sélection", pencilTool: "Outil dessin", shapeTool: "Outil formes", width: "Largeur", color: "Couleur", fill: "Remplissage", stroke: "Contour", opacity: "Opacité", close: "Fermer", drawSignature: "Dessiner la signature", uploadImage: "Importer une image", signBelow: "Signez dans la zone ci-dessous", clearSignature: "Effacer la signature", createSignature: "Créer la signature", upload: "Importer", changeFile: "Changer de fichier", downloadPdf: "Télécharger le PDF", generatePdf: "Générer le PDF", permissionLabels: ["Modifier le contenu", "Commentaires", "Imprimer", "Impression haute qualité", "Combiner les documents", "Remplir les formulaires", "Copier le contenu", "Copie accessible"] },
  nl: { security: "Bestandsbeveiliging is actief. Verwerking blijft standaard in deze browser", unlockSecurity: "PDF ontgrendelen gebeurt alleen in deze browser", chooseFile: "Bestand kiezen", dropMulti: "of zet bestanden hier neer · één of meer bestanden", dropSingle: "of zet een bestand hier neer · één PDF-bestand", processing: "Bezig met verwerken...", start: "Verwerking starten", removePassword: "Wachtwoord verwijderen", clear: "Wissen", doneAuto: "Het resultaat wordt na afloop automatisch gedownload", unlockNote: "Upload een beveiligde PDF en voer het huidige wachtwoord in", generated: "Gegenereerd", downloadAgain: "Opnieuw downloaden", moveUp: "Omhoog", moveDown: "Omlaag", remove: "Verwijderen", currentPassword: "Huidig wachtwoord", permissions: "Machtigingen", moreOptions: "Meer opties", closePermissions: "Machtigingen sluiten", webpageSecurity: "De webpagina wordt als PDF weergegeven; links blijven klikbaar", webpageUrl: "Webpagina-URL om naar PDF te converteren", webpageNote: "Door deze functie te gebruiken accepteert u onze voorwaarden. Links blijven klikbaar in de PDF.", generating: "Genereren...", generate: "Genereren", webpageProcessNote: "Voer een webadres in en genereer de PDF", pageRange: "Paginabereik, bijv. 1-3,5", pageRangePlaceholder: "Leeg laten voor alle pagina’s", rotateAngle: "Draaihoek", text: "Tekst", font: "Lettertype", style: "Stijl", fontSize: "Lettergrootte", colorOpacity: "Kleur en dekking", position: "Positie", angle: "Hoek", space: "Afstand", targetSize: "Doelformaat", newTitle: "Nieuwe titel; leeg wist gangbare metadata", renderDpi: "Render-DPI", jpegQuality: "JPEG-kwaliteit", compressionMode: "Compressiemodus", compressionHint: "Rendert pagina’s opnieuw als JPEG; geschikt voor scans en beeldrijke PDF’s.", format: "Formaat", mode: "Modus", imageQuality: "Beeldkwaliteit", openPassword: "PDF-wachtwoord", processFailed: "Verwerking mislukt. Controleer het bestand en probeer opnieuw.", cancel: "Annuleren", select: "Selecteren", savePdf: "PDF opslaan", saving: "Opslaan", previousPage: "Vorige pagina", nextPage: "Volgende pagina", loading: "Laden", addSignature: "Handtekening toevoegen", textTool: "Tekstgereedschap", addImage: "Afbeelding toevoegen", deleteSelected: "Selectie verwijderen", pencilTool: "Tekengereedschap", shapeTool: "Vormgereedschap", width: "Breedte", color: "Kleur", fill: "Vulling", stroke: "Lijn", opacity: "Dekking", close: "Sluiten", drawSignature: "Handtekening tekenen", uploadImage: "Afbeelding uploaden", signBelow: "Zet uw handtekening hieronder", clearSignature: "Handtekening wissen", createSignature: "Handtekening maken", upload: "Uploaden", changeFile: "Bestand wijzigen", downloadPdf: "PDF downloaden", generatePdf: "PDF genereren", permissionLabels: ["Inhoud wijzigen", "Opmerkingen", "Afdrukken", "Hoge afdrukkwaliteit", "Documenten combineren", "Formulieren invullen", "Inhoud kopiëren", "Toegankelijk kopiëren"] },
  ja: { security: "ファイル保護が有効です。処理は既定でこのブラウザー内で行われます", unlockSecurity: "PDF のロック解除はこのブラウザー内だけで行われます", chooseFile: "ファイルを選択", dropMulti: "またはここにファイルをドロップ · 複数ファイル対応", dropSingle: "またはここにファイルをドロップ · PDF 1件に対応", processing: "処理中...", start: "処理を開始", removePassword: "パスワードを削除", clear: "クリア", doneAuto: "処理完了後、結果は自動的にダウンロードされます", unlockNote: "保護された PDF をアップロードし、現在のパスワードを入力してください", generated: "生成済み", downloadAgain: "もう一度ダウンロード", moveUp: "上へ", moveDown: "下へ", remove: "削除", currentPassword: "現在のパスワード", permissions: "権限設定", moreOptions: "その他のオプション", closePermissions: "権限設定を閉じる", webpageSecurity: "ウェブページを PDF に変換し、リンクはクリック可能な状態で保持されます", webpageUrl: "PDF に変換するウェブページの URL", webpageNote: "この機能の利用により利用規約に同意したものとみなされます。PDF 内のリンクはクリックできます。", generating: "生成中...", generate: "生成", webpageProcessNote: "URL を入力して PDF を生成します", pageRange: "ページ範囲（例: 1-3,5）", pageRangePlaceholder: "空欄の場合は全ページ", rotateAngle: "回転角度", text: "テキスト", font: "フォント", style: "スタイル", fontSize: "フォントサイズ", colorOpacity: "色と不透明度", position: "位置", angle: "角度", space: "間隔", targetSize: "出力サイズ", newTitle: "新しいタイトル（空欄で一般的なメタデータを削除）", renderDpi: "レンダリング DPI", jpegQuality: "JPEG 品質", compressionMode: "圧縮方式", compressionHint: "ページを JPEG として再描画します。スキャンや画像中心の PDF に適しています。", format: "形式", mode: "モード", imageQuality: "画像品質", openPassword: "PDF を開くパスワード", processFailed: "処理に失敗しました。ファイルを確認して再試行してください。", cancel: "キャンセル", select: "選択", savePdf: "PDF を保存", saving: "保存中", previousPage: "前のページ", nextPage: "次のページ", loading: "読み込み中", addSignature: "署名を追加", textTool: "テキストツール", addImage: "画像を追加", deleteSelected: "選択項目を削除", pencilTool: "描画ツール", shapeTool: "図形ツール", width: "幅", color: "色", fill: "塗りつぶし", stroke: "線", opacity: "不透明度", close: "閉じる", drawSignature: "署名を描く", uploadImage: "画像をアップロード", signBelow: "下の領域に署名してください", clearSignature: "署名を消去", createSignature: "署名を作成", upload: "アップロード", changeFile: "ファイルを変更", downloadPdf: "PDF をダウンロード", generatePdf: "PDF を生成", permissionLabels: ["内容の変更", "コメント", "印刷", "高品質印刷", "文書の結合", "フォーム入力", "内容のコピー", "アクセシビリティ用コピー"] },
  ko: { security: "파일 보호가 활성화되었습니다. 기본적으로 이 브라우저에서 처리됩니다", unlockSecurity: "PDF 잠금 해제는 이 브라우저에서만 진행됩니다", chooseFile: "파일 선택", dropMulti: "또는 여기에 파일 놓기 · 하나 이상의 파일 지원", dropSingle: "또는 여기에 파일 놓기 · PDF 한 개 지원", processing: "처리 중...", start: "처리 시작", removePassword: "비밀번호 제거", clear: "지우기", doneAuto: "처리가 끝나면 결과가 자동으로 다운로드됩니다", unlockNote: "보호된 PDF를 업로드하고 현재 비밀번호를 입력하세요", generated: "생성됨", downloadAgain: "다시 다운로드", moveUp: "위로", moveDown: "아래로", remove: "제거", currentPassword: "현재 비밀번호", permissions: "권한 설정", moreOptions: "추가 옵션", closePermissions: "권한 설정 닫기", webpageSecurity: "웹페이지를 PDF로 렌더링하며 링크는 클릭 가능한 상태로 유지됩니다", webpageUrl: "PDF로 변환할 웹페이지 URL", webpageNote: "이 기능을 사용하면 이용약관에 동의하게 됩니다. PDF의 링크는 계속 클릭할 수 있습니다.", generating: "생성 중...", generate: "생성", webpageProcessNote: "웹 주소를 입력하고 PDF를 생성하세요", pageRange: "페이지 범위(예: 1-3,5)", pageRangePlaceholder: "비워 두면 전체 페이지", rotateAngle: "회전 각도", text: "텍스트", font: "글꼴", style: "스타일", fontSize: "글꼴 크기", colorOpacity: "색상 및 불투명도", position: "위치", angle: "각도", space: "간격", targetSize: "대상 크기", newTitle: "새 제목(비워 두면 일반 메타데이터 삭제)", renderDpi: "렌더링 DPI", jpegQuality: "JPEG 품질", compressionMode: "압축 방식", compressionHint: "페이지를 JPEG로 다시 렌더링합니다. 스캔 및 이미지 중심 PDF에 적합합니다.", format: "형식", mode: "모드", imageQuality: "이미지 품질", openPassword: "PDF 열기 비밀번호", processFailed: "처리에 실패했습니다. 파일을 확인하고 다시 시도하세요.", cancel: "취소", select: "선택", savePdf: "PDF 저장", saving: "저장 중", previousPage: "이전 페이지", nextPage: "다음 페이지", loading: "불러오는 중", addSignature: "서명 추가", textTool: "텍스트 도구", addImage: "이미지 추가", deleteSelected: "선택 항목 삭제", pencilTool: "그리기 도구", shapeTool: "도형 도구", width: "너비", color: "색상", fill: "채우기", stroke: "테두리", opacity: "불투명도", close: "닫기", drawSignature: "서명 그리기", uploadImage: "이미지 업로드", signBelow: "아래 영역에 서명하세요", clearSignature: "서명 지우기", createSignature: "서명 만들기", upload: "업로드", changeFile: "파일 변경", downloadPdf: "PDF 다운로드", generatePdf: "PDF 생성", permissionLabels: ["내용 수정", "댓글", "인쇄", "고품질 인쇄", "문서 결합", "양식 작성", "내용 복사", "접근성용 복사"] },
  ru: { security: "Защита файлов активна. По умолчанию обработка выполняется в этом браузере", unlockSecurity: "PDF разблокируется только в этом браузере", chooseFile: "Выбрать файл", dropMulti: "или перетащите файлы сюда · поддерживается один или несколько файлов", dropSingle: "или перетащите файл сюда · поддерживается один PDF", processing: "Обработка...", start: "Начать обработку", removePassword: "Удалить пароль", clear: "Очистить", doneAuto: "Результат загрузится автоматически после завершения", unlockNote: "Загрузите защищённый PDF и введите текущий пароль", generated: "Создано", downloadAgain: "Скачать ещё раз", moveUp: "Выше", moveDown: "Ниже", remove: "Удалить", currentPassword: "Текущий пароль", permissions: "Разрешения", moreOptions: "Дополнительные параметры", closePermissions: "Закрыть разрешения", webpageSecurity: "Веб-страница будет преобразована в PDF, ссылки останутся активными", webpageUrl: "URL веб-страницы для преобразования в PDF", webpageNote: "Используя эту функцию, вы принимаете условия. Ссылки в PDF останутся активными.", generating: "Создание...", generate: "Создать", webpageProcessNote: "Введите адрес страницы и создайте PDF", pageRange: "Диапазон страниц, например 1-3,5", pageRangePlaceholder: "Оставьте пустым для всех страниц", rotateAngle: "Угол поворота", text: "Текст", font: "Шрифт", style: "Стиль", fontSize: "Размер шрифта", colorOpacity: "Цвет и прозрачность", position: "Положение", angle: "Угол", space: "Отступ", targetSize: "Целевой размер", newTitle: "Новый заголовок; пустое поле удаляет обычные метаданные", renderDpi: "DPI рендеринга", jpegQuality: "Качество JPEG", compressionMode: "Режим сжатия", compressionHint: "Перерисовывает страницы в JPEG; подходит для сканов и PDF с изображениями.", format: "Формат", mode: "Режим", imageQuality: "Качество изображения", openPassword: "Пароль для открытия PDF", processFailed: "Не удалось обработать файл. Проверьте его и повторите попытку.", cancel: "Отмена", select: "Выбрать", savePdf: "Сохранить PDF", saving: "Сохранение", previousPage: "Предыдущая страница", nextPage: "Следующая страница", loading: "Загрузка", addSignature: "Добавить подпись", textTool: "Текст", addImage: "Добавить изображение", deleteSelected: "Удалить выбранное", pencilTool: "Рисование", shapeTool: "Фигуры", width: "Ширина", color: "Цвет", fill: "Заливка", stroke: "Контур", opacity: "Прозрачность", close: "Закрыть", drawSignature: "Нарисовать подпись", uploadImage: "Загрузить изображение", signBelow: "Распишитесь в области ниже", clearSignature: "Очистить подпись", createSignature: "Создать подпись", upload: "Загрузить", changeFile: "Сменить файл", downloadPdf: "Скачать PDF", generatePdf: "Создать PDF", permissionLabels: ["Изменение содержимого", "Комментарии", "Печать", "Высококачественная печать", "Объединение документов", "Заполнение форм", "Копирование содержимого", "Копирование для доступности"] },
} satisfies Record<Locale, any>;

function workspaceT(locale: Locale) {
  const positions: Record<Locale, Partial<typeof workspaceCopy.en>> = {
    en: {}, zh: {},
    de: { topLeft: "Oben links", top: "Oben", topRight: "Oben rechts", left: "Links", center: "Mitte", right: "Rechts", bottomLeft: "Unten links", bottom: "Unten", bottomRight: "Unten rechts", tiled: "Gekachelt" },
    fr: { topLeft: "En haut à gauche", top: "En haut", topRight: "En haut à droite", left: "À gauche", center: "Au centre", right: "À droite", bottomLeft: "En bas à gauche", bottom: "En bas", bottomRight: "En bas à droite", tiled: "Mosaïque" },
    nl: { topLeft: "Linksboven", top: "Boven", topRight: "Rechtsboven", left: "Links", center: "Midden", right: "Rechts", bottomLeft: "Linksonder", bottom: "Onder", bottomRight: "Rechtsonder", tiled: "Tegelpatroon" },
    ja: { topLeft: "左上", top: "上", topRight: "右上", left: "左", center: "中央", right: "右", bottomLeft: "左下", bottom: "下", bottomRight: "右下", tiled: "並べて表示" },
    ko: { topLeft: "왼쪽 위", top: "위", topRight: "오른쪽 위", left: "왼쪽", center: "가운데", right: "오른쪽", bottomLeft: "왼쪽 아래", bottom: "아래", bottomRight: "오른쪽 아래", tiled: "바둑판식" },
    ru: { topLeft: "Сверху слева", top: "Сверху", topRight: "Сверху справа", left: "Слева", center: "По центру", right: "Справа", bottomLeft: "Снизу слева", bottom: "Снизу", bottomRight: "Снизу справа", tiled: "Мозаика" },
  };
  return { ...workspaceCopy.en, ...(workspaceCopy[locale] || {}), ...positions[locale] };
}

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

const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const safeName = (name: string) => name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").toLowerCase() || "paperpilot-file";

let watermarkFontPromise: Promise<Uint8Array> | null = null;
function loadChineseWatermarkFont() {
  if (!watermarkFontPromise) {
    watermarkFontPromise = (async () => {
      const response = await fetch("/api/fonts/chinese-watermark");
      if (!response.ok) throw new Error("找不到可用的中文字体。");
      return new Uint8Array(await response.arrayBuffer());
    })();
  }
  return watermarkFontPromise;
}

async function loadPdf(file: File) {
  return PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: false, updateMetadata: false });
}

async function savePdf(document: PDFDocument, options: Parameters<PDFDocument["save"]>[0] = { useObjectStreams: true }) {
  const infoRef = document.context.trailerInfo.Info;
  const info = infoRef ? document.context.lookup(infoRef, PDFDict) : undefined;
  const isPdfLibAttribution = (value: string | undefined) => /pdf-lib|Hopding\/pdf-lib/i.test(value || "");
  if (info && isPdfLibAttribution(document.getProducer())) info.delete(PDFName.of("Producer"));
  if (info && isPdfLibAttribution(document.getCreator())) info.delete(PDFName.of("Creator"));
  return document.save(options);
}

async function downloadBytes(bytes: Uint8Array, name: string, type = "application/pdf") {
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

function parsePages(value: string, max: number) {
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

async function imageToPdf(files: File[]) {
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

async function textToPdf(text: string) {
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
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
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

async function compressPdf(file: File, dpi: number, quality: number) {
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

async function pdfToImages(file: File) {
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

async function convertPdfWithOffice(file: File, format: string) {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("format", format);
  const response = await fetch("/api/convert-document", { method: "POST", body: form });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || "Office 文档转换失败");
  }
  return { bytes: new Uint8Array(await response.arrayBuffer()), name: `${safeName(file.name)}.${format}`, type: "application/octet-stream" };
}

async function convertPdfToDocxOnServer(file: File) {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("format", "docx");
  const response = await fetch("/api/convert-document", { method: "POST", body: form });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || "PDF→Word 服务端转换失败");
  }
  return { bytes: new Uint8Array(await response.arrayBuffer()), name: `${safeName(file.name)}.docx`, type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
}

async function convertPdfToPptxOnServer(file: File) {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("format", "pptx");
  const response = await fetch("/api/convert-document", { method: "POST", body: form });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || "PDF→PowerPoint 服务端转换失败");
  }
  return { bytes: new Uint8Array(await response.arrayBuffer()), name: `${safeName(file.name)}.pptx`, type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" };
}

async function convertPdfToEpubOnServer(file: File, mode: string) {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("format", "epub");
  form.append("mode", mode);
  const response = await fetch("/api/convert-document", { method: "POST", body: form });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || "PDF→EPUB 服务端转换失败");
  }
  return { bytes: new Uint8Array(await response.arrayBuffer()), name: `${safeName(file.name)}.epub`, type: "application/epub+zip" };
}

async function convertPdfToXlsxOnServer(file: File) {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("format", "xlsx");
  const response = await fetch("/api/convert-document", { method: "POST", body: form });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || "PDF→Excel 服务端转换失败");
  }
  return { bytes: new Uint8Array(await response.arrayBuffer()), name: `${safeName(file.name)}.xlsx`, type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
}

async function convertPdfToRtfOnServer(file: File) {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("format", "rtf");
  const response = await fetch("/api/convert-document", { method: "POST", body: form });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || "PDF→Rich Text 服务端转换失败");
  }
  return { bytes: new Uint8Array(await response.arrayBuffer()), name: `${safeName(file.name)}.rtf`, type: "application/rtf" };
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

async function convertPdfOutput(file: File, format: string, dpi: number, quality: number, mode: string) {
  const textFormats = ["txt", "html"];
  if (textFormats.includes(format)) {
    const pages = await pdfText(file);
    if (format === "txt") return { bytes: new TextEncoder().encode(`\uFEFF${pages.join("\n\n")}`), name: `${safeName(file.name)}.txt`, type: "text/plain" };
    const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeXml(file.name)}</title><style>body{font-family:system-ui;max-width:860px;margin:40px auto;line-height:1.7}section{margin-bottom:32px;page-break-after:always}h2{color:#60718a}</style></head><body>${pages.map((page, index) => `<section><h2>Page ${index + 1}</h2><p>${escapeXml(page).replace(/\n/g, "<br>")}</p></section>`).join("")}</body></html>`;
    return { bytes: new TextEncoder().encode(html), name: `${safeName(file.name)}.html`, type: "text/html" };
  }
  if (format === "docx") {
    if (mode === "flow") return { bytes: (await convertPdfToDocxOnServer(file)).bytes, name: `${safeName(file.name)}.docx`, type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
    return { bytes: await pdfToDocxPages(file, dpi), name: `${safeName(file.name)}.docx`, type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
  }
  if (format === "pptx") {
    const output = await convertPdfToPptxOnServer(file);
    return { bytes: output.bytes, name: output.name, type: output.type };
  }
  if (format === "epub") {
    const output = await convertPdfToEpubOnServer(file, mode);
    return { bytes: output.bytes, name: output.name, type: output.type };
  }
  if (format === "xlsx") {
    const output = await convertPdfToXlsxOnServer(file);
    return { bytes: output.bytes, name: output.name, type: output.type };
  }
  if (format === "rtf") {
    const output = await convertPdfToRtfOnServer(file);
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
  if (["odt", "odp", "ods"].includes(format)) return convertPdfWithOffice(file, format);
  throw new Error("当前格式需要对应的转换引擎，暂不支持直接生成。");
}

async function convertToPdf(file: File) {
  if (file.type.startsWith("image/")) return imageToPdf([file]);
  if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt") || file.name.toLowerCase().endsWith(".md") || file.name.toLowerCase().endsWith(".html")) return textToPdf(await file.text());
  throw new Error("Word、Excel、PowerPoint、OpenDocument 和 EPUB 需要启用 Office 转换 worker，目前图片、TXT、MD 和 HTML 可直接转换。");
}

async function convertImage(file: File, target: "jpg" | "png") {
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

function PdfEditor({ file, onReset, t, mode = "edit" }: { file: File; onReset: () => void; t: ReturnType<typeof workspaceT>; mode?: "edit" | "sign" | "redact" }) {
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
        if (!cancelled) setError(visibleError(reason, t.previewFailed, t));
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
        if (!cancelled) setError(visibleError(reason, t.previewFailed, t));
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
    } catch (reason) { setError(visibleError(reason, t.previewFailed, t)); }
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
    catch (reason) { setError(visibleError(reason, t.previewFailed, t)); }
  };
  const saveSignature = () => {
    try {
      const dataUrl = signatureView === "draw" ? trimSignatureCanvas(signatureCanvasRef.current!) : signatureUpload;
      if (!dataUrl) throw new Error(t.previewFailed);
      setSavedSignatures((current) => [...current, { id: crypto.randomUUID(), dataUrl, mimeType: "image/png" }]);
      setSignatureView("library");
    } catch (reason) { setError(visibleError(reason, t.previewFailed, t)); }
  };
  const placeSignature = async (signature: SavedSignature) => {
    try { await insertImageObject(signature.dataUrl, signature.mimeType, "signature"); setSignatureOpen(false); }
    catch (reason) { setError(visibleError(reason, t.previewFailed, t)); }
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
    } catch (reason) { setError(visibleError(reason, t.saveFailed, t)); }
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

type ReorderPage = { id: string; originalIndex: number; thumbnail: string };

function ReorderPdfWorkspace({ file, onReset, t }: { file: File; onReset: () => void; t: ReturnType<typeof workspaceT> }) {
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
        if (!cancelled) setError(visibleError(reason, t.previewFailed, t));
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
    } catch (reason) { setError(visibleError(reason, t.processFailed, t)); }
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
  const disabled = webpageTool ? busy || !webpageUrl.trim() : (!files.length || busy || ["generic", "office", "ocr"].includes(tool.operation) || (tool.operation === "password" && unlockTool && !openPassword.trim()));

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
    <div className="security-note"><ShieldCheck size={16} /> {unlockTool ? t.unlockSecurity : t.security}</div>
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
