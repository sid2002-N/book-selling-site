/**
 * Transactional email templates (master §67). Plain, readable layouts using brand colours
 * (G9). Every template has an HTML and a text part.
 */
export type EmailTemplate =
  | { template: "verify_email"; data: { name: string; url: string } }
  | { template: "welcome"; data: { name: string; libraryUrl: string } }
  | { template: "password_reset"; data: { name: string; url: string } }
  | { template: "password_changed"; data: { name: string } }
  | { template: "two_factor_enabled"; data: { name: string } }
  | { template: "order_confirmation"; data: { name: string; orderNumber: string; total: string; items: string[]; url: string } }
  | { template: "payment_failed"; data: { name: string; orderNumber: string; url: string } }
  | { template: "payment_pending"; data: { name: string; orderNumber: string; url: string } }
  | { template: "refund_update"; data: { name: string; orderNumber: string; status: string; amount: string } }
  | { template: "guest_library_access"; data: { orderNumber: string; url: string } };

type Rendered = { subject: string; html: string; text: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, paragraphs: string[], cta?: { label: string; url: string }): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px;color:#5E4A3C;font-size:15px;line-height:1.6">${esc(p)}</p>`).join("");
  const button = cta
    ? `<p style="margin:24px 0"><a href="${esc(cta.url)}" style="display:inline-block;background:#2B1E18;color:#F8EEDF;text-decoration:none;padding:12px 22px;border-radius:12px;font-weight:600;font-size:14px">${esc(cta.label)}</a></p><p style="margin:0 0 16px;color:#8C7767;font-size:12px">If the button doesn't work, copy this link: ${esc(cta.url)}</p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#FBF3E8;font-family:Inter,Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center"><table role="presentation" width="100%" style="max-width:560px;background:#FFF9F1;border:1px solid #EBDCC8;border-radius:16px;padding:32px"><tr><td><p style="margin:0 0 24px;font-family:Georgia,serif;font-size:22px;color:#2A1D16">KRM<span style="color:#D98A2B">.</span>lib</p><h1 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:500;font-size:24px;color:#2A1D16">${esc(title)}</h1>${body}${button}<p style="margin:24px 0 0;color:#8C7767;font-size:12px">A small library for a bigger tomorrow.</p></td></tr></table></td></tr></table></body></html>`;
}

function text(title: string, paragraphs: string[], cta?: { label: string; url: string }): string {
  return [title, "", ...paragraphs, ...(cta ? ["", `${cta.label}: ${cta.url}`] : []), "", "— KRM.lib"].join("\n");
}

function build(subject: string, title: string, paragraphs: string[], cta?: { label: string; url: string }): Rendered {
  return { subject, html: layout(title, paragraphs, cta), text: text(title, paragraphs, cta) };
}

export function renderEmail(email: EmailTemplate): Rendered {
  switch (email.template) {
    case "verify_email":
      return build("Verify your email for KRM.lib", "Verify your email", [
        `Hi ${email.data.name}, confirm your email address to activate your KRM.lib account.`,
        "This link is valid for 24 hours.",
      ], { label: "Verify email", url: email.data.url });
    case "welcome":
      return build("Welcome to KRM.lib", "Your library is ready", [
        `Welcome, ${email.data.name}. Every book, guide and workbook you add will live on your own shelf.`,
      ], { label: "Open my library", url: email.data.libraryUrl });
    case "password_reset":
      return build("Reset your KRM.lib password", "Reset your password", [
        `Hi ${email.data.name}, we received a request to reset your password.`,
        "This link is valid for 1 hour. If you didn't ask for this, you can ignore this email — your password won't change.",
      ], { label: "Choose a new password", url: email.data.url });
    case "password_changed":
      return build("Your KRM.lib password was changed", "Password changed", [
        `Hi ${email.data.name}, your password was just changed and other sessions were signed out.`,
        "If this wasn't you, reset your password immediately and contact support.",
      ]);
    case "two_factor_enabled":
      return build("Two-factor authentication enabled", "Two-factor authentication is on", [
        `Hi ${email.data.name}, two-factor authentication is now protecting your account. Keep your recovery codes somewhere safe.`,
      ]);
    case "order_confirmation":
      return build(`Order ${email.data.orderNumber} confirmed`, "Thank you — your order is confirmed", [
        `Hi ${email.data.name}, payment for order ${email.data.orderNumber} (${email.data.total}) was received.`,
        `In your library now: ${email.data.items.join(", ")}.`,
      ], { label: "View order", url: email.data.url });
    case "payment_failed":
      return build(`Payment failed for ${email.data.orderNumber}`, "Your payment didn't go through", [
        `Hi ${email.data.name}, we couldn't complete payment for order ${email.data.orderNumber}. No money has been deducted for this attempt.`,
        "You can try again with the same or a different payment method.",
      ], { label: "Try again", url: email.data.url });
    case "payment_pending":
      return build(`Payment pending for ${email.data.orderNumber}`, "We're confirming your payment", [
        `Hi ${email.data.name}, your payment for order ${email.data.orderNumber} is being verified with the payment partner.`,
        "We'll email you as soon as it's confirmed — usually within a few minutes.",
      ], { label: "View order status", url: email.data.url });
    case "refund_update":
      return build(`Refund update for ${email.data.orderNumber}`, `Refund ${email.data.status}`, [
        `Hi ${email.data.name}, your refund of ${email.data.amount} for order ${email.data.orderNumber} is now ${email.data.status}.`,
      ]);
    case "guest_library_access":
      return build(`Your downloads for ${email.data.orderNumber}`, "Your purchase is ready", [
        `Thanks for your order ${email.data.orderNumber}. Create a free account or sign in with this email to keep your purchases in your KRM.lib library.`,
      ], { label: "Access my purchase", url: email.data.url });
  }
}
