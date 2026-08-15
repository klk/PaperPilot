import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowRight, ArrowRightLeft, Check, FileInput, FileOutput, FileText, Globe2, LockKeyhole, Search, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { SiteChrome, ToolIcon } from "../../components/SiteChrome";
import { ContactForm } from "../../components/ContactForm";
import { ToolWorkspace } from "../../components/ToolWorkspace";
import { categories, mergeToolPublishState, toolMap, uniqueTools, type Tool } from "../../lib/tools";
import { categoryLabels, createCopy, getToolDescription, normalizeLocale, type Locale } from "../../lib/i18n";
import { loadToolPublishState } from "../../lib/tool-publish";

type PageProps = { params: Promise<{ slug?: string[] }> };

function resolveSlug(slug?: string[]) {
  if (!slug?.length) return "";
  return slug[0] === "zh" ? slug[1] || "" : slug[slug.length - 1];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = normalizeLocale((await cookies()).get("paperpilot-locale")?.value);
  const slug = resolveSlug((await params).slug);
  const copy = createCopy(locale);
  if (slug === "about") return { title: `${copy.navAbout} | PaperPilot`, description: copy.aboutIntro, alternates: { canonical: "/about" } };
  if (slug === "contact") return { title: `${copy.navContact} | PaperPilot`, description: copy.contactIntro, alternates: { canonical: "/contact" } };
  if (slug === "privacy") return { title: `${copy.privacyTitle} | PaperPilot`, description: copy.privacyTitle, alternates: { canonical: "/privacy" } };
  if (slug === "terms") return { title: `${copy.termsTitle} | PaperPilot`, description: copy.termsTitle, alternates: { canonical: "/terms" } };
  const item = toolMap.get(slug);
  if (!item) return {};
  const description = getToolDescription(locale, item.slug, item.description);
  return { title: `${locale === "zh" ? item.label : item.enLabel} | ${description}`, description, alternates: { canonical: `/${slug}` } };
}

function ToolCard({ item, locale }: { item: Tool; locale: Locale }) {
  return <Link className="tool-card" href={`/${item.slug}`}>
    <div className="tool-card-top"><ToolIcon slug={item.slug} /><span className="favorite" aria-hidden="true">☆</span></div>
    <h3>{locale === "zh" ? item.label : item.enLabel}</h3><p>{getToolDescription(locale, item.slug, item.description)}</p>
  </Link>;
}

async function getVisibleTools() {
  const state = await loadToolPublishState();
  return mergeToolPublishState(state).filter((item) => item.published);
}

async function HomePage({ locale }: { locale: Locale }) {
  const copy = createCopy(locale);
  const visibleTools = await getVisibleTools();
  const popular = [...visibleTools.filter((item) => item.popular), ...visibleTools.filter((item) => !item.popular)].slice(0, 12);
  return <SiteChrome locale={locale}><main className="main-wrap">
    <section className="hero"><span className="eyebrow"><Sparkles size={14} /> {copy.homeEyebrow}</span><h1>{copy.homeTitle}</h1><p>{copy.homeIntro}</p><div className="hero-rule" /></section>
    <section><div className="section-head"><div><h2>{copy.popularTitle}</h2><p>{copy.popularIntro}</p></div><Link className="secondary" href="/all-tools">{copy.navAllTools} <ArrowRight size={15} /></Link></div><div className="tool-grid popular-tool-grid">{popular.map((item) => <ToolCard key={item.slug} item={item} locale={locale} />)}</div></section>
    <section><div className="section-head"><div><h2>{copy.allToolsTitle}</h2><p>{copy.allToolsIntro}</p></div></div><div className="category-grid">{categories.filter((category) => !["popular", "image", "desktop"].includes(category.id)).map((category) => <div className="category-band" key={category.id}><h3>{categoryLabels[locale][category.id] ?? category.label}</h3><div className="category-links">{visibleTools.filter((item) => item.category === category.id).slice(0, 8).map((item) => <Link key={item.slug} href={`/${item.slug}`}>{locale === "zh" ? item.label : item.enLabel}</Link>)}</div></div>)}</div></section>
  </main></SiteChrome>;
}

