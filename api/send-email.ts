import { Resend } from 'resend';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { to, subject, html, pdfBase64, pdfFilename } = req.body as {
    to: string;
    subject: string;
    html: string;
    pdfBase64?: string;
    pdfFilename?: string;
  };

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
  }

  const attachments = pdfBase64
    ? [{ filename: pdfFilename ?? 'statement.pdf', content: pdfBase64 }]
    : [];

  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'MoneyFlow <noreply@resend.dev>',
      to,
      subject,
      html,
      attachments,
    });
    return res.status(200).json({ id: result.data?.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: msg });
  }
}
