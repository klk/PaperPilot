export type ToolCategory = "popular" | "manage" | "to-pdf" | "from-pdf" | "image" | "desktop";
export type ToolOperation =
  | "merge" | "split" | "compress" | "generic" | "images-to-pdf" | "pdf-to-images"
  | "rotate" | "remove-pages" | "extract-pages" | "rearrange" | "watermark"
  | "page-numbers" | "overlay" | "metadata" | "text-pdf" | "page-size" | "pages-per-sheet" | "crop"
  | "password" | "office" | "ocr" | "webpage" | "image-convert" | "convert-to-pdf" | "convert-from-pdf" | "edit" | "sign" | "redact";

export type Tool = {
  slug: string;
  label: string;
  enLabel: string;
  description: string;
  category: ToolCategory;
  operation: ToolOperation;
  popular?: boolean;
  formatHint?: string;
  published?: boolean;
};

const tool = (slug: string, label: string, enLabel: string, description: string, category: ToolCategory, operation: ToolOperation, extra: Partial<Tool> = {}): Tool => ({ slug, label, enLabel, description, category, operation, ...extra });

export const tools: Tool[] = [
  tool("merge-pdf", "合并 PDF", "Merge PDF", "把多个 PDF 合并成一个有序文档。", "popular", "merge", { popular: true }),
  tool("split-pdf", "拆分 PDF", "Split PDF", "按页码或范围拆分 PDF 文件。", "popular", "split", { popular: true }),
  tool("compress-pdf", "压缩 PDF", "Compress PDF", "减少 PDF 文件体积，便于分享和上传。", "popular", "compress", { popular: true }),
  tool("edit-pdf", "编辑 PDF", "Edit PDF", "在 PDF 页面上自由涂鸦并下载编辑后的文件。", "popular", "edit", { popular: true }),
  tool("sign-pdf", "签署 PDF", "Sign PDF", "在 PDF 中添加电子签名。", "popular", "sign", { popular: true }),
  tool("pdf-converter", "PDF 转换器", "PDF Converter", "在 PDF 与常见文件格式之间转换。", "popular", "office", { popular: true }),
  tool("images-to-pdf", "图片转 PDF", "Images to PDF", "把 JPG、PNG 等图片整理为 PDF。", "popular", "images-to-pdf", { popular: true }),
  tool("pdf-to-images", "PDF 转图片", "PDF to Images", "将 PDF 页面导出为图片。", "popular", "pdf-to-images", { popular: true }),
  tool("extract-images", "提取 PDF 图片", "Extract Images", "提取 PDF 内嵌的图片资源。", "popular", "generic", { popular: true }),
  tool("lock-pdf", "保护 PDF", "Protect PDF", "使用密码保护 PDF 文件。", "manage", "password"),
  tool("unlock-pdf", "解除 PDF 保护", "Unlock PDF", "移除你有权访问的 PDF 密码保护。", "manage", "password"),
  tool("rotate-pdf-pages", "旋转 PDF 页面", "Rotate PDF Pages", "批量旋转 PDF 页面方向。", "manage", "rotate"),
  tool("remove-pdf-pages", "删除 PDF 页面", "Remove PDF Pages", "删除不需要的 PDF 页面。", "manage", "remove-pages"),
  tool("extract-pdf-pages", "提取 PDF 页面", "Extract PDF Pages", "从 PDF 中提取选定页面。", "manage", "extract-pages"),
  tool("rearrange-pdf-pages", "重排 PDF 页面", "Rearrange PDF Pages", "按新的顺序整理 PDF 页面。", "manage", "rearrange"),
  tool("webpage-to-pdf", "网页转 PDF", "Webpage to PDF", "将公开网页保存为 PDF。", "manage", "webpage"),
  tool("ocr-pdf", "OCR 文本识别", "OCR PDF", "识别扫描件中的文字并生成可搜索 PDF。", "manage", "ocr"),
  tool("add-watermark", "添加水印", "Add Watermark", "在 PDF 页面添加文字水印。", "manage", "watermark"),
  tool("add-page-numbers", "添加页码", "Add Page Numbers", "为 PDF 页面添加页码。", "manage", "page-numbers"),
  tool("overlay-pdf", "PDF 叠加", "Overlay PDF", "将一个 PDF 页面叠加到另一个 PDF 上。", "manage", "overlay"),
  tool("compare-pdf", "比较 PDF", "Compare PDF", "并排比较两个 PDF 文件。", "manage", "generic"),
  tool("optimize-pdf", "优化 PDF", "Optimize PDF", "整理 PDF 结构以提升网页加载速度。", "manage", "compress"),
  tool("redact-pdf", "密文标记", "Redact PDF", "遮盖 PDF 中的敏感信息。", "manage", "redact"),
  tool("create-pdf", "生成 PDF", "Create PDF", "从文字内容快速生成 PDF。", "manage", "text-pdf"),
  tool("convert-to-pdf", "转换为 PDF", "Convert to PDF", "把 Word、Excel、PowerPoint、图像和其他文件转换为 PDF。", "to-pdf", "convert-to-pdf"),
  tool("convert-from-pdf", "将 PDF 转换成…", "Convert from PDF", "将 PDF 转换为文本、HTML、Office、图像和其他格式。", "from-pdf", "convert-from-pdf"),
  tool("remove-pdf-metadata", "移除 PDF 元数据", "Remove PDF Metadata", "删除作者、标题等文档元数据。", "manage", "metadata"),
  tool("change-pdf-doc-info", "修改文档信息", "Change PDF Info", "修改标题、作者、主题和关键词。", "manage", "metadata"),
  tool("bookmark-pdf", "PDF 书签", "Bookmark PDF", "管理 PDF 中的书签。", "manage", "generic"),
  tool("flatten-pdf", "扁平化 PDF", "Flatten PDF", "将表单和注释固定到 PDF 页面。", "manage", "generic"),
  tool("annotate-pdf", "注释 PDF", "Annotate PDF", "为 PDF 增加文字和视觉注释。", "manage", "generic"),
  tool("pages-per-sheet", "每页页面数", "Pages per Sheet", "把多页缩印到一张纸上。", "manage", "pages-per-sheet"),
  tool("change-pdf-page-size", "更改页面大小", "Change PDF Page Size", "统一或更改 PDF 页面尺寸。", "manage", "page-size"),
  tool("halve-pdf-pages", "页面裁切为两半", "Halve PDF Pages", "把扫描的对开页面裁切为两页。", "manage", "crop"),
  tool("crop-pdf", "裁剪 PDF", "Crop PDF", "裁去页面边缘的空白区域。", "manage", "crop"),
  tool("repair-pdf", "修复 PDF", "Repair PDF", "尝试重建损坏 PDF 的可读结构。", "manage", "generic"),
  tool("scan-pdf", "扫描为 PDF", "Scan to PDF", "从摄像头拍摄页面并生成 PDF。", "manage", "images-to-pdf"),
  tool("create-job-application", "求职申请书", "Create Job Application", "生成结构清晰的 PDF 求职申请书。", "manage", "text-pdf"),
  tool("view-pdf", "查看 PDF", "View PDF", "在浏览器中快速查看 PDF。", "manage", "generic"),
  tool("set-pdf-viewer-preferences", "查看器偏好", "Viewer Preferences", "设置 PDF 打开时的查看偏好。", "manage", "generic"),
  tool("create-invoice", "创建账单", "Create Invoice", "创建简单的 PDF 发票。", "manage", "text-pdf"),
  tool("create-invoice-visually", "可视化创建账单", "Visual Invoice", "通过表单创建好看的 PDF 账单。", "manage", "text-pdf"),
  tool("create-electronic-invoice", "创建电子账单", "Electronic Invoice", "创建适用于企业流程的电子发票。", "manage", "text-pdf"),
  tool("generate-password", "生成密码", "Generate Password", "生成安全的随机密码。", "manage", "generic"),
  tool("generate-qr-code", "生成二维码", "Generate QR Code", "将链接或文本生成二维码图片。", "manage", "generic"),
  tool("fill-out-pdf", "填写 PDF", "Fill PDF", "填写已有的 PDF 表单。", "manage", "generic"),
  tool("create-fillable-pdf-form", "创建可填写表单", "Create Fillable Form", "创建可填写的 PDF 表单。", "manage", "generic"),
  ...[
    ["word", "Word", "Word"], ["powerpoint", "PowerPoint", "PowerPoint"], ["excel", "Excel", "Excel"], ["jpg", "JPG", "JPG"], ["png", "PNG", "PNG"], ["webp", "WEBP", "WEBP"], ["heic", "HEIC", "HEIC"], ["svg", "SVG", "SVG"], ["tiff", "TIFF", "TIFF"], ["docx", "DOCX", "DOCX"], ["pptx", "PPTX", "PPTX"], ["xlsx", "XLSX", "XLSX"], ["doc", "DOC", "DOC"], ["ppt", "PPT", "PPT"], ["xls", "XLS", "XLS"], ["odt", "ODT", "ODT"], ["odg", "ODG", "ODG"], ["ods", "ODS", "ODS"], ["odp", "ODP", "ODP"], ["txt", "文本", "Text"], ["rtf", "RTF", "RTF"], ["epub", "EPUB", "EPUB"], ["markdown", "Markdown", "Markdown"]
  ].map(([format, label, en]) => tool(`${format}-to-pdf`, `${label} 转 PDF`, `${en} to PDF`, `将 ${label} 文件转换为 PDF。`, "to-pdf", "convert-to-pdf", { formatHint: format })),
  ...[
    ["word", "Word", "Word"], ["powerpoint", "PowerPoint", "PowerPoint"], ["excel", "Excel", "Excel"], ["jpg", "JPG", "JPG"], ["png", "PNG", "PNG"], ["docx", "DOCX", "DOCX"], ["pptx", "PPTX", "PPTX"], ["xlsx", "XLSX", "XLSX"], ["txt", "文本", "Text"], ["rtf", "RTF", "RTF"], ["epub", "EPUB", "EPUB"], ["html", "HTML", "HTML"]
  ].map(([format, label, en]) => tool(`pdf-to-${format}`, `PDF 转 ${label}`, `PDF to ${en}`, `将 PDF 转换为 ${label} 文件。`, "from-pdf", "convert-from-pdf", { formatHint: format })),
  tool("pdf-to-png", "PDF 转 PNG", "PDF to PNG", "将 PDF 页面转换为 PNG 图片。", "from-pdf", "pdf-to-images"),
  tool("pdf-to-secure-pdf", "PDF 转安全 PDF", "PDF to Secure PDF", "生成适合安全分享的 PDF。", "from-pdf", "password"),
  tool("heic-to-jpg", "HEIC 转 JPG", "HEIC to JPG", "将 HEIC 图片转换成 JPG。", "image", "image-convert"),
  tool("heic-to-png", "HEIC 转 PNG", "HEIC to PNG", "将 HEIC 图片转换成 PNG。", "image", "image-convert"),
  tool("webp-to-jpg", "WEBP 转 JPG", "WEBP to JPG", "将 WEBP 图片转换成 JPG。", "image", "image-convert"),
  tool("webp-to-png", "WEBP 转 PNG", "WEBP to PNG", "将 WEBP 图片转换成 PNG。", "image", "image-convert"),
  tool("pdf-printer", "PDF 打印机", "PDF Printer", "了解 PaperPilot 桌面打印方案。", "desktop", "generic"),
  tool("pdf-reader", "PDF 阅读器", "PDF Reader", "快速查看 PDF 文件。", "desktop", "generic"),
];

export const uniqueTools = tools.filter((item, index, all) => all.findIndex((candidate) => candidate.slug === item.slug) === index);

export const toolMap = new Map(uniqueTools.map((item) => [item.slug, item]));

export type ToolWithState = Tool & { published: boolean };

export function mergeToolPublishState(publishState: Record<string, { published: boolean }>) {
  return uniqueTools.map((tool) => ({ ...tool, published: publishState[tool.slug]?.published ?? true }));
}

export const categories: Array<{ id: ToolCategory; label: string }> = [
  { id: "popular", label: "常用工具" },
  { id: "manage", label: "整理与编辑" },
  { id: "to-pdf", label: "转换为 PDF" },
  { id: "from-pdf", label: "将 PDF 转换成…" },
  { id: "image", label: "图片工具" },
  { id: "desktop", label: "桌面应用" },
];
