"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Eye, FileCog, FileText, KeyRound, LayoutDashboard, LockKeyhole, LogOut, Mail, MessageSquareText, RefreshCw, ShieldCheck, Trash2, Users, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BrandMark } from "../../components/BrandMark";
import type { ContactMessage, ContactMessageStatus } from "../../lib/contact-messages";
import { mergeToolPublishState, uniqueTools, type ToolWithState } from "../../lib/tools";

const statusCopy: Record<ContactMessageStatus, string> = { new: "待处理", in_progress: "跟进中", closed: "已关闭" };
type Captcha = { id: string; image: string };

function displayDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function CaptchaImage({ captcha, refresh }: { captcha: Captcha | null; refresh: () => void }) {
  return <div className="captcha-row"><button type="button" className="captcha-image" title="Refresh verification code" onClick={refresh} disabled={!captcha}>{captcha ? <img src={captcha.image} alt="Verification code" /> : <RefreshCw size={18} className="spin" />}</button><button type="button" className="captcha-refresh" title="Refresh verification code" onClick={refresh}><RefreshCw size={16} /></button></div>;
}

function LoginScreen({ onAuthenticated }: { onAuthenticated: (username: string) => void }) {
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refreshCaptcha = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/captcha", { cache: "no-store" });
      setCaptcha(await response.json());
      setCode("");
    } catch {
      setError("Unable to load the verification code. Please try again.");
    }
  }, []);

  useEffect(() => { void refreshCaptcha(); }, [refreshCaptcha]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password, captchaId: captcha?.id, captcha: code }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to sign in.");
      onAuthenticated(result.username);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.");
      await refreshCaptcha();
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="admin-login-shell"><section className="admin-login-card"><Link className="admin-login-brand" href="/"><BrandMark /> <span>PaperPilot</span></Link><div className="admin-login-copy"><span><LockKeyhole size={16} /> Secure access</span><h1>管理后台登录</h1><p>请输入管理员账号、密码和图形验证码。</p></div><form className="admin-login-form" onSubmit={login}><label><span>账号</span><input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required autoFocus /></label><label><span>密码</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label><label><span>图形验证码</span><div className="captcha-input"><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} autoComplete="off" maxLength={5} required /><CaptchaImage captcha={captcha} refresh={() => void refreshCaptcha()} /></div></label>{error && <p className="admin-login-error" role="alert">{error}</p>}<button className="admin-login-submit" disabled={submitting}>{submitting ? "正在登录..." : "登录"}</button></form></section></div>;
}

function PasswordDialog({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [working, setWorking] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (nextPassword !== confirmPassword) {
      setError("两次输入的新密码不一致。");
      return;
    }
    setWorking(true);
    try {
      const response = await fetch("/api/admin/auth/password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, nextPassword }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "无法修改密码。");
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
      setSuccess("密码已更新，其他已登录会话已失效。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法修改密码。");
    } finally {
      setWorking(false);
    }
  }

  return <div className="admin-dialog-overlay" role="presentation" onMouseDown={onClose}><section className="admin-password-dialog" role="dialog" aria-modal="true" aria-labelledby="password-dialog-title" onMouseDown={(event) => event.stopPropagation()}><header><div><KeyRound size={19} /><h2 id="password-dialog-title">修改管理员密码</h2></div><button className="icon-button" title="关闭" onClick={onClose}><X size={19} /></button></header><form onSubmit={submit}><label><span>当前密码</span><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required /></label><label><span>新密码</span><input type="password" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} autoComplete="new-password" minLength={6} required /><small>至少 6 个字符，建议使用更长的独特密码。</small></label><label><span>确认新密码</span><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={6} required /></label>{error && <p className="admin-login-error" role="alert">{error}</p>}{success && <p className="admin-password-success" role="status">{success}</p>}<footer><button type="button" className="secondary" onClick={onClose}>取消</button><button className="admin-login-submit" disabled={working}>{working ? "正在保存..." : "保存新密码"}</button></footer></form></section></div>;
}

