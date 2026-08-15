"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, BadgeCheck, Bookmark, BookOpenCheck, Crop, Eye, FileArchive, FileCheck2, FileCode2, FileCog, FileDown, FileImage, FileKey2, FileLock2, FileMinus2, FileOutput, FilePenLine, FilePlus2, FileSearch2, FileSignature, FileSpreadsheet, FileStack, FileText, FileType2, FileUp, FileUser, FileX2, Globe2, Hash, ImageDown, ImagePlus, Images, KeyRound, Layers, Maximize2, Minimize2, Monitor, Moon, NotebookPen, PanelTop, QrCode, ReceiptText, RotateCcw, ScanLine, ScanText, Scissors, ShieldCheck, Shrink, SlidersHorizontal, Sparkles, Stamp, Sun, WandSparkles, Wrench, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "./BrandMark";
import { createCopy, localeLabels, localeNames, type Locale } from "../lib/i18n";

type Theme = "light" | "dark";
type ToolIconTone = "blue" | "teal" | "orange" | "violet" | "green" | "rose";
type ToolIconSpec = { icon: LucideIcon; tone: ToolIconTone };

const toolIcons: Record<string, ToolIconSpec> = {
  "split-pdf": { icon: Scissors, tone: "orange" },
  "compress-pdf": { icon: Minimize2, tone: "teal" },
  "edit-pdf": { icon: FilePenLine, tone: "violet" },
  "sign-pdf": { icon: FileSignature, tone: "blue" },
  "pdf-converter": { icon: ArrowLeftRight, tone: "violet" },
  "images-to-pdf": { icon: Images, tone: "teal" },
  "pdf-to-images": { icon: ImageDown, tone: "orange" },
  "extract-images": { icon: ImagePlus, tone: "teal" },
  "lock-pdf": { icon: FileLock2, tone: "blue" },
  "unlock-pdf": { icon: FileKey2, tone: "orange" },
  "rotate-pdf-pages": { icon: RotateCcw, tone: "violet" },
  "remove-pdf-pages": { icon: FileMinus2, tone: "rose" },
  "extract-pdf-pages": { icon: FileOutput, tone: "teal" },
  "rearrange-pdf-pages": { icon: FileStack, tone: "blue" },
  "webpage-to-pdf": { icon: Globe2, tone: "teal" },
  "ocr-pdf": { icon: ScanText, tone: "violet" },
  "add-watermark": { icon: Stamp, tone: "orange" },
  "add-page-numbers": { icon: Hash, tone: "blue" },
  "overlay-pdf": { icon: Layers, tone: "violet" },
  "compare-pdf": { icon: FileSearch2, tone: "orange" },
  "optimize-pdf": { icon: WandSparkles, tone: "teal" },
  "redact-pdf": { icon: FileX2, tone: "rose" },
  "create-pdf": { icon: FilePlus2, tone: "blue" },
  "convert-to-pdf": { icon: FileUp, tone: "orange" },
  "convert-from-pdf": { icon: FileDown, tone: "teal" },
  "remove-pdf-metadata": { icon: FileArchive, tone: "rose" },
  "change-pdf-doc-info": { icon: FileCog, tone: "blue" },
  "bookmark-pdf": { icon: Bookmark, tone: "orange" },
  "flatten-pdf": { icon: Shrink, tone: "violet" },
  "annotate-pdf": { icon: NotebookPen, tone: "violet" },
  "pages-per-sheet": { icon: PanelTop, tone: "teal" },
  "change-pdf-page-size": { icon: Maximize2, tone: "blue" },
  "halve-pdf-pages": { icon: Crop, tone: "orange" },
  "crop-pdf": { icon: Crop, tone: "orange" },
  "repair-pdf": { icon: Wrench, tone: "teal" },
  "scan-pdf": { icon: ScanLine, tone: "blue" },
  "create-job-application": { icon: FileUser, tone: "violet" },
  "view-pdf": { icon: Eye, tone: "blue" },
  "set-pdf-viewer-preferences": { icon: SlidersHorizontal, tone: "teal" },
  "create-invoice": { icon: ReceiptText, tone: "orange" },
  "create-invoice-visually": { icon: FilePenLine, tone: "violet" },
  "create-electronic-invoice": { icon: BadgeCheck, tone: "green" },
  "generate-password": { icon: KeyRound, tone: "blue" },
  "generate-qr-code": { icon: QrCode, tone: "teal" },
  "fill-out-pdf": { icon: FileCheck2, tone: "green" },
  "create-fillable-pdf-form": { icon: FileCheck2, tone: "green" },
  "pdf-to-png": { icon: ImageDown, tone: "orange" },
  "pdf-to-secure-pdf": { icon: ShieldCheck, tone: "blue" },
  "heic-to-jpg": { icon: FileImage, tone: "orange" },
  "heic-to-png": { icon: FileImage, tone: "teal" },
  "webp-to-jpg": { icon: FileImage, tone: "orange" },
  "webp-to-png": { icon: FileImage, tone: "teal" },
  "pdf-printer": { icon: Monitor, tone: "blue" },
  "pdf-reader": { icon: BookOpenCheck, tone: "violet" },
};