async function AllToolsPage({ locale }: { locale: Locale }) {
  const copy = createCopy(locale);
  const visibleTools = await getVisibleTools();
  return <SiteChrome locale={locale}><main className="main-wrap"><section className="hero"><span className="eyebrow"><Search size={14} /> {copy.navAllTools}</span><h1>{copy.navTools}</h1><p>{copy.allToolsIntro}</p></section><div className="tool-grid">{visibleTools.map((item) => <ToolCard key={item.slug} item={item} locale={locale} />)}</div></main></SiteChrome>;
}

function InformationPage({ locale, title, intro, children }: { locale: Locale; title: string; intro: string; children: React.ReactNode }) {
  return <SiteChrome locale={locale}><main className="main-wrap"><section className="hero"><span className="eyebrow"><FileText size={14} /> PaperPilot</span><h1>{title}</h1><p>{intro}</p></section><div className="helper-grid" style={{ maxWidth: 850, marginTop: 0 }}>{children}</div></main></SiteChrome>;
}

function AboutPage({ locale }: { locale: Locale }) {
  const copy = createCopy(locale);
  const principles = [
    { icon: LockKeyhole, title: locale === "zh" ? "本地优先" : "Local first", text: locale === "zh" ? "能在浏览器中完成的任务，就留在用户设备上处理。" : "Tasks that can run in the browser stay on your device." },
    { icon: Workflow, title: locale === "zh" ? "任务清晰" : "Clear tasks", text: locale === "zh" ? "一个页面专注一项工作，让文件处理不必绕过复杂菜单。" : "One page stays focused on one job, without menu detours." },
    { icon: ShieldCheck, title: locale === "zh" ? "处理透明" : "Transparent processing", text: locale === "zh" ? "需要服务端 Worker 的转换会明确说明，不把处理方式藏在文案里。" : "Server-side workers are clearly disclosed instead of being hidden in the copy." },
  ];
  return <SiteChrome locale={locale}><main className="about-page">
    <section className="about-intro">
      <div className="about-intro-copy">
        <span className="eyebrow"><Sparkles size={14} /> {copy.navAbout}</span>
        <h1>{copy.aboutTitle}</h1>
        <p>{copy.aboutIntro}</p>
        <div className="about-intro-actions"><Link className="about-primary-action" href="/all-tools">{copy.navAllTools} <ArrowRight size={17} /></Link><Link className="about-text-action" href="/privacy">{copy.navPrivacy}</Link></div>
      </div>
      <div className="about-brand-stage" aria-label="PaperPilot 品牌标识">
        <div className="about-brand-paper" aria-hidden="true"><span /><span /><span /></div>
        <img src="/PaperPilot-logo.png" alt="PaperPilot" />
        <strong>PaperPilot</strong>
        <small>{locale === "zh" ? "文档处理，不走弯路。" : "Documents, without the detours."}</small>
      </div>
    </section>

    <section className="about-section about-story">
      <div className="about-section-label">{locale === "zh" ? "我们的出发点" : "Our starting point"}</div>
      <div className="about-story-copy"><h2>{locale === "zh" ? "文件处理不该比文件本身更麻烦。" : "Document work should not be harder than the document."}</h2><p>{locale === "zh" ? "合并、转换、压缩、签署和编辑，都是高频但容易被打断的工作。PaperPilot 的目标不是用更多功能制造复杂感，而是把每一次处理变成一个可理解、可完成的动作。" : "Merge, convert, compress, sign, and edit are frequent tasks. PaperPilot aims to make each one understandable and finishable, not more complex."}</p><p>{locale === "zh" ? "我们优先构建无需安装、在浏览器内即可开始的工具，并为需要更强转换能力的场景提供明确的服务端处理路径。" : "We prioritize browser-first tools and provide clear server-side paths where stronger conversion is needed."}</p></div>
    </section>

    <section className="about-section">
      <div className="about-section-head"><div><span className="about-section-label">{locale === "zh" ? "设计原则" : "Design principles"}</span><h2>{locale === "zh" ? "为真实工作留出空间。" : "Leave room for real work."}</h2></div><p>{locale === "zh" ? "每一个工具页都围绕同一套取舍：少一些不必要的步骤，多一些对结果和数据流向的说明。" : "Each tool page balances fewer unnecessary steps with clearer results and data flow."}</p></div>
      <div className="about-principles">{principles.map(({ icon: Icon, title, text }) => <article className="about-principle" key={title}><span><Icon size={23} /></span><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>

    <section className="about-section about-products">
      <div className="about-section-head"><div><span className="about-section-label">{locale === "zh" ? "PaperPilot 工具箱" : "PaperPilot toolbox"}</span><h2>{locale === "zh" ? "从一个具体问题开始。" : "Start with a specific problem."}</h2></div><p>{locale === "zh" ? "不需要记住产品层级。选定任务，上传文件，下载结果。" : "No need to memorize product layers. Choose a task, upload files, and download the result."}</p></div>
      <div className="about-product-links"><Link href="/merge-pdf"><FileText size={25} /><div><strong>{locale === "zh" ? "整理与编辑" : "Organize and edit"}</strong><span>{locale === "zh" ? "合并、拆分、压缩、编辑、签署" : "Merge, split, compress, edit, sign"}</span></div><ArrowRight size={18} /></Link><Link href="/pdf-converter"><ArrowRightLeft size={25} /><div><strong>{locale === "zh" ? "PDF 转换" : "PDF conversion"}</strong><span>{locale === "zh" ? "PDF 与 Word、Excel、PowerPoint、图像互转" : "Convert between PDF and Word, Excel, PowerPoint, and images"}</span></div><ArrowRight size={18} /></Link><Link href="/privacy"><ShieldCheck size={25} /><div><strong>{locale === "zh" ? "隐私与安全" : "Privacy and security"}</strong><span>{locale === "zh" ? "了解本地处理与服务端 Worker 的边界" : "Understand the boundary between local processing and server workers"}</span></div><ArrowRight size={18} /></Link></div>
    </section>

    <section className="about-closing">
      <Globe2 size={25} /><div><h2>{locale === "zh" ? "为任何需要处理文件的人而做。" : "Built for anyone who needs to handle files."}</h2><p>{locale === "zh" ? "无论是在桌面、平板还是手机上，PaperPilot 都希望成为你完成下一份文档前，最短的一段路。" : "On desktop, tablet, or phone, PaperPilot aims to be the shortest path to your next document."}</p></div><Link className="about-primary-action" href="/contact">{copy.navContact} <ArrowRight size={17} /></Link>
    </section>
  </main></SiteChrome>;
}

function ContactPage({ locale }: { locale: Locale }) {
  const copy = createCopy(locale);
  return <SiteChrome locale={locale}><main className="contact-page"><section className="contact-heading"><span className="eyebrow"><FileText size={14} /> PaperPilot</span><h1>{copy.contactTitle}</h1><p>{copy.contactIntro}</p></section><section className="contact-panel" aria-labelledby="contact-form-title"><div className="contact-panel-copy"><h2 id="contact-form-title">{locale === "zh" ? "发送消息" : "Send a message"}</h2><p>{locale === "zh" ? "请填写以下信息。我们会通过您留下的电子邮件地址回复。" : "Fill out the form below and we’ll reply to the email address you provide."}</p></div><ContactForm locale={locale} /></section></main></SiteChrome>;
}

function PrivacyPage({ locale }: { locale: Locale }) {
  const copy = createCopy(locale);
  return <SiteChrome locale={locale}><main className="policy-page">
    <header className="policy-hero"><span className="eyebrow"><LockKeyhole size={14} /> PaperPilot</span><h1>{copy.privacyTitle}</h1><p>{locale === "zh" ? "了解 PaperPilot 如何以清晰、隐私优先的方式构建在线 PDF 工具。" : "Learn how PaperPilot handles documents, messages, and the limited technical information needed to run the service."}</p><small>{locale === "zh" ? "最后更新：2026 年 8 月 13 日" : "Last updated: August 13, 2026"}</small></header>
    <div className="policy-layout">
      <aside className="policy-toc" aria-label={locale === "zh" ? "隐私政策目录" : "Privacy policy sections"}><strong>{locale === "zh" ? "本页内容" : "On this page"}</strong><a href="#overview">{locale === "zh" ? "概述" : "Overview"}</a><a href="#documents">{locale === "zh" ? "文档处理" : "Document processing"}</a><a href="#information">{locale === "zh" ? "收集的信息" : "Information we collect"}</a><a href="#contact">{locale === "zh" ? "联系消息" : "Contact messages"}</a><a href="#sharing">{locale === "zh" ? "共享与服务提供商" : "Sharing and service providers"}</a><a href="#retention">{locale === "zh" ? "保留与安全" : "Retention and security"}</a><a href="#rights">{locale === "zh" ? "你的选择与权利" : "Your choices and rights"}</a><a href="#changes">{locale === "zh" ? "变更与联系" : "Changes and contact"}</a></aside>
      <article className="policy-content">
        <section id="overview"><h2>1. Overview</h2><p>This Privacy Policy explains how PaperPilot handles personal data when you use our website, document tools, and contact form. PaperPilot is designed to minimize the information it needs. We do not sell personal information or build advertising profiles from the contents of the documents you process.</p><p>This policy applies to the PaperPilot website and its online tools. It does not cover third-party websites, applications, or services that may be linked from PaperPilot.</p></section>
        <section id="documents"><h2>2. How document processing works</h2><h3>Browser-local tools</h3><p>Many core tools process files directly in your browser. For these tools, your document is selected from your device and processed there; it is not sent to PaperPilot's application server as part of the normal operation.</p><h3>Server-side conversion tools</h3><p>Some conversions require a server-side worker. Where a tool uses this path, the submitted file is transferred to the worker only to perform the requested conversion. The worker uses a temporary processing directory and removes the input and output files after the request is completed. Do not upload documents unless you have the right to process them.</p><h3>Results and downloads</h3><p>Processed results are returned to your browser for download. PaperPilot does not create a public link to your document or intentionally keep a user-accessible archive of completed files.</p></section>
        <section id="information"><h2>3. Information we collect</h2><p>We collect only the information reasonably necessary to provide, protect, and improve the service.</p><h3>Information you provide</h3><p>When you use the contact form, you provide your name, email address, subject, and message. You may include other information in the body of your message, so please avoid sending sensitive information unless it is necessary for your request.</p><h3>Technical information</h3><p>Web servers and security systems may process limited technical information such as IP address, browser type, requested URL, date and time, response status, and diagnostic data. This information helps us deliver the site, investigate errors, prevent abuse, and maintain security.</p><h3>Cookies and local storage</h3><p>PaperPilot does not currently use advertising cookies or behavioral tracking cookies. Essential browser storage may be used for functional preferences, such as retaining an administrator key for the current browser session. You can clear browser storage in your browser settings.</p></section>
        <section id="contact"><h2>4. Contact messages</h2><p>Contact-form submissions are stored in PaperPilot's contact-message store so that authorized administrators can read, search, respond to, update, or delete them. Access to the management interface is protected in production with an administrator API key.</p><p>If a contact-delivery webhook is configured, a copy of the message may also be sent to that configured service. The data sent is limited to the fields in the contact message and basic submission metadata. The privacy practices of that provider are governed by its own policy.</p></section>
        <section id="sharing"><h2>5. Sharing and service providers</h2><p>We do not rent or sell personal data. We may use infrastructure, hosting, security, or message-delivery providers to operate PaperPilot. Those providers may process data only as needed to provide their service to us and under their applicable contractual and privacy terms.</p><p>We may disclose information where reasonably necessary to comply with applicable law, respond to lawful requests, protect the security of PaperPilot, or protect the rights and safety of users and others.</p></section>
        <section id="retention"><h2>6. Retention and security</h2><p>Temporary files used by server-side document conversions are removed after the conversion request finishes. Contact messages are kept until they are no longer needed for support or administration, or until an authorized administrator deletes them.</p><p>We use reasonable technical and organizational measures intended to protect information. No online service can guarantee absolute security, and you should use care when deciding what information or documents to submit.</p></section>
        <section id="rights"><h2>7. Your choices and rights</h2><p>Depending on where you live, you may have rights to request access to, correction of, deletion of, restriction of, or objection to the processing of your personal data. You may also have a right to data portability or to withdraw consent where processing relies on consent.</p><p>To make a request about a contact message or other personal information, <Link href="/contact">contact us</Link> and include enough detail for us to identify the relevant request. We may need to verify your identity before responding. You may also have the right to raise a concern with your local data protection authority.</p></section>
        <section id="changes"><h2>8. Changes and contact</h2><p>We may update this Privacy Policy when PaperPilot changes or when legal requirements evolve. The revised version will appear on this page with an updated date.</p><p>For privacy questions, requests, or concerns, please use our <Link href="/contact">contact form</Link>.</p></section>
      </article>
    </div>
  </main></SiteChrome>;
}

function TermsPage({ locale }: { locale: Locale }) {
  const copy = createCopy(locale);
  return <SiteChrome locale={locale}><main className="policy-page">
    <header className="policy-hero"><span className="eyebrow"><FileText size={14} /> PaperPilot</span><h1>{copy.termsTitle}</h1><p>{locale === "zh" ? "这些条款约束你对 PaperPilot 网站、文档工具和支持渠道的使用。" : "These terms govern your use of PaperPilot's website, document tools, and support channels."}</p><small>{locale === "zh" ? "最后更新：2026 年 8 月 13 日" : "Last updated: August 13, 2026"}</small></header>
    <div className="policy-layout">
      <aside className="policy-toc" aria-label={locale === "zh" ? "使用条款目录" : "Terms of use sections"}><strong>{locale === "zh" ? "本页内容" : "On this page"}</strong><a href="#acceptance">{locale === "zh" ? "条款接受" : "Acceptance of terms"}</a><a href="#service">{locale === "zh" ? "服务" : "The service"}</a><a href="#content">{locale === "zh" ? "你的内容" : "Your content"}</a><a href="#responsibility">{locale === "zh" ? "你的责任" : "Your responsibilities"}</a><a href="#availability">{locale === "zh" ? "可用性与变更" : "Availability and changes"}</a><a href="#ip">{locale === "zh" ? "知识产权" : "Intellectual property"}</a><a href="#disclaimers">{locale === "zh" ? "免责声明" : "Disclaimers"}</a><a href="#liability">{locale === "zh" ? "责任限制" : "Limitation of liability"}</a><a href="#termination">{locale === "zh" ? "暂停与终止" : "Suspension and termination"}</a><a href="#contact">{locale === "zh" ? "联系" : "Contact"}</a></aside>
      <article className="policy-content">
        <section id="acceptance"><h2>1. Acceptance of terms</h2><p>By accessing or using PaperPilot, you agree to these Terms of Use and to any additional policies or notices referenced on the site, including the Privacy Policy. If you do not agree, do not use the service.</p><p>These terms apply to the PaperPilot website and related online tools made available through it.</p></section>
        <section id="service"><h2>2. The service</h2><p>PaperPilot provides online tools for document handling, conversion, and related workflows. Some tools process files directly in your browser, while other tools may use a server-side worker to perform the requested task.</p><p>We may change, improve, replace, or discontinue features at any time. We may also set technical or usage limits where needed to protect the service, manage load, or reduce abuse.</p></section>
        <section id="content"><h2>3. Your content</h2><p>You keep ownership of the files and other content you submit. You are solely responsible for making sure you have the rights and authority to upload, process, convert, or share that content.</p><p>You should not submit content that you do not have permission to use, or content that contains confidential, sensitive, or regulated information unless you understand the risks and have the right to do so.</p></section>
        <section id="responsibility"><h2>4. Your responsibilities</h2><h3>Permitted use</h3><p>You may use PaperPilot only for lawful purposes and in a way that does not interfere with the operation, security, or availability of the service.</p><h3>Prohibited conduct</h3><p>You must not misuse the service, attempt unauthorized access, probe or disrupt systems, upload malware or harmful code, or use PaperPilot to infringe intellectual property, privacy, or other rights.</p><h3>Account and access security</h3><p>If any part of the service requires credentials or administrative access, you are responsible for keeping those credentials secure and for any activity carried out through them.</p></section>
        <section id="availability"><h2>5. Availability and changes</h2><p>PaperPilot is provided on an "as available" basis. We do not guarantee uninterrupted operation, error-free performance, or that every tool will always be available in every environment.</p><p>We may update these terms from time to time. When we do, the revised version will be posted on this page with an updated date. Continued use of the service after changes means you accept the updated terms.</p></section>
        <section id="ip"><h2>6. Intellectual property</h2><p>The PaperPilot name, brand elements, site design, software, and related materials are protected by applicable intellectual property laws. Except for the rights expressly granted to you to use the service, no additional rights are transferred.</p><p>You may not copy, modify, distribute, or create derivative works from the service except as allowed by law or with our written permission.</p></section>
        <section id="disclaimers"><h2>7. Disclaimers</h2><p>PaperPilot is provided without warranties of any kind to the maximum extent permitted by law. We do not warrant that the service will meet every requirement, that every file will convert correctly, or that results will be suitable for a particular purpose.</p><p>You are responsible for reviewing outputs before relying on them. Document conversion can produce formatting differences, data loss, or other unexpected results.</p></section>
        <section id="liability"><h2>8. Limitation of liability</h2><p>To the fullest extent permitted by law, PaperPilot and its operators will not be liable for indirect, incidental, special, consequential, or punitive damages, or for loss of data, profits, goodwill, or business opportunities arising from your use of the service.</p><p>If a limitation of liability is not enforceable where you live, the applicable law will control, but only to the extent required.</p></section>
        <section id="termination"><h2>9. Suspension and termination</h2><p>We may suspend or terminate access to the service if we reasonably believe a user has violated these terms, abused the service, or created security, legal, or operational risk.</p><p>You may stop using PaperPilot at any time. Some records, such as contact messages or logs, may still be retained as described in the Privacy Policy or as required by law.</p></section>
        <section id="contact"><h2>10. Contact</h2><p>If you have questions about these terms, please use our <Link href="/contact">contact form</Link>. If there is a conflict between these terms and another site policy, the more specific policy may control for that topic.</p></section>
      </article>
    </div>
  </main></SiteChrome>;
}

function ConverterHub({ locale }: { locale: Locale }) {
  const copy = createCopy(locale);
  return <SiteChrome locale={locale}><main className="main-wrap converter-hub"><section className="tool-hero"><span className="eyebrow"><ArrowRightLeft size={14} /> {copy.converterTitle}</span><h1>{copy.converterTitle}</h1><p>{copy.converterIntro}</p><div className="trust-row"><span><Check size={15} /> {locale === "zh" ? "免费" : "Free"}</span><span><Check size={15} /> {locale === "zh" ? "在线" : "Online"}</span><span><Check size={15} /> {locale === "zh" ? "无限制" : "Unlimited"}</span><span><LockKeyhole size={15} /> {locale === "zh" ? "安全" : "Secure"}</span></div></section><section className="converter-direction"><p>{locale === "zh" ? "您希望以何种方式转换？" : "How would you like to convert?"}</p><div className="converter-direction-grid"><Link className="converter-direction-card" href="/convert-to-pdf"><span className="converter-direction-icon"><FileOutput size={30} /></span><strong>{locale === "zh" ? "转换为 PDF" : "Convert to PDF"}</strong><small>{locale === "zh" ? "将 Word、Excel、PowerPoint、图像和其他文件转换为 PDF。" : "Convert Word, Excel, PowerPoint, image, and other files to PDF."}</small><span className="converter-direction-arrow"><ArrowRight size={17} /></span></Link><Link className="converter-direction-card" href="/convert-from-pdf"><span className="converter-direction-icon"><FileInput size={30} /></span><strong>{locale === "zh" ? "将 PDF 转换成…" : "Convert from PDF"}</strong><small>{locale === "zh" ? "将 PDF 转换为文本、HTML、Word、图像和其他格式。" : "Convert PDF into text, HTML, Word, images, and more."}</small><span className="converter-direction-arrow"><ArrowRight size={17} /></span></Link></div></section></main></SiteChrome>;
}

const toolPageCopy: Record<Locale, { free: string; online: string; noInstall: string; privacy: string; simple: string; simpleText: string; protection: string; protectionText: string; anywhere: string; anywhereText: string; more: string; moreText: string; browse: string }> = {
  en: { free: "Free to start", online: "Online", noInstall: "No install", privacy: "Privacy first", simple: "Simple and direct", simpleText: "Upload files, choose an action, and download the result automatically.", protection: "File protection", protectionText: "Core tools process files in the browser to avoid unnecessary uploads and retention.", anywhere: "Works anywhere", anywhereText: "Use the same tools on desktop, tablet, or mobile browsers.", more: "More PDF tools", moreText: "Pick another tool and keep going.", browse: "Browse all" },
  de: { free: "Kostenlos starten", online: "Online", noInstall: "Keine Installation", privacy: "Datenschutz zuerst", simple: "Einfach und direkt", simpleText: "Dateien hochladen, Aktion wählen und Ergebnis automatisch herunterladen.", protection: "Dateischutz", protectionText: "Kernfunktionen verarbeiten Dateien im Browser und vermeiden unnötige Uploads.", anywhere: "Überall nutzbar", anywhereText: "Nutzen Sie die Tools am Computer, Tablet oder Smartphone.", more: "Weitere PDF-Tools", moreText: "Wählen Sie ein anderes Tool und arbeiten Sie weiter.", browse: "Alle ansehen" },
  fr: { free: "Démarrer gratuitement", online: "En ligne", noInstall: "Sans installation", privacy: "Confidentialité d’abord", simple: "Simple et direct", simpleText: "Importez les fichiers, choisissez une action et téléchargez automatiquement le résultat.", protection: "Protection des fichiers", protectionText: "Les outils principaux traitent les fichiers dans le navigateur pour éviter les envois inutiles.", anywhere: "Partout avec vous", anywhereText: "Utilisez les mêmes outils sur ordinateur, tablette ou mobile.", more: "Plus d’outils PDF", moreText: "Choisissez un autre outil et continuez.", browse: "Tout afficher" },
  nl: { free: "Gratis beginnen", online: "Online", noInstall: "Geen installatie", privacy: "Privacy voorop", simple: "Eenvoudig en direct", simpleText: "Upload bestanden, kies een actie en download het resultaat automatisch.", protection: "Bestandsbeveiliging", protectionText: "Kerntools verwerken bestanden in de browser en vermijden onnodige uploads.", anywhere: "Overal te gebruiken", anywhereText: "Gebruik dezelfde tools op desktop, tablet en mobiel.", more: "Meer PDF-tools", moreText: "Kies een andere tool en ga verder.", browse: "Alles bekijken" },
  ja: { free: "無料で開始", online: "オンライン", noInstall: "インストール不要", privacy: "プライバシー重視", simple: "シンプルな操作", simpleText: "ファイルをアップロードし、処理を選ぶだけで結果をダウンロードできます。", protection: "ファイル保護", protectionText: "主要ツールはブラウザー内で処理し、不要なアップロードを避けます。", anywhere: "どこでも利用可能", anywhereText: "パソコン、タブレット、スマートフォンで同じツールを利用できます。", more: "その他の PDF ツール", moreText: "別のツールを選んで作業を続けましょう。", browse: "すべて表示" },
  ko: { free: "무료로 시작", online: "온라인", noInstall: "설치 불필요", privacy: "개인정보 우선", simple: "간단하고 명확하게", simpleText: "파일을 업로드하고 작업을 선택하면 결과를 자동으로 다운로드합니다.", protection: "파일 보호", protectionText: "핵심 도구는 브라우저에서 파일을 처리하여 불필요한 업로드를 줄입니다.", anywhere: "어디서나 사용", anywhereText: "데스크톱, 태블릿, 모바일에서 같은 도구를 사용하세요.", more: "더 많은 PDF 도구", moreText: "다른 도구를 선택해 계속 작업하세요.", browse: "모두 보기" },
  zh: { free: "免费开始", online: "在线使用", noInstall: "无需安装", privacy: "隐私优先", simple: "简单直接", simpleText: "上传文件，选择操作，结果自动下载。每个工具只保留真正需要的设置。", protection: "文件保护", protectionText: "首批核心工具在浏览器中处理文件，避免不必要的上传和长期存储。", anywhere: "随处可用", anywhereText: "在桌面、平板和手机浏览器中都能使用同一套工具。", more: "更多 PDF 工具", moreText: "换一个工具继续处理当前任务。", browse: "浏览全部" },
  ru: { free: "Начать бесплатно", online: "Онлайн", noInstall: "Без установки", privacy: "Конфиденциальность", simple: "Просто и понятно", simpleText: "Загрузите файлы, выберите действие и автоматически скачайте результат.", protection: "Защита файлов", protectionText: "Основные инструменты обрабатывают файлы в браузере без лишней отправки на сервер.", anywhere: "Работает везде", anywhereText: "Используйте инструменты на компьютере, планшете или телефоне.", more: "Другие PDF-инструменты", moreText: "Выберите другой инструмент и продолжайте работу.", browse: "Смотреть все" },
};

function ToolPage({ item, locale }: { item: Tool; locale: Locale }) {
  const description = getToolDescription(locale, item.slug, item.description);
  const jsonLd = { "@context": "https://schema.org", "@type": "WebApplication", name: `PaperPilot ${item.enLabel}`, applicationCategory: "BusinessApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, description, url: `/${item.slug}` };
  const pageCopy = toolPageCopy[locale];
  return <SiteChrome locale={locale}><main className="main-wrap"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /><section className="tool-hero"><span className="eyebrow"><ToolIcon slug={item.slug} compact /> {locale === "zh" ? item.label : item.enLabel}</span><h1>{locale === "zh" ? item.label : item.enLabel}</h1><p>{description}</p><div className="trust-row"><span><Check size={15} /> {pageCopy.free}</span><span><Check size={15} /> {pageCopy.online}</span><span><Check size={15} /> {pageCopy.noInstall}</span><span><LockKeyhole size={15} /> {pageCopy.privacy}</span></div></section><ToolWorkspace tool={item} locale={locale} /><section className="helper-grid"><div className="helper"><Check size={18} /><h3>{pageCopy.simple}</h3><p>{pageCopy.simpleText}</p></div><div className="helper"><LockKeyhole size={18} /><h3>{pageCopy.protection}</h3><p>{pageCopy.protectionText}</p></div><div className="helper"><Sparkles size={18} /><h3>{pageCopy.anywhere}</h3><p>{pageCopy.anywhereText}</p></div></section><section className="more-tools-section"><div className="section-head"><div><h2>{pageCopy.more}</h2><p>{pageCopy.moreText}</p></div><Link className="secondary" href="/all-tools">{pageCopy.browse} <ArrowRight size={15} /></Link></div><div className="tool-grid more-tools-grid">{uniqueTools.filter((candidate) => candidate.slug !== item.slug).slice(0, 4).map((candidate) => <ToolCard key={candidate.slug} item={candidate} locale={locale} />)}</div></section></main></SiteChrome>;
}

export default async function Page({ params }: PageProps) {
  const locale = normalizeLocale((await cookies()).get("paperpilot-locale")?.value);
  const slug = resolveSlug((await params).slug);
  const visibleTools = await getVisibleTools();
  const visibleToolMap = new Map(visibleTools.map((item) => [item.slug, item]));
  if (!slug) return <HomePage locale={locale} />;
  if (slug === "all-tools") return <AllToolsPage locale={locale} />;
  if (slug === "pdf-converter") return <ConverterHub locale={locale} />;
  const item = visibleToolMap.get(slug);
  if (item) return <ToolPage item={item} locale={locale} />;
  if (slug === "faq") return <InformationPage locale={locale} title={locale === "zh" ? "常见问题" : "FAQ"} intro={locale === "zh" ? "关于 PaperPilot 的文件处理、隐私和使用方式。" : "Common questions about document handling, privacy, and use."}><div className="helper"><h3>{locale === "zh" ? "文件会上传到服务器吗？" : "Are files uploaded?"}</h3><p>{locale === "zh" ? "首批浏览器工具会在你的设备中处理文件。需要服务器 worker 的工具会在上线前明确标注处理方式和保存时长。" : "Browser tools process files on your device. Server-worker tools clearly disclose how files are handled."}</p></div><div className="helper"><h3>{locale === "zh" ? "支持哪些格式？" : "Which formats are supported?"}</h3><p>{locale === "zh" ? "PDF、JPG 和 PNG 的核心操作优先支持，Office、OCR 和网页转换会通过可替换的 worker 扩展。" : "Core PDF, JPG, and PNG actions come first, with Office, OCR, and webpage conversion handled through pluggable workers."}</p></div><div className="helper"><h3>{locale === "zh" ? "手机可以使用吗？" : "Does it work on mobile?"}</h3><p>{locale === "zh" ? "可以。工作区针对触摸操作设计，支持从系统文件选择器导入文件。" : "Yes. The workspace is touch-friendly and supports importing files from the system picker."}</p></div></InformationPage>;
  if (slug === "about") return <AboutPage locale={locale} />;
  if (slug === "contact") return <ContactPage locale={locale} />;
  if (slug === "privacy") return <PrivacyPage locale={locale} />;
  if (slug === "terms") return <TermsPage locale={locale} />;
  return <InformationPage locale={locale} title={locale === "zh" ? "页面不存在" : "Page not found"} intro={locale === "zh" ? "这个入口还没有加入 PaperPilot 的工具箱。" : "This entry is not part of the PaperPilot toolbox yet."}><div className="helper"><h3>{locale === "zh" ? "从常用工具开始" : "Start with popular tools"}</h3><p><Link href="/all-tools">{locale === "zh" ? "返回全部工具" : "Back to all tools"}</Link></p></div></InformationPage>;
}
