"use client";

import { CheckCircle2, Send } from "lucide-react";
import { FormEvent, useState } from "react";
import type { Locale } from "../lib/i18n";

type FormState = "idle" | "submitting" | "success" | "error";
const initialValues = { name: "", email: "", subject: "", message: "", website: "" };

const copy: Record<Locale, {
  name: string;
  email: string;
  subject: string;
  message: string;
  submitting: string;
  submit: string;
  error: string;
  successTitle: string;
  successText: string;
  sendAnother: string;
}> = {
  zh: { name: "姓名", email: "电子邮件地址", subject: "主题", message: "消息", submitting: "正在发送...", submit: "发送消息", error: "提交失败，请稍后重试。", successTitle: "消息已发送", successText: "感谢您的联系。我们会尽快查看并回复。", sendAnother: "发送另一条消息" },
  en: { name: "Name", email: "Email address", subject: "Subject", message: "Message", submitting: "Sending...", submit: "Send message", error: "Submission failed. Please try again later.", successTitle: "Message sent", successText: "Thanks for reaching out. We’ll review it and reply soon.", sendAnother: "Send another message" },
  de: { name: "Name", email: "E-Mail-Adresse", subject: "Betreff", message: "Nachricht", submitting: "Wird gesendet...", submit: "Nachricht senden", error: "Senden fehlgeschlagen. Bitte versuche es später erneut.", successTitle: "Nachricht gesendet", successText: "Danke für deine Nachricht. Wir melden uns bald.", sendAnother: "Weitere Nachricht senden" },
  fr: { name: "Nom", email: "Adresse e-mail", subject: "Sujet", message: "Message", submitting: "Envoi...", submit: "Envoyer le message", error: "L’envoi a échoué. Veuillez réessayer plus tard.", successTitle: "Message envoyé", successText: "Merci pour votre message. Nous répondrons bientôt.", sendAnother: "Envoyer un autre message" },
  nl: { name: "Naam", email: "E-mailadres", subject: "Onderwerp", message: "Bericht", submitting: "Verzenden...", submit: "Bericht verzenden", error: "Verzenden mislukt. Probeer het later opnieuw.", successTitle: "Bericht verzonden", successText: "Bedankt voor je bericht. We reageren zo snel mogelijk.", sendAnother: "Nog een bericht sturen" },
  ja: { name: "名前", email: "メールアドレス", subject: "件名", message: "メッセージ", submitting: "送信中...", submit: "メッセージを送信", error: "送信に失敗しました。しばらくしてからもう一度お試しください。", successTitle: "メッセージを送信しました", successText: "お問い合わせありがとうございます。確認後、できるだけ早く返信します。", sendAnother: "別のメッセージを送信" },
  ko: { name: "이름", email: "이메일 주소", subject: "제목", message: "메시지", submitting: "전송 중...", submit: "메시지 보내기", error: "제출에 실패했습니다. 잠시 후 다시 시도해 주세요.", successTitle: "메시지를 보냈습니다", successText: "문의해 주셔서 감사합니다. 확인 후 곧 답변드리겠습니다.", sendAnother: "다른 메시지 보내기" },
  ru: { name: "Имя", email: "Адрес электронной почты", subject: "Тема", message: "Сообщение", submitting: "Отправка...", submit: "Отправить сообщение", error: "Не удалось отправить. Повторите попытку позже.", successTitle: "Сообщение отправлено", successText: "Спасибо за обращение. Мы скоро ответим.", sendAnother: "Отправить ещё сообщение" },
};

export function ContactForm({ locale }: { locale: Locale }) {
  const t = copy[locale] ?? copy.zh;
  const [values, setValues] = useState(initialValues);
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState("");

  function update(field: keyof typeof initialValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setState("submitting");
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || t.error);
      setValues(initialValues);
      setState("success");
    } catch (reason) {
      setState("error");
      setError(reason instanceof Error ? reason.message : t.error);
    }
  }

  if (state === "success") return <div className="contact-success" role="status"><CheckCircle2 size={30} aria-hidden="true" /><h2>{t.successTitle}</h2><p>{t.successText}</p><button type="button" className="contact-text-button" onClick={() => setState("idle")}>{t.sendAnother}</button></div>;

  return <form className="contact-form" onSubmit={submit}>
    <label className="contact-field"><span>{t.name}</span><input value={values.name} onChange={(event) => update("name", event.target.value)} autoComplete="name" maxLength={120} required /></label>
    <label className="contact-field"><span>{t.email}</span><input type="email" value={values.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" maxLength={254} required /></label>
    <label className="contact-field"><span>{t.subject}</span><input value={values.subject} onChange={(event) => update("subject", event.target.value)} maxLength={200} required /></label>
    <label className="contact-field"><span>{t.message}</span><textarea value={values.message} onChange={(event) => update("message", event.target.value)} maxLength={5000} required /></label>
    <label className="contact-honeypot" aria-hidden="true"><span>Website</span><input tabIndex={-1} autoComplete="off" value={values.website} onChange={(event) => update("website", event.target.value)} /></label>
    {state === "error" && <p className="contact-error" role="alert">{error}</p>}
    <button className="contact-submit" type="submit" disabled={state === "submitting"}><Send size={17} aria-hidden="true" /> {state === "submitting" ? t.submitting : t.submit}</button>
  </form>;
}