function resolveFormatIcon(slug: string): ToolIconSpec | null {
  const format = slug.replace(/^(pdf-to-|pdf-to-secure-)|(-to-pdf)$/g, "");
  if (["word", "doc", "docx"].includes(format)) return { icon: FileType2, tone: "blue" };
  if (["powerpoint", "ppt", "pptx"].includes(format)) return { icon: PanelTop, tone: "orange" };
  if (["excel", "xls", "xlsx", "ods"].includes(format)) return { icon: FileSpreadsheet, tone: "green" };
  if (["jpg", "png", "webp", "heic", "tiff"].includes(format)) return { icon: FileImage, tone: "teal" };
  if (["html", "markdown"].includes(format)) return { icon: FileCode2, tone: "violet" };
  if (["txt", "rtf", "epub", "odt", "odg", "odp"].includes(format)) return { icon: FileText, tone: "blue" };
  return null;
}

function resolveToolIcon(slug?: string): ToolIconSpec {
  if (!slug) return { icon: Sparkles, tone: "blue" };
  return toolIcons[slug] ?? resolveFormatIcon(slug) ?? { icon: FileText, tone: "blue" };
}

function MergePdfIcon({ compact }: { compact: boolean }) {
  return <svg className="merge-pdf-glyph" viewBox="0 0 256 256" width={compact ? 18 : 29} height={compact ? 18 : 29} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="18" y="18" width="220" height="220" rx="48" fill="#E7F3FF" />
    <path d="M62 69C62 60.716 68.716 54 77 54H133L161 82V167C161 175.284 154.284 182 146 182H77C68.716 182 62 175.284 62 167V69Z" fill="#FFFFFF" stroke="#0879DC" strokeWidth="9" strokeLinejoin="round" />
    <path d="M133 54V82H161" fill="#BFE5FF" stroke="#0879DC" strokeWidth="9" strokeLinejoin="round" />
    <path d="M92 109H132M92 133H121M92 157H114" stroke="#8DBFE7" strokeWidth="9" strokeLinecap="round" />
    <path d="M116 91C116 82.716 122.716 76 131 76H178L202 100V174C202 182.284 195.284 189 187 189H131C122.716 189 116 182.284 116 174V91Z" fill="#FFFFFF" stroke="#0759B8" strokeWidth="9" strokeLinejoin="round" />
    <path d="M178 76V100H202" fill="#81CEF7" stroke="#0759B8" strokeWidth="9" strokeLinejoin="round" />
    <path d="M143 137L185 112L171 153L159 139L143 137Z" fill="#0879DC" stroke="#0759B8" strokeWidth="5" strokeLinejoin="round" />
    <path d="M159 139L171 153" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
    <path d="M52 192C66 216 94 222 116 211" stroke="#FF8611" strokeWidth="10" strokeLinecap="round" />
    <path d="M109 197L119 211L102 214" fill="#FF8611" />
  </svg>;
}

const chromeCopy: Record<Locale, { openMenu: string; closeMenu: string; home: string; primaryNav: string; moreNav: string; localFiles: string }> = {
  en: { openMenu: "Open menu", closeMenu: "Close menu", home: "PaperPilot home", primaryNav: "Primary navigation", moreNav: "More navigation", localFiles: "Files are processed locally in the browser by default" },
  de: { openMenu: "Menü öffnen", closeMenu: "Menü schließen", home: "PaperPilot Startseite", primaryNav: "Hauptnavigation", moreNav: "Weitere Navigation", localFiles: "Dateien werden standardmäßig lokal im Browser verarbeitet" },
  fr: { openMenu: "Ouvrir le menu", closeMenu: "Fermer le menu", home: "Accueil PaperPilot", primaryNav: "Navigation principale", moreNav: "Navigation supplémentaire", localFiles: "Les fichiers sont traités localement dans le navigateur par défaut" },
  nl: { openMenu: "Menu openen", closeMenu: "Menu sluiten", home: "PaperPilot startpagina", primaryNav: "Hoofdnavigatie", moreNav: "Meer navigatie", localFiles: "Bestanden worden standaard lokaal in de browser verwerkt" },
  ja: { openMenu: "メニューを開く", closeMenu: "メニューを閉じる", home: "PaperPilot ホーム", primaryNav: "メインナビゲーション", moreNav: "その他のナビゲーション", localFiles: "ファイルは既定でブラウザー内で処理されます" },
  ko: { openMenu: "메뉴 열기", closeMenu: "메뉴 닫기", home: "PaperPilot 홈", primaryNav: "기본 탐색", moreNav: "추가 탐색", localFiles: "파일은 기본적으로 브라우저에서 로컬 처리됩니다" },
  zh: { openMenu: "打开菜单", closeMenu: "关闭菜单", home: "PaperPilot 首页", primaryNav: "主导航", moreNav: "更多导航", localFiles: "文件默认在浏览器本地处理" },
  ru: { openMenu: "Открыть меню", closeMenu: "Закрыть меню", home: "Главная PaperPilot", primaryNav: "Основная навигация", moreNav: "Дополнительная навигация", localFiles: "По умолчанию файлы обрабатываются локально в браузере" },
};

