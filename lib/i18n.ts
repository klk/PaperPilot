export const locales = ["en", "de", "fr", "nl", "ja", "ko", "zh", "ru"] as const;
export type Locale = typeof locales[number];

export const localeLabels: Record<Locale, string> = {
  en: "EN",
  de: "DE",
  fr: "FR",
  nl: "NL",
  ja: "日本語",
  ko: "한국어",
  zh: "中文",
  ru: "RU",
};

export const localeNames: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
  nl: "Nederlands",
  ja: "日本語",
  ko: "한국어",
  zh: "中文",
  ru: "Русский",
};

export function normalizeLocale(value?: string | null): Locale {
  if (!value) return "zh";
  const normalized = value.toLowerCase().replace("_", "-");
  if (normalized.startsWith("en")) return "en";
  if (normalized.startsWith("de")) return "de";
  if (normalized.startsWith("fr")) return "fr";
  if (normalized.startsWith("nl")) return "nl";
  if (normalized.startsWith("ja")) return "ja";
  if (normalized.startsWith("ko")) return "ko";
  if (normalized.startsWith("ru")) return "ru";
  if (normalized.startsWith("zh")) return "zh";
  return "zh";
}

type CommonCopy = {
  navTools: string;
  navPrivacy: string;
  navAdmin: string;
  navAbout: string;
  navFaq: string;
  navContact: string;
  navTerms: string;
  navAllTools: string;
  themeLight: string;
  themeDark: string;
  language: string;
  homeEyebrow: string;
  homeTitle: string;
  homeIntro: string;
  popularTitle: string;
  popularIntro: string;
  allToolsTitle: string;
  allToolsIntro: string;
  moreToolsTitle: string;
  moreToolsIntro: string;
  aboutTitle: string;
  aboutIntro: string;
  contactTitle: string;
  contactIntro: string;
  privacyTitle: string;
  termsTitle: string;
  converterTitle: string;
  converterIntro: string;
};

export const categoryLabels: Record<Locale, Record<string, string>> = {
  zh: {
    manage: "整理与编辑",
    "to-pdf": "转换为 PDF",
    "from-pdf": "将 PDF 转换成…",
    image: "图片工具",
    desktop: "桌面应用",
  },
  en: {
    manage: "Organize & edit",
    "to-pdf": "Convert to PDF",
    "from-pdf": "Convert from PDF",
    image: "Image tools",
    desktop: "Desktop apps",
  },
  de: {
    manage: "Organisieren & bearbeiten",
    "to-pdf": "In PDF umwandeln",
    "from-pdf": "Aus PDF umwandeln",
    image: "Bildwerkzeuge",
    desktop: "Desktop-Apps",
  },
  fr: {
    manage: "Organiser et modifier",
    "to-pdf": "Convertir en PDF",
    "from-pdf": "Convertir depuis PDF",
    image: "Outils d’image",
    desktop: "Applications bureau",
  },
  nl: {
    manage: "Ordenen en bewerken",
    "to-pdf": "Naar PDF converteren",
    "from-pdf": "Van PDF converteren",
    image: "Afbeeldingstools",
    desktop: "Desktop-apps",
  },
  ja: {
    manage: "整理と編集",
    "to-pdf": "PDF に変換",
    "from-pdf": "PDF から変換",
    image: "画像ツール",
    desktop: "デスクトップアプリ",
  },
  ko: {
    manage: "정리 및 편집",
    "to-pdf": "PDF로 변환",
    "from-pdf": "PDF에서 변환",
    image: "이미지 도구",
    desktop: "데스크톱 앱",
  },
  ru: {
    manage: "Организация и редактирование",
    "to-pdf": "В PDF",
    "from-pdf": "Из PDF",
    image: "Инструменты изображений",
    desktop: "Настольные приложения",
  },
};

