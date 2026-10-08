"use client";

import { Check, Mail, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { contact, contactForm } from "@/config/site";
import { fill, useHref, useL, useT } from "@/lib/i18n";
import { Section, btn } from "./Section";

type Status = "idle" | "sending" | "success" | "whatsapp" | "error";
type Fields = { name: string; business: string; email: string; need: string; consent: boolean };

const empty: Fields = { name: "", business: "", email: "", need: "", consent: false };

export function Contact() {
  const t = useT();
  const tr = useL();
  const href = useHref();
  const f = t.contact.form;
  const [fields, setFields] = useState<Fields>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [waUrl, setWaUrl] = useState("");
  const byWhatsApp = !contactForm.endpoint;


  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const next: typeof errors = {};
    if (!fields.name.trim()) next.name = f.required;
    if (!fields.email.trim()) next.email = f.required;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) next.email = f.invalidEmail;
    if (!fields.need.trim()) next.need = f.required;
    if (!fields.consent) next.consent = f.required;
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) document.getElementById(`contact-${first}`)?.focus();
    return !first;
  };

  /** The enquiry as a WhatsApp message to contact.whatsapp, ready for the visitor to send. */
  const whatsappUrl = () => {
    const text = fill(fields.business.trim() ? f.waMessage : f.waMessageNoBusiness, {
      name: fields.name.trim(),
      business: fields.business.trim(),
      email: fields.email.trim(),
      message: fields.need.trim(),
    });
    return `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(text)}`;
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    const form = new FormData(e.currentTarget);
    // Spam honeypot: real people never fill the hidden "_gotcha" field.
    if (form.get("_gotcha")) {
      setStatus("success");
      return;
    }

    /*
     * ── WHERE ENQUIRIES GO ───────────────────────────────────────
     * No endpoint set (src/config/site.ts → contactForm): open WhatsApp with the message
     * filled in. This must happen straight away in the click, or browsers block the new tab.
     * Endpoint set (e.g. Formspree): send it as JSON, which arrives in your email.
     */
    if (byWhatsApp) {
      const url = whatsappUrl();
      setWaUrl(url);
      window.open(url, "_blank", "noopener,noreferrer");
      setStatus("whatsapp");
      setFields(empty);
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch(contactForm.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: fields.name,
          business: fields.business,
          email: fields.email,
          message: fields.need,
          _subject: `New website enquiry: ${fields.business || fields.name}`,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("success");
      setFields(empty);
    } catch {
      setStatus("error");
    }
  };


  const input =
    "mt-1.5 block w-full min-h-12 rounded-xl border border-ink/20 bg-white px-4 text-ink placeholder:text-muted/80 focus:border-cobalt focus:outline-2 focus:outline-offset-0 focus:outline-cobalt";

  return (
    <Section id="contact" title={t.contact.title} intro={t.contact.intro} tone="cobalt">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="space-y-3 lg:col-span-4">
          <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noopener noreferrer" className={`${btn.onCobalt} w-full gap-2.5`}>
            <MessageCircle aria-hidden className="size-5" />
            {t.contact.whatsapp}
          </a>
          <a href={`mailto:${tr(contact.email)}`} className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full border border-white/60 px-6 font-medium text-white transition-colors hover:bg-white hover:text-cobalt">
            <Mail aria-hidden className="size-5 shrink-0" />
            <span className="truncate">{tr(contact.email)}</span>
          </a>
          <ul className="space-y-2 pt-6 text-cobalt-soft">
            {t.contact.details.map((d) => (
              <li key={d} className="flex gap-2.5">
                <Check aria-hidden className="mt-1 size-4 shrink-0 text-white" strokeWidth={3} />
                {d}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[24px] bg-white p-6 text-ink sm:p-10 lg:col-span-8">
          {status === "whatsapp" ? (
            <div role="status">
              <p className="heading text-4xl">{f.waTitle}</p>
              <p className="mt-2 text-lg text-muted">{f.waBody}</p>
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className={`${btn.primary} mt-6 gap-2.5`}>
                <MessageCircle aria-hidden className="size-5" />
                {f.waOpen}
              </a>
            </div>
          ) : status === "success" ? (
            <div role="status">
              <p className="heading text-4xl">{f.successTitle}</p>
              <p className="mt-2 text-lg text-muted">{f.successBody}</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
              <p className="font-medium sm:col-span-2">{t.contact.or}</p>
              <Field id="contact-name" label={f.name} error={errors.name}>
                <input id="contact-name" name="name" autoComplete="name" required maxLength={100} value={fields.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? "contact-name-error" : undefined} className={input} />
              </Field>
              <Field id="contact-business" label={f.business}>
                <input id="contact-business" name="business" autoComplete="organization" maxLength={120} value={fields.business} onChange={(e) => set("business", e.target.value)} className={input} />
              </Field>
              <Field id="contact-email" label={f.email} error={errors.email} className="sm:col-span-2">
                <input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254} value={fields.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "contact-email-error" : undefined} className={input} />
              </Field>
              <Field id="contact-need" label={f.need} error={errors.need} className="sm:col-span-2">
                <textarea id="contact-need" name="message" rows={4} required maxLength={5000} placeholder={f.needPlaceholder} value={fields.need} onChange={(e) => set("need", e.target.value)} aria-invalid={!!errors.need} aria-describedby={errors.need ? "contact-need-error" : undefined} className={`${input} resize-y py-3`} />
              </Field>


              {/* Honeypot (hidden from people and screen readers) */}
              <div aria-hidden="true" className="hidden">
                <label>
                  Leave empty <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" />
                </label>
              </div>

              <div className="sm:col-span-2">
                <label className="flex cursor-pointer items-start gap-3 text-muted">
                  <input id="contact-consent" type="checkbox" checked={fields.consent} onChange={(e) => set("consent", e.target.checked)} aria-invalid={!!errors.consent} aria-describedby={errors.consent ? "contact-consent-error" : undefined} className="mt-1 size-4 shrink-0 accent-[var(--color-cobalt)]" />
                  <span>
                    {f.consent}{" "}
                    <Link href={href("/privacy")} className="text-ink underline underline-offset-4">
                      {f.privacy}
                    </Link>
                    {f.consentAfter}
                  </span>
                </label>
                {errors.consent && (
                  <p id="contact-consent-error" className="mt-1.5 text-sm font-semibold text-[#A3262F]">
                    {errors.consent}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <button type="submit" disabled={status === "sending"} className={`${btn.primary} w-full cursor-pointer disabled:opacity-60 sm:w-auto`}>
                  {byWhatsApp && <MessageCircle aria-hidden className="mr-2 size-5" />}
                  {status === "sending" ? f.sending : byWhatsApp ? f.submitWhatsApp : f.submit}
                </button>
                {byWhatsApp && <p className="mt-3 text-sm text-muted">{f.waNote}</p>}
                {status === "error" && (
                  <p role="alert" className="mt-3 font-semibold text-[#A3262F]">
                    {f.error}{" "}
                    <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                      {f.waInstead}
                    </a>
                  </p>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </Section>
  );
}

function Field({ id, label, error, className = "", children }: { id: string; label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-semibold text-[#A3262F]">
          {error}
        </p>
      )}
    </div>
  );
}