export function SiteChrome({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  const copy = createCopy(locale);
  const chrome = chromeCopy[locale];
  const [theme, setTheme] = useState<Theme>("light");
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const menuTitle = menuOpen ? chrome.closeMenu : chrome.openMenu;

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("paperpilot-theme") as Theme | null;
    const initialTheme = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
    setTheme(initialTheme);
    document.documentElement.dataset.theme = initialTheme;
  }, []);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false);
      if (languageRef.current && !languageRef.current.contains(target)) setLanguageOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") { setMenuOpen(false); setLanguageOpen(false); } }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("mousedown", closeOnOutsideClick); document.removeEventListener("keydown", closeOnEscape); };
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("paperpilot-theme", nextTheme);
  }

  function selectLanguage(nextLocale: Locale) {
    document.cookie = `paperpilot-locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    setLanguageOpen(false);
    router.refresh();
  }

  return <div className="app-shell">
    <header className="topbar">
      <Link className="brand" href="/" aria-label={chrome.home}><BrandMark /> PaperPilot</Link>
      <nav className="topnav" aria-label={chrome.primaryNav}><Link href="/all-tools">{copy.navAllTools}</Link><Link href="/about">{copy.navAbout}</Link></nav>
      <div className="top-actions" ref={menuRef}>
        <div className="language-switch" ref={languageRef}>
          <button className={`icon-button language-button ${languageOpen ? "active" : ""}`} type="button" title={localeNames[locale]} aria-label={localeNames[locale]} aria-expanded={languageOpen} onClick={() => setLanguageOpen((open) => !open)}>{localeLabels[locale]}</button>
          {languageOpen && <div className="site-menu language-menu" role="menu" aria-label={copy.language}>{(["en", "de", "fr", "nl", "ja", "ko", "zh", "ru"] as Locale[]).map((value) => <button key={value} type="button" className={`language-option ${value === locale ? "active" : ""}`} onClick={() => selectLanguage(value)}>{localeLabels[value]} <span>{localeNames[value]}</span></button>)}</div>}
        </div>
        <button className="icon-button" type="button" title={theme === "light" ? copy.themeDark : copy.themeLight} aria-label={theme === "light" ? copy.themeDark : copy.themeLight} onClick={toggleTheme}>{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</button>
        <button className={`icon-button ${menuOpen ? "active" : ""}`} type="button" title={menuTitle} aria-label={menuTitle} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <span className="menu-glyph" aria-hidden="true"><i /><i /><i /></span>}</button>
        {menuOpen && <div className="site-menu" role="menu" aria-label={chrome.moreNav}><Link href="/all-tools" role="menuitem" onClick={() => setMenuOpen(false)}>{copy.navAllTools}</Link><Link href="/about" role="menuitem" onClick={() => setMenuOpen(false)}>{copy.navAbout}</Link><Link href="/faq" role="menuitem" onClick={() => setMenuOpen(false)}>{copy.navFaq}</Link><Link href="/contact" role="menuitem" onClick={() => setMenuOpen(false)}>{copy.navContact}</Link><Link href="/privacy" role="menuitem" onClick={() => setMenuOpen(false)}>{copy.navPrivacy}</Link></div>}
      </div>
    </header>
    {children}
    <footer className="footer"><Link href="/about">{copy.navAbout} PaperPilot</Link><Link href="/faq">{copy.navFaq}</Link><Link href="/contact">{copy.navContact}</Link><Link href="/privacy">{copy.navPrivacy}</Link><Link href="/terms">{copy.navTerms}</Link><span><ShieldCheck size={13} style={{ verticalAlign: "-2px" }} /> {chrome.localFiles}</span><span>© 2026 PaperPilot</span></footer>
  </div>;
}

export function ToolIcon({ slug, compact = false }: { slug?: string; compact?: boolean }) {
  if (slug === "merge-pdf") return <span className={`tool-icon tool-icon-merge ${compact ? "tool-icon-compact" : ""}`} aria-hidden="true"><MergePdfIcon compact={compact} /></span>;
  const { icon: Icon, tone } = resolveToolIcon(slug);
  return <span className={`tool-icon tool-icon-${tone} ${compact ? "tool-icon-compact" : ""}`} aria-hidden="true"><Icon size={compact ? 15 : 18} strokeWidth={2.1} /></span>;
}
