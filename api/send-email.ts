import type { VercelRequest, VercelResponse } from '@vercel/node';

// Uses Resend REST API directly — avoids ESM/CJS compatibility issues with the SDK.
// fetch is available natively in Node.js 18+ (Vercel default runtime).

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'RESEND_API_KEY is not configured. Add it in Vercel → Project Settings → Environment Variables.',
    });
  }

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

  // Resend REST API accepts base64 strings directly in attachments — no Buffer conversion needed.
  const payload: Record<string, unknown> = {
    from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
    to,
    subject,
    html,
  };

  if (pdfBase64) {
    payload.attachments = [
      { filename: pdfFilename ?? 'statement.pdf', content: pdfBase64 },
    ];
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json() as { id?: string; name?: string; message?: string };

    if (!response.ok) {
      const errMsg = data.message ?? data.name ?? `Resend API error ${response.status}`;
      console.error('[send-email] Resend rejected:', errMsg);
      return res.status(response.status).json({ error: errMsg });
    }

    return res.status(200).json({ id: data.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[send-email] Unexpected error:', msg);
    return res.status(500).json({ error: msg });
  }
}