function Dashboard({ username, onLogout }: { username: string; onLogout: () => void }) {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | ContactMessageStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [toolState, setToolState] = useState<Record<string, { published: boolean }>>({});
  const [toolQuery, setToolQuery] = useState("");
  const [toolPage, setToolPage] = useState(1);
  const [toolPageSize, setToolPageSize] = useState<10 | 20 | 50>(10);
  const [toolWorkingSlug, setToolWorkingSlug] = useState("");
  const [toolLoading, setToolLoading] = useState(true);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/contact-messages");
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "无法载入联系消息。");
      setMessages(result.messages || []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法载入联系消息。");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTools = useCallback(async () => {
    setToolLoading(true);
    try {
      const response = await fetch("/api/admin/tools", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "无法载入工具状态。");
      setToolState(result.state || {});
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法载入工具状态。");
    } finally {
      setToolLoading(false);
    }
  }, []);

  useEffect(() => { void loadMessages(); }, [loadMessages]);
  useEffect(() => { void loadTools(); }, [loadTools]);

  const visibleMessages = useMemo(() => messages.filter((message) => {
    const keyword = query.trim().toLowerCase();
    return (filter === "all" || message.status === filter) && (!keyword || [message.name, message.email, message.subject, message.message].some((value) => value.toLowerCase().includes(keyword)));
  }), [filter, messages, query]);

  const toolRows: ToolWithState[] = useMemo(() => mergeToolPublishState(toolState), [toolState]);
  const visibleTools = useMemo(() => {
    const keyword = toolQuery.trim().toLowerCase();
    return toolRows.filter((tool) => !keyword || [tool.label, tool.enLabel, tool.slug, tool.description].some((value) => value.toLowerCase().includes(keyword)));
  }, [toolQuery, toolRows]);
  const toolsPerPage = toolPageSize;
  const totalToolPages = Math.max(1, Math.ceil(visibleTools.length / toolsPerPage));
  const safeToolPage = Math.min(toolPage, totalToolPages);
  const pagedTools = useMemo(() => visibleTools.slice((safeToolPage - 1) * toolsPerPage, safeToolPage * toolsPerPage), [safeToolPage, visibleTools]);
  const publishedTools = toolRows.filter((tool) => tool.published).length;
  const unpublishedTools = toolRows.length - publishedTools;
  const newCount = messages.filter((message) => message.status === "new").length;
  const selectedMessage = selected;

  useEffect(() => { setToolPage(1); }, [toolQuery]);
  useEffect(() => { setToolPage(1); }, [toolPageSize]);

  async function updateStatus(id: string, status: ContactMessageStatus) {
    setWorking(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/contact-messages/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "无法更新消息状态。");
      setMessages((current) => current.map((message) => message.id === id ? result.message : message));
      setSelected((current) => current?.id === id ? result.message : current);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法更新消息状态。");
    } finally {
      setWorking(false);
    }
  }

  async function removeMessage(id: string) {
    if (!window.confirm("确认删除这条联系消息？此操作无法恢复。")) return;
    setWorking(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/contact-messages/${id}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "无法删除消息。");
      setMessages((current) => current.filter((message) => message.id !== id));
      setSelected((current) => current?.id === id ? null : current);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法删除消息。");
    } finally {
      setWorking(false);
    }
  }

  async function toggleToolPublish(slug: string, published: boolean) {
    setToolWorkingSlug(slug);
    try {
      const response = await fetch("/api/admin/tools", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, published }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "无法更新工具状态。");
      setToolState(result.state || {});
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法更新工具状态。");
    } finally {
      setToolWorkingSlug("");
    }
  }

  const selectedPanel = selectedMessage ? <div className="admin-message-overlay" role="presentation" onMouseDown={() => !working && setSelected(null)}><aside className="admin-message-drawer" role="dialog" aria-modal="true" aria-label="联系消息详情" onMouseDown={(event) => event.stopPropagation()}><header><div><span className={`admin-status-dot status-${selectedMessage.status}`}>{statusCopy[selectedMessage.status]}</span><h2>{selectedMessage.subject}</h2></div><button className="icon-button" title="关闭详情" onClick={() => setSelected(null)}><X size={19} /></button></header><dl><div><dt>姓名</dt><dd>{selectedMessage.name}</dd></div><div><dt>电子邮件地址</dt><dd><a href={`mailto:${selectedMessage.email}`}>{selectedMessage.email}</a></dd></div><div><dt>提交时间</dt><dd>{displayDate(selectedMessage.createdAt)}</dd></div></dl><div className="admin-message-content">{selectedMessage.message}</div><footer><select className={`admin-status-select status-${selectedMessage.status}`} value={selectedMessage.status} disabled={working} onChange={(event) => void updateStatus(selectedMessage.id, event.target.value as ContactMessageStatus)}>{Object.entries(statusCopy).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><a className="secondary" href={`mailto:${selectedMessage.email}?subject=${encodeURIComponent(`Re: ${selectedMessage.subject}`)}`}><Mail size={16} /> 回复邮件</a><button className="admin-delete-button" disabled={working} onClick={() => void removeMessage(selectedMessage.id)}><Trash2 size={16} /> 删除</button></footer></aside></div> : null;

  return <div className="admin-shell"><header className="admin-top"><Link className="brand" href="/"><BrandMark /> PaperPilot</Link><span className="admin-label">管理后台</span><div className="admin-account-actions"><span>{username}</span><button className="admin-top-action" onClick={() => setShowPasswordDialog(true)} title="修改密码"><KeyRound size={16} /> 修改密码</button><button className="admin-top-action" onClick={onLogout} title="退出登录"><LogOut size={16} /> 退出</button><Link className="icon-button" style={{ color: "#fff" }} href="/"><ArrowLeft size={18} /></Link></div></header><main className="admin-body"><div className="admin-title"><div><h1>运营总览</h1><p>统一管理工具上下架、内容和用户反馈，保持每个入口可用。</p></div><button className="secondary"><FileCog size={16} /> 导出报告</button></div><section className="admin-grid"><div className="stat"><div className="stat-label">已上架工具</div><div className="stat-value">{publishedTools}</div></div><div className="stat"><div className="stat-label">已下架工具</div><div className="stat-value">{unpublishedTools}</div></div><div className="stat"><div className="stat-label">已索引工具页</div><div className="stat-value">{uniqueTools.length}</div></div><div className="stat"><div className="stat-label">待处理联系消息</div><div className="stat-value">{newCount}</div></div></section><div className="admin-columns"><section className="admin-panel"><div className="admin-panel-head"><div><h2>工具上下架</h2><p>修改后会立即同步到前台和站点地图。</p></div><span className="status"><CheckCircle2 size={12} /> {publishedTools} 个工具已上架</span></div><div className="admin-panel-body"><div className="admin-tools-toolbar"><input className="search-box" value={toolQuery} onChange={(event) => setToolQuery(event.target.value)} placeholder="搜索工具名称、英文名或 slug" /><label className="admin-page-size"><span>每页</span><select value={toolPageSize} onChange={(event) => setToolPageSize(Number(event.target.value) as 10 | 20 | 50)}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label><button className="secondary" onClick={() => void loadTools()} disabled={toolLoading}><RefreshCw size={15} className={toolLoading ? "spin" : ""} /> 刷新</button></div><div className="admin-tools-hint">第 {safeToolPage} / {totalToolPages} 页，每页 {toolsPerPage} 条，共 {visibleTools.length} 条</div><div className="admin-tools-grid">{pagedTools.map((tool) => <article key={tool.slug} className="admin-tool-row"><div className="admin-tool-copy"><strong>{tool.label}</strong><span>{tool.slug}</span><p>{tool.description}</p></div><div className="admin-tool-actions"><span className={`status ${tool.published ? "" : "status-offline"}`}>{tool.published ? "已上架" : "已下架"}</span><button className={`secondary ${tool.published ? "danger" : ""}`} onClick={() => void toggleToolPublish(tool.slug, !tool.published)} disabled={toolWorkingSlug === tool.slug}>{tool.published ? "下架" : "上架"}</button></div></article>)}</div><div className="admin-pagination"><button className="secondary" onClick={() => setToolPage((page) => Math.max(1, page - 1))} disabled={safeToolPage <= 1}>上一页</button><span className="admin-pagination-label">{safeToolPage} / {totalToolPages}</span><button className="secondary" onClick={() => setToolPage((page) => Math.min(totalToolPages, page + 1))} disabled={safeToolPage >= totalToolPages}>下一页</button></div></div></section><section className="admin-panel"><div className="admin-panel-head"><h2>内容与安全</h2><ShieldCheck size={17} color="#16a58b" /></div><div className="admin-panel-body"><div className="check-list"><div className="check-item"><CheckCircle2 size={17} /><div><strong>工具路由已生成</strong><span>覆盖核心操作、转换和图片入口。</span></div></div><div className="check-item"><CheckCircle2 size={17} /><div><strong>隐私说明已配置</strong><span>浏览器本地处理文案已进入每个工作区。</span></div></div><div className="check-item"><MessageSquareText size={17} /><div><strong>待处理联系消息 {newCount} 条</strong><span>可在下方联系消息中查阅和管理。</span></div></div></div></div></section></div><section className="admin-panel admin-contact-panel"><div className="admin-panel-head"><div><h2>联系消息</h2><p>来自网站联系表单的用户咨询和反馈。</p></div><button className="icon-button" title="刷新消息" onClick={() => void loadMessages()} disabled={loading}><RefreshCw size={17} className={loading ? "spin" : ""} /></button></div><div className="admin-contact-tools"><div className="admin-contact-summary"><Mail size={16} /> 通过登录会话安全访问联系消息。</div><div className="admin-contact-filters"><input className="search-box" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索姓名、邮箱、主题或内容" /><select value={filter} onChange={(event) => setFilter(event.target.value as "all" | ContactMessageStatus)}><option value="all">全部状态</option><option value="new">待处理</option><option value="in_progress">跟进中</option><option value="closed">已关闭</option></select></div></div>{error && <div className="admin-contact-error" role="alert">{error}</div>}<div className="admin-panel-body admin-contact-table-wrap"><table className="admin-table admin-contact-table"><thead><tr><th>发件人</th><th>主题</th><th>提交时间</th><th>状态</th><th aria-label="操作" /></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="admin-empty"><RefreshCw size={17} className="spin" /> 正在载入消息...</td></tr> : visibleMessages.length ? visibleMessages.map((message) => <tr key={message.id} className={selected?.id === message.id ? "selected" : ""}><td><strong>{message.name}</strong><span>{message.email}</span></td><td><button className="admin-subject-button" onClick={() => setSelected(message)}>{message.subject}</button><span className="admin-message-preview">{message.message}</span></td><td>{displayDate(message.createdAt)}</td><td><select className={`admin-status-select status-${message.status}`} value={message.status} disabled={working} onChange={(event) => void updateStatus(message.id, event.target.value as ContactMessageStatus)}>{Object.entries(statusCopy).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td><div className="admin-row-actions"><button className="icon-button" title="查看消息" onClick={() => setSelected(message)}><Eye size={16} /></button><button className="icon-button danger" title="删除消息" onClick={() => void removeMessage(message.id)} disabled={working}><Trash2 size={16} /></button></div></td></tr>) : <tr><td colSpan={5} className="admin-empty"><Mail size={19} /> 暂无匹配的联系消息。</td></tr>}</tbody></table></div></section><section className="admin-panel" style={{ marginTop: 18 }}><div className="admin-panel-head"><h2>内容管理</h2><div style={{ display: "flex", gap: 8, alignItems: "center" }}><input className="search-box" placeholder="搜索工具或文章" /><button className="secondary"><FileText size={15} /> 新建内容</button></div></div><div className="admin-panel-body"><table className="admin-table"><thead><tr><th>名称</th><th>类型</th><th>SEO 状态</th><th>最后更新</th></tr></thead><tbody><tr><td>PaperPilot 首页</td><td>页面</td><td><span className="status"><CheckCircle2 size={12} /> 已发布</span></td><td>刚刚</td></tr><tr><td>PDF 压缩</td><td>工具页</td><td><span className="status"><CheckCircle2 size={12} /> 已发布</span></td><td>刚刚</td></tr><tr><td>如何安全处理 PDF 文件</td><td>文章</td><td><span className="status"><CheckCircle2 size={12} /> 草稿可发布</span></td><td>今天</td></tr></tbody></table></div></section><div style={{ display: "flex", gap: 20, color: "#667085", fontSize: 13, marginTop: 24 }}><span><LayoutDashboard size={14} style={{ verticalAlign: "-3px" }} /> 工作区管理</span><span><Users size={14} style={{ verticalAlign: "-3px" }} /> 用户反馈</span></div></main>{showPasswordDialog && <PasswordDialog onClose={() => setShowPasswordDialog(false)} />}{selectedPanel}</div>;
}

export default function AdminPage() {
  const [username, setUsername] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => { fetch("/api/admin/auth/session", { cache: "no-store" }).then(async (response) => { if (!response.ok) return; const result = await response.json(); setUsername(result.username); }).finally(() => setChecking(false)); }, []);
  async function logout() { await fetch("/api/admin/auth/logout", { method: "POST" }); setUsername(null); }
  if (checking) return <div className="admin-session-loading"><RefreshCw size={22} className="spin" /></div>;
  return username ? <Dashboard username={username} onLogout={() => void logout()} /> : <LoginScreen onAuthenticated={setUsername} />;
}
