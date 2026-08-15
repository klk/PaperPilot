"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Moon, ShieldCheck, Sparkles, Sun, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "./BrandMark";
import { createCopy, localeLabels, localeNames, type Locale } from "../lib/i18n";

type Theme = "light" | "dark";

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

export function ToolIcon() { return <span className="tool-icon" aria-hidden="true"><Sparkles size={17} /></span>; }