const toolDescriptions: Partial<Record<Locale, Record<string, string>>> = {
  en: {
    "merge-pdf": "Merge multiple PDF files into one ordered document.",
    "split-pdf": "Split a PDF by pages or ranges.",
    "compress-pdf": "Reduce PDF size for easier sharing and upload.",
    "edit-pdf": "Draw freely on PDF pages and download the edited file.",
    "sign-pdf": "Add an electronic signature to a PDF.",
    "pdf-converter": "Convert between PDF and common file formats.",
    "images-to-pdf": "Turn JPG, PNG, and other images into a PDF.",
    "pdf-to-images": "Export PDF pages as images.",
  },
  de: {
    "merge-pdf": "Mehrere PDF-Dateien zu einem geordneten Dokument zusammenführen.",
    "split-pdf": "Ein PDF nach Seiten oder Bereichen aufteilen.",
    "compress-pdf": "PDF-Dateigröße für einfacheres Teilen und Hochladen reduzieren.",
    "edit-pdf": "PDF-Seiten frei bearbeiten und die geänderte Datei herunterladen.",
    "sign-pdf": "Eine elektronische Signatur zu einem PDF hinzufügen.",
    "pdf-converter": "Zwischen PDF und gängigen Dateiformaten konvertieren.",
    "images-to-pdf": "JPG, PNG und andere Bilder in ein PDF umwandeln.",
    "pdf-to-images": "PDF-Seiten als Bilder exportieren.",
  },
  fr: {
    "merge-pdf": "Fusionnez plusieurs fichiers PDF en un seul document ordonné.",
    "split-pdf": "Scindez un PDF par pages ou par plages.",
    "compress-pdf": "Réduisez la taille d’un PDF pour le partage et l’envoi.",
    "edit-pdf": "Dessinez librement sur les pages PDF puis téléchargez le fichier modifié.",
    "sign-pdf": "Ajoutez une signature électronique à un PDF.",
    "pdf-converter": "Convertissez entre PDF et formats courants.",
    "images-to-pdf": "Transformez des images JPG, PNG et autres en PDF.",
    "pdf-to-images": "Exportez les pages PDF en images.",
  },
  nl: {
    "merge-pdf": "Voeg meerdere PDF-bestanden samen tot één geordend document.",
    "split-pdf": "Splits een PDF op pagina’s of bereiken.",
    "compress-pdf": "Verklein de PDF-grootte om delen en uploaden makkelijker te maken.",
    "edit-pdf": "Teken vrij op PDF-pagina’s en download het bewerkte bestand.",
    "sign-pdf": "Voeg een elektronische handtekening toe aan een PDF.",
    "pdf-converter": "Converteer tussen PDF en gangbare bestandsformaten.",
    "images-to-pdf": "Zet JPG-, PNG- en andere afbeeldingen om naar een PDF.",
    "pdf-to-images": "Exporteer PDF-pagina’s als afbeeldingen.",
  },
  ja: {
    "merge-pdf": "複数の PDF を 1 つの順序ある文書にまとめます。",
    "split-pdf": "PDF をページや範囲で分割します。",
    "compress-pdf": "共有しやすいように PDF のサイズを小さくします。",
    "edit-pdf": "PDF ページに自由に描き込み、編集後のファイルをダウンロードします。",
    "sign-pdf": "PDF に電子署名を追加します。",
    "pdf-converter": "PDF と一般的なファイル形式の間で変換します。",
    "images-to-pdf": "JPG、PNG などの画像を PDF にまとめます。",
    "pdf-to-images": "PDF ページを画像として書き出します。",
  },
  ko: {
    "merge-pdf": "여러 PDF 파일을 하나의 순서 있는 문서로 합칩니다.",
    "split-pdf": "페이지나 범위별로 PDF를 분할합니다.",
    "compress-pdf": "공유와 업로드를 쉽게 하도록 PDF 용량을 줄입니다.",
    "edit-pdf": "PDF 페이지에 자유롭게 그린 뒤 편집본을 내려받습니다.",
    "sign-pdf": "PDF에 전자 서명을 추가합니다.",
    "pdf-converter": "PDF와 일반 파일 형식 사이를 변환합니다.",
    "images-to-pdf": "JPG, PNG 등 이미지를 PDF로 만듭니다.",
    "pdf-to-images": "PDF 페이지를 이미지로 내보냅니다.",
  },
  ru: {
    "merge-pdf": "Объединяйте несколько PDF в один упорядоченный документ.",
    "split-pdf": "Разделяйте PDF по страницам или диапазонам.",
    "compress-pdf": "Уменьшайте размер PDF для удобной отправки и загрузки.",
    "edit-pdf": "Свободно рисуйте на страницах PDF и скачивайте результат.",
    "sign-pdf": "Добавляйте электронную подпись в PDF.",
    "pdf-converter": "Конвертируйте PDF и популярные форматы файлов.",
    "images-to-pdf": "Собирайте JPG, PNG и другие изображения в PDF.",
    "pdf-to-images": "Экспортируйте страницы PDF в изображения.",
  },
};

