import "server-only";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { renderEmail, type EmailTemplate } from "./templates";

/** EmailPort (ARCHITECTURE §5): providers are adapters; callers only name a template. */
type SendResult = { providerMessageId: string | null };
type Adapter = (message: { to: string; subject: string; html: string; text: string }) => Promise<SendResult>;

const consoleAdapter: Adapter = async ({ to, subject, text }) => {
  // Development only: print the message so links (verification, reset) can be followed locally.
  logger.info("email_console", { to, subject, text });
  return { providerMessageId: null };
};

const resendAdapter: Adapter = async ({ to, subject, html, text }) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.EMAIL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "KRM.lib <noreply@krmlib.local>",
      to: [to],
      subject,
      html,
      text,
      ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
    }),
  });
  if (!response.ok) throw new Error(`Resend responded ${response.status}`);
  const body = (await response.json()) as { id?: string };
  return { providerMessageId: body.id ?? null };
};

function adapter(): Adapter {
  if (process.env.EMAIL_PROVIDER === "resend" && process.env.EMAIL_API_KEY) return resendAdapter;
  if (process.env.APP_ENV === "production") throw new Error("Email provider is not configured");
  return consoleAdapter;
}

/**
 * Sends a transactional email and records it in `email_log` (recipient stored hashed).
 * Failures are logged and never break the calling flow (ERROR_HANDLING: email provider down).
 */
export async function sendEmail<T extends EmailTemplate["template"]>(
  to: string,
  template: T,
  data: Extract<EmailTemplate, { template: T }>["data"],
): Promise<void> {
  const rendered = renderEmail({ template, data } as EmailTemplate);
  try {
    const { providerMessageId } = await adapter()({ to, ...rendered });
    await db.emailLog.create({ data: { toHash: sha256(to.toLowerCase()), template, providerMessageId, status: "sent" } });
  } catch (error) {
    logger.error("email_send_failed", { template, error });
    await db.emailLog
      .create({ data: { toHash: sha256(to.toLowerCase()), template, status: "failed", error: String(error).slice(0, 500) } })
      .catch(() => undefined);
  }
}
