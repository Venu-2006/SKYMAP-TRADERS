import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = env.SMTP_HOST && env.SMTP_USER
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  : null;

/** Sends mail via SMTP; in development without SMTP configured, logs the message instead. */
export async function sendMail(to: string, subject: string, html: string) {
  if (!transporter) {
    console.info(`📧 [mail:dev] to=${to} subject="${subject}"\n${html.replace(/<[^>]+>/g, ' ')}`);
    return;
  }
  await transporter.sendMail({ from: env.MAIL_FROM, to, subject, html });
}

const layout = (title: string, body: string, cta?: { href: string; label: string }) => `
  <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0f172a">
    <h2 style="color:#e11d48;margin:0 0 16px">SKYMAP TRADERS</h2>
    <h3>${title}</h3>
    <p style="line-height:1.6">${body}</p>
    ${cta ? `<p><a href="${cta.href}" style="display:inline-block;background:#e11d48;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">${cta.label}</a></p>` : ''}
    <p style="font-size:12px;color:#64748b">If you did not request this, you can safely ignore this email.</p>
  </div>`;

export const emails = {
  verify: (name: string, link: string) =>
    layout(`Welcome, ${name}!`, 'Please confirm your email address to activate your account. This link expires in 24 hours.', {
      href: link,
      label: 'Verify email',
    }),
  reset: (name: string, link: string) =>
    layout('Reset your password', `Hi ${name}, use the button below to set a new password. This link expires in 30 minutes.`, {
      href: link,
      label: 'Reset password',
    }),
};