export function getToolDescription(locale: Locale, slug: string, fallback: string) {
  if (locale === "zh") return fallback;
  const tool = toolMap.get(slug);
  return toolDescriptions[locale]?.[slug] ?? (tool ? genericToolDescription(locale, tool.operation, tool.enLabel) : fallback);
}

function genericToolDescription(locale: Locale, operation: string, label: string) {
  const english = (() => { switch (operation) {
    case "merge": return "Merge multiple PDF files into one document.";
    case "split": return "Split a PDF into smaller files.";
    case "compress": return "Reduce PDF size for sharing and upload.";
    case "edit": return "Edit PDF pages directly in the browser.";
    case "sign": return "Add a signature to a PDF.";
    case "images-to-pdf": return "Turn images into a PDF.";
    case "pdf-to-images": return "Export PDF pages as images.";
    case "rotate": return "Rotate PDF pages in batches.";
    case "remove-pages": return "Remove unwanted pages from a PDF.";
    case "extract-pages": return "Extract selected pages from a PDF.";
    case "rearrange": return "Reorder PDF pages.";
    case "watermark": return "Add text watermarks to PDF pages.";
    case "page-numbers": return "Add page numbers to a PDF.";
    case "overlay": return "Overlay one PDF on another.";
    case "metadata": return "Update or remove PDF metadata.";
    case "text-pdf": return "Create a PDF from text content.";
    case "page-size": return "Change the page size of a PDF.";
    case "crop": return "Crop the edges of PDF pages.";
    case "password": return "Protect a PDF with a password.";
    case "webpage": return "Save a webpage as PDF.";
    case "convert-to-pdf": return "Convert common files to PDF.";
    case "convert-from-pdf": return "Convert PDF to other formats.";
    case "office": return "Convert between PDF and office files.";
    case "ocr": return "Recognize text in scanned PDFs.";
    case "image-convert": return "Convert image formats.";
    default: return `${label} tool.`;
  } })();
  if (locale === "en" || locale === "zh") return english;
  const descriptions: Record<Exclude<Locale, "en" | "zh">, Record<string, string>> = {
    de: { merge: "Mehrere PDF-Dateien zu einem Dokument zusammenführen.", split: "Ein PDF in kleinere Dateien aufteilen.", compress: "Die PDF-Dateigröße reduzieren.", edit: "PDF-Seiten direkt im Browser bearbeiten.", sign: "Eine Signatur zu einem PDF hinzufügen.", "images-to-pdf": "Bilder in ein PDF umwandeln.", "pdf-to-images": "PDF-Seiten als Bilder exportieren.", rotate: "PDF-Seiten stapelweise drehen.", "remove-pages": "Unerwünschte PDF-Seiten entfernen.", "extract-pages": "Ausgewählte PDF-Seiten extrahieren.", rearrange: "PDF-Seiten neu anordnen.", watermark: "Textwasserzeichen zu PDF-Seiten hinzufügen.", "page-numbers": "Seitenzahlen zu einem PDF hinzufügen.", password: "Ein PDF mit einem Passwort schützen.", webpage: "Eine Webseite als PDF speichern.", "convert-to-pdf": "Gängige Dateien in PDF umwandeln.", "convert-from-pdf": "PDF in andere Formate umwandeln.", office: "PDF- und Office-Dateien konvertieren.", ocr: "Text in gescannten PDFs erkennen.", "image-convert": "Bildformate konvertieren." },
    fr: { merge: "Fusionnez plusieurs PDF en un seul document.", split: "Scindez un PDF en fichiers plus petits.", compress: "Réduisez la taille d’un PDF.", edit: "Modifiez les pages PDF dans le navigateur.", sign: "Ajoutez une signature à un PDF.", "images-to-pdf": "Transformez des images en PDF.", "pdf-to-images": "Exportez les pages PDF en images.", rotate: "Faites pivoter les pages PDF par lot.", "remove-pages": "Supprimez les pages PDF inutiles.", "extract-pages": "Extrayez les pages PDF sélectionnées.", rearrange: "Réorganisez les pages PDF.", watermark: "Ajoutez un filigrane texte aux pages PDF.", "page-numbers": "Ajoutez des numéros de page à un PDF.", password: "Protégez un PDF par mot de passe.", webpage: "Enregistrez une page web en PDF.", "convert-to-pdf": "Convertissez les fichiers courants en PDF.", "convert-from-pdf": "Convertissez un PDF vers d’autres formats.", office: "Convertissez PDF et fichiers Office.", ocr: "Reconnaissez le texte des PDF numérisés.", "image-convert": "Convertissez les formats d’image." },
    nl: { merge: "Voeg meerdere PDF-bestanden samen.", split: "Splits een PDF in kleinere bestanden.", compress: "Verklein de PDF-bestandsgrootte.", edit: "Bewerk PDF-pagina’s in de browser.", sign: "Voeg een handtekening toe aan een PDF.", "images-to-pdf": "Zet afbeeldingen om naar PDF.", "pdf-to-images": "Exporteer PDF-pagina’s als afbeeldingen.", rotate: "Draai PDF-pagina’s in één keer.", "remove-pages": "Verwijder ongewenste PDF-pagina’s.", "extract-pages": "Extraheer geselecteerde PDF-pagina’s.", rearrange: "Wijzig de volgorde van PDF-pagina’s.", watermark: "Voeg tekstwatermerken toe aan PDF-pagina’s.", "page-numbers": "Voeg paginanummers toe aan een PDF.", password: "Beveilig een PDF met een wachtwoord.", webpage: "Sla een webpagina op als PDF.", "convert-to-pdf": "Converteer gangbare bestanden naar PDF.", "convert-from-pdf": "Converteer PDF naar andere formaten.", office: "Converteer PDF- en Office-bestanden.", ocr: "Herken tekst in gescande PDF’s.", "image-convert": "Converteer afbeeldingsformaten." },
    ja: { merge: "複数の PDF を 1 つの文書に結合します。", split: "PDF を複数のファイルに分割します。", compress: "PDF のファイルサイズを縮小します。", edit: "ブラウザーで PDF ページを編集します。", sign: "PDF に署名を追加します。", "images-to-pdf": "画像を PDF に変換します。", "pdf-to-images": "PDF ページを画像として書き出します。", rotate: "PDF ページをまとめて回転します。", "remove-pages": "不要な PDF ページを削除します。", "extract-pages": "選択した PDF ページを抽出します。", rearrange: "PDF ページを並べ替えます。", watermark: "PDF ページにテキスト透かしを追加します。", "page-numbers": "PDF にページ番号を追加します。", password: "PDF をパスワードで保護します。", webpage: "ウェブページを PDF として保存します。", "convert-to-pdf": "一般的なファイルを PDF に変換します。", "convert-from-pdf": "PDF を他の形式に変換します。", office: "PDF と Office ファイルを変換します。", ocr: "スキャン PDF の文字を認識します。", "image-convert": "画像形式を変換します。" },
    ko: { merge: "여러 PDF 파일을 하나로 합칩니다.", split: "PDF를 여러 파일로 나눕니다.", compress: "PDF 파일 크기를 줄입니다.", edit: "브라우저에서 PDF 페이지를 편집합니다.", sign: "PDF에 서명을 추가합니다.", "images-to-pdf": "이미지를 PDF로 변환합니다.", "pdf-to-images": "PDF 페이지를 이미지로 내보냅니다.", rotate: "PDF 페이지를 일괄 회전합니다.", "remove-pages": "불필요한 PDF 페이지를 삭제합니다.", "extract-pages": "선택한 PDF 페이지를 추출합니다.", rearrange: "PDF 페이지 순서를 변경합니다.", watermark: "PDF 페이지에 텍스트 워터마크를 추가합니다.", "page-numbers": "PDF에 페이지 번호를 추가합니다.", password: "PDF를 비밀번호로 보호합니다.", webpage: "웹페이지를 PDF로 저장합니다.", "convert-to-pdf": "일반 파일을 PDF로 변환합니다.", "convert-from-pdf": "PDF를 다른 형식으로 변환합니다.", office: "PDF와 Office 파일을 변환합니다.", ocr: "스캔 PDF의 텍스트를 인식합니다.", "image-convert": "이미지 형식을 변환합니다." },
    ru: { merge: "Объединяйте несколько PDF в один документ.", split: "Разделяйте PDF на отдельные файлы.", compress: "Уменьшайте размер PDF.", edit: "Редактируйте страницы PDF в браузере.", sign: "Добавляйте подпись в PDF.", "images-to-pdf": "Преобразуйте изображения в PDF.", "pdf-to-images": "Экспортируйте страницы PDF как изображения.", rotate: "Поворачивайте страницы PDF пакетно.", "remove-pages": "Удаляйте ненужные страницы PDF.", "extract-pages": "Извлекайте выбранные страницы PDF.", rearrange: "Меняйте порядок страниц PDF.", watermark: "Добавляйте текстовые водяные знаки.", "page-numbers": "Добавляйте номера страниц в PDF.", password: "Защищайте PDF паролем.", webpage: "Сохраняйте веб-страницу как PDF.", "convert-to-pdf": "Преобразуйте популярные файлы в PDF.", "convert-from-pdf": "Преобразуйте PDF в другие форматы.", office: "Конвертируйте PDF и файлы Office.", ocr: "Распознавайте текст в сканированных PDF.", "image-convert": "Преобразуйте форматы изображений." },
  };
  return descriptions[locale]?.[operation] ?? english;
}

