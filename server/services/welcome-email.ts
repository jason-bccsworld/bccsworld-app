/**
 * Welcome email for newly signed-up organization admins.
 *
 * Transport: same SMTP env-var configuration as email-alerts (SMTP_HOST,
 * SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE). When SMTP is not
 * configured the send is surfaced as a skip reason (never silently dropped)
 * so the caller can fall back to the in-app welcome message.
 */
import nodemailer from "nodemailer";

export function welcomeEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

function buildTransport() {
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface WelcomeEmailParams {
  to: string;
  firstName: string;
  organizationName: string;
  signInUrl: string;
}

const ONBOARDING_STEPS: Array<{ title: string; detail: string }> = [
  {
    title: "Generate your signing keys",
    detail: "Open Key Management to review the Ed25519 signing key created for your organization (or generate a fresh one) so training records can be cryptographically signed.",
  },
  {
    title: "Invite your team",
    detail: "Add instructors, auditors, and viewers from the admin dashboard so your team can start working right away — your trial includes 5 seats.",
  },
  {
    title: "Add your certificate number",
    detail: "Enter your training certificate number in organization settings so compliance checks and generated documents reference the right certificate.",
  },
];

/**
 * Send the post-signup welcome email. Returns null on success, or a
 * human-readable skip/failure reason the caller must handle (e.g. by
 * enabling the in-app welcome fallback).
 */
export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<string | null> {
  if (!welcomeEmailConfigured()) {
    return "Welcome email skipped: SMTP is not configured (set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM).";
  }

  const { to, firstName, organizationName, signInUrl } = params;
  const subject = `Welcome to BCCS — ${organizationName} is ready`;

  const stepsHtml = ONBOARDING_STEPS.map(
    (s, i) =>
      `<li style="margin-bottom:10px;"><strong>${i + 1}. ${escapeHtml(s.title)}</strong><br/>${escapeHtml(s.detail)}</li>`,
  ).join("");
  const html = `
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>Your organization <strong>${escapeHtml(organizationName)}</strong> has been created and your 30-day trial is active.</p>
    <p><a href="${escapeHtml(signInUrl)}">Sign in to your workspace</a></p>
    <p>Here are the top three steps to get set up:</p>
    <ol style="padding-left:18px; list-style:none;">${stepsHtml}</ol>
    <p>Questions? Just reply to this email.</p>
    <p>— The BCCS Team</p>
  `;
  const text =
    `Hi ${firstName},\n\n` +
    `Your organization "${organizationName}" has been created and your 30-day trial is active.\n\n` +
    `Sign in: ${signInUrl}\n\n` +
    `Top three steps to get set up:\n` +
    ONBOARDING_STEPS.map((s, i) => `${i + 1}. ${s.title} — ${s.detail}`).join("\n") +
    `\n\n— The BCCS Team`;

  try {
    await buildTransport().sendMail({
      from: process.env.SMTP_FROM || process.env.ALERT_EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
    return null;
  } catch (err: any) {
    return `Welcome email delivery failed: ${err?.message ?? String(err)}`;
  }
}
