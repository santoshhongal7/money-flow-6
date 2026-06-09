import { Resend } from 'resend';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // Fail fast with a clear message if the API key is missing
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'RESEND_API_KEY is not set. Add it in Vercel → Project Settings → Environment Variables.',
    });
  }

  const resend = new Resend(apiKey);

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

  // Resend expects attachment content as a Buffer, not a raw base64 string
  const attachments = pdfBase64
    ? [{ filename: pdfFilename ?? 'statement.pdf', content: Buffer.from(pdfBase64, 'base64') }]
    : [];

  // "from" must be a verified Resend domain OR Resend's own test address
  const from = process.env.RESEND_FROM_EMAIL ?? 'MoneyFlow <onboarding@resend.dev>';

  try {
    const result = await resend.emails.send({ from, to, subject, html, attachments });

    if (result.error) {
      // Resend returns errors in result.error rather than throwing in some cases
      return res.status(400).json({ error: result.error.message });
    }

    return res.status(200).json({ id: result.data?.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[send-email] Resend error:', msg);
    return res.status(500).json({ error: msg });
  }
}