const copy: Record<Locale, CommonCopy> = {
  zh: {
    navTools: "所有工具",
    navPrivacy: "安全与隐私",
    navAdmin: "管理后台",
    navAbout: "关于",
    navFaq: "常见问题",
    navContact: "联系我们",
    navTerms: "使用条款",
    navAllTools: "所有 PDF 工具",
    themeLight: "切换至浅色模式",
    themeDark: "切换至深色模式",
    language: "语言",
    homeEyebrow: "文档处理",
    homeTitle: "PDF 工作，轻一点。",
    homeIntro: "PaperPilot 把常用的 PDF 操作放进一个清晰、快速、注重隐私的工作台。无需安装，打开就能用。",
    popularTitle: "常用工具",
    popularIntro: "从一个简单动作开始，结果会直接下载到你的设备。",
    allToolsTitle: "完整工具箱",
    allToolsIntro: "按任务查找工具，不用记住复杂的菜单结构。",
    moreToolsTitle: "更多 PDF 工具",
    moreToolsIntro: "换一个工具继续处理当前任务。",
    aboutTitle: "让文档工作保持清醒。",
    aboutIntro: "PaperPilot 是一个面向日常 PDF 工作的在线工具集。",
    contactTitle: "联系我们",
    contactIntro: "有问题、建议或合作想法？请给我们留言。",
    privacyTitle: "隐私政策",
    termsTitle: "使用条款",
    converterTitle: "PDF 转换器",
    converterIntro: "在 PDF 与其他常见文件格式之间转换，无需安装，简单快速。",
  },
  en: {
    navTools: "All tools",
    navPrivacy: "Security & privacy",
    navAdmin: "Admin",
    navAbout: "About",
    navFaq: "FAQ",
    navContact: "Contact",
    navTerms: "Terms",
    navAllTools: "All PDF tools",
    themeLight: "Switch to light mode",
    themeDark: "Switch to dark mode",
    language: "Language",
    homeEyebrow: "Document tools",
    homeTitle: "PDF work, lighter.",
    homeIntro: "PaperPilot keeps common PDF tasks in one clear, fast, privacy-minded workspace. No install needed.",
    popularTitle: "Popular tools",
    popularIntro: "Start with one simple action. The result downloads straight to your device.",
    allToolsTitle: "Full toolbox",
    allToolsIntro: "Find tools by task without memorizing a menu maze.",
    moreToolsTitle: "More PDF tools",
    moreToolsIntro: "Pick another tool and keep moving.",
    aboutTitle: "Keep document work clear.",
    aboutIntro: "PaperPilot is an online toolset for everyday PDF work.",
    contactTitle: "Contact us",
    contactIntro: "Questions, suggestions, or partnership ideas? Leave a message.",
    privacyTitle: "Privacy Policy",
    termsTitle: "Terms of Use",
    converterTitle: "PDF Converter",
    converterIntro: "Convert between PDF and other common file formats quickly, without installing anything.",
  },
  de: {
    navTools: "Alle Tools",
    navPrivacy: "Sicherheit & Datenschutz",
    navAdmin: "Admin",
    navAbout: "Über",
    navFaq: "FAQ",
    navContact: "Kontakt",
    navTerms: "Nutzungsbedingungen",
    navAllTools: "Alle PDF-Tools",
    themeLight: "Zum hellen Modus wechseln",
    themeDark: "Zum dunklen Modus wechseln",
    language: "Sprache",
    homeEyebrow: "Dokumente",
    homeTitle: "PDF-Arbeit, leichter gemacht.",
    homeIntro: "PaperPilot bündelt gängige PDF-Aufgaben in einem klaren, schnellen und datenschutzfreundlichen Arbeitsbereich.",
    popularTitle: "Beliebte Tools",
    popularIntro: "Starte mit einer einfachen Aktion. Das Ergebnis wird direkt heruntergeladen.",
    allToolsTitle: "Vollständige Toolbox",
    allToolsIntro: "Finde Tools nach Aufgabe, ohne dich durch Menüs zu kämpfen.",
    moreToolsTitle: "Weitere PDF-Tools",
    moreToolsIntro: "Wähle ein anderes Tool und arbeite weiter.",
    aboutTitle: "Dokumentenarbeit klar halten.",
    aboutIntro: "PaperPilot ist ein Online-Toolset für alltägliche PDF-Aufgaben.",
    contactTitle: "Kontakt",
    contactIntro: "Fragen, Vorschläge oder Ideen? Schreib uns.",
    privacyTitle: "Datenschutzrichtlinie",
    termsTitle: "Nutzungsbedingungen",
    converterTitle: "PDF-Konverter",
    converterIntro: "PDF schnell und ohne Installation in andere gängige Formate umwandeln.",
  },
  fr: {
    navTools: "Tous les outils",
    navPrivacy: "Sécurité et confidentialité",
    navAdmin: "Admin",
    navAbout: "À propos",
    navFaq: "FAQ",
    navContact: "Contact",
    navTerms: "Conditions",
    navAllTools: "Tous les outils PDF",
    themeLight: "Passer au mode clair",
    themeDark: "Passer au mode sombre",
    language: "Langue",
    homeEyebrow: "Documents",
    homeTitle: "Le PDF, plus léger.",
    homeIntro: "PaperPilot rassemble les tâches PDF courantes dans un espace clair, rapide et axé sur la confidentialité.",
    popularTitle: "Outils populaires",
    popularIntro: "Commencez par une action simple. Le résultat est téléchargé directement.",
    allToolsTitle: "Boîte à outils complète",
    allToolsIntro: "Trouvez un outil par tâche sans naviguer dans un labyrinthe de menus.",
    moreToolsTitle: "Plus d’outils PDF",
    moreToolsIntro: "Choisissez un autre outil et continuez.",
    aboutTitle: "Garder le travail documentaire clair.",
    aboutIntro: "PaperPilot est une boîte à outils en ligne pour les tâches PDF du quotidien.",
    contactTitle: "Contactez-nous",
    contactIntro: "Des questions, des idées ou des suggestions ? Laissez-nous un message.",
    privacyTitle: "Politique de confidentialité",
    termsTitle: "Conditions d’utilisation",
    converterTitle: "Convertisseur PDF",
    converterIntro: "Convertissez rapidement entre PDF et autres formats courants, sans rien installer.",
  },
  nl: {
    navTools: "Alle tools",
    navPrivacy: "Beveiliging & privacy",
    navAdmin: "Beheer",
    navAbout: "Over",
    navFaq: "FAQ",
    navContact: "Contact",
    navTerms: "Voorwaarden",
    navAllTools: "Alle PDF-tools",
    themeLight: "Naar lichte modus",
    themeDark: "Naar donkere modus",
    language: "Taal",
    homeEyebrow: "Documenten",
    homeTitle: "PDF-werk, lichter.",
    homeIntro: "PaperPilot bundelt veelgebruikte PDF-taken in een duidelijke, snelle en privacygerichte werkruimte.",
    popularTitle: "Populaire tools",
    popularIntro: "Begin met een eenvoudige actie. Het resultaat wordt direct gedownload.",
    allToolsTitle: "Volledige toolbox",
    allToolsIntro: "Vind tools per taak zonder een doolhof van menu’s.",
    moreToolsTitle: "Meer PDF-tools",
    moreToolsIntro: "Kies een andere tool en ga door.",
    aboutTitle: "Houd documentwerk helder.",
    aboutIntro: "PaperPilot is een online toolset voor dagelijkse PDF-taken.",
    contactTitle: "Contact",
    contactIntro: "Vragen, suggesties of ideeën? Laat een bericht achter.",
    privacyTitle: "Privacybeleid",
    termsTitle: "Gebruiksvoorwaarden",
    converterTitle: "PDF-converter",
    converterIntro: "Converteer snel tussen PDF en andere gangbare bestandsformaten, zonder installatie.",
  },
  ja: {
    navTools: "すべてのツール",
    navPrivacy: "セキュリティとプライバシー",
    navAdmin: "管理",
    navAbout: "概要",
    navFaq: "よくある質問",
    navContact: "お問い合わせ",
    navTerms: "利用規約",
    navAllTools: "すべての PDF ツール",
    themeLight: "ライトモードに切り替え",
    themeDark: "ダークモードに切り替え",
    language: "言語",
    homeEyebrow: "ドキュメント",
    homeTitle: "PDF 作業を、もっと軽く。",
    homeIntro: "PaperPilot は、よく使う PDF 操作を見やすく速いワークスペースにまとめます。",
    popularTitle: "人気ツール",
    popularIntro: "シンプルな操作から始められます。結果はすぐにダウンロードされます。",
    allToolsTitle: "ツール一覧",
    allToolsIntro: "複雑なメニューを覚えずに、目的からツールを探せます。",
    moreToolsTitle: "その他の PDF ツール",
    moreToolsIntro: "別のツールに切り替えて続けましょう。",
    aboutTitle: "書類作業を、わかりやすく。",
    aboutIntro: "PaperPilot は日常的な PDF 作業のためのオンラインツール集です。",
    contactTitle: "お問い合わせ",
    contactIntro: "質問、提案、協業のご相談があればメッセージをお送りください。",
    privacyTitle: "プライバシーポリシー",
    termsTitle: "利用規約",
    converterTitle: "PDF コンバーター",
    converterIntro: "PDF と他の一般的な形式を、インストール不要で素早く変換できます。",
  },
  ko: {
    navTools: "모든 도구",
    navPrivacy: "보안 및 개인정보",
    navAdmin: "관리",
    navAbout: "소개",
    navFaq: "FAQ",
    navContact: "문의",
    navTerms: "이용약관",
    navAllTools: "모든 PDF 도구",
    themeLight: "라이트 모드로 전환",
    themeDark: "다크 모드로 전환",
    language: "언어",
    homeEyebrow: "문서 도구",
    homeTitle: "PDF 작업을 더 가볍게.",
    homeIntro: "PaperPilot은 자주 쓰는 PDF 작업을 빠르고 깔끔한 워크스페이스에 모아 둡니다.",
    popularTitle: "인기 도구",
    popularIntro: "간단한 작업부터 시작하세요. 결과는 바로 다운로드됩니다.",
    allToolsTitle: "전체 도구함",
    allToolsIntro: "복잡한 메뉴를 외우지 않고 작업별로 도구를 찾을 수 있습니다.",
    moreToolsTitle: "더 많은 PDF 도구",
    moreToolsIntro: "다른 도구로 이어서 진행하세요.",
    aboutTitle: "문서 작업을 명확하게.",
    aboutIntro: "PaperPilot은 일상적인 PDF 작업을 위한 온라인 도구 모음입니다.",
    contactTitle: "문의하기",
    contactIntro: "질문, 제안, 협업 아이디어가 있으면 메시지를 남겨 주세요.",
    privacyTitle: "개인정보 처리방침",
    termsTitle: "이용약관",
    converterTitle: "PDF 변환기",
    converterIntro: "설치 없이 PDF와 다른 일반 파일 형식 사이를 빠르게 변환합니다.",
  },
  ru: {
    navTools: "Все инструменты",
    navPrivacy: "Безопасность и конфиденциальность",
    navAdmin: "Админ",
    navAbout: "О проекте",
    navFaq: "FAQ",
    navContact: "Контакты",
    navTerms: "Условия",
    navAllTools: "Все PDF-инструменты",
    themeLight: "Переключить на светлую тему",
    themeDark: "Переключить на тёмную тему",
    language: "Язык",
    homeEyebrow: "Документы",
    homeTitle: "Работа с PDF, проще.",
    homeIntro: "PaperPilot объединяет частые PDF-задачи в понятном, быстром и приватном рабочем пространстве.",
    popularTitle: "Популярные инструменты",
    popularIntro: "Начните с простого действия. Результат сразу скачивается на устройство.",
    allToolsTitle: "Полный набор",
    allToolsIntro: "Ищите инструменты по задаче, не запоминая сложное меню.",
    moreToolsTitle: "Больше PDF-инструментов",
    moreToolsIntro: "Выберите другой инструмент и продолжайте.",
    aboutTitle: "Держать работу с документами ясной.",
    aboutIntro: "PaperPilot — это онлайн-набор инструментов для повседневной работы с PDF.",
    contactTitle: "Связаться с нами",
    contactIntro: "Есть вопросы, предложения или идеи? Оставьте сообщение.",
    privacyTitle: "Политика конфиденциальности",
    termsTitle: "Условия использования",
    converterTitle: "PDF-конвертер",
    converterIntro: "Быстро конвертируйте PDF и другие распространённые форматы без установки.",
  },
};

export function createCopy(locale: Locale) {
  return copy[locale] ?? copy.zh;
}
import { toolMap } from "./tools";
