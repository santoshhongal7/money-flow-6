// Uses Node.js built-in `https` module — works on all Node.js versions,
// avoids global `fetch` availability concerns, and has zero external dependencies.
import https from 'https';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/** POST JSON to a URL and return the status + parsed body. */
function postJSON(
  url: string,
  payload: unknown,
  authToken: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(payload);
    const parsed = new URL(url);

    const req = https.request(
      {
        hostname: parsed.hostname,
        port: 443,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk: string) => { raw += chunk; });
        res.on('end', () => {
          let parsed: Record<string, unknown> = {};
          try { parsed = JSON.parse(raw) as Record<string, unknown>; } catch { /* non-JSON */ }
          resolve({ status: res.statusCode ?? 500, body: parsed });
        });
      },
    );

    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

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

  const payload: Record<string, unknown> = {
    from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
    to,
    subject,
    html,
  };

  if (pdfBase64) {
    payload.attachments = [{ filename: pdfFilename ?? 'statement.pdf', content: pdfBase64 }];
  }

  try {
    const { status, body } = await postJSON('https://api.resend.com/emails', payload, apiKey);

    if (status >= 400) {
      const errMsg =
        (body.message as string | undefined) ??
        (body.name as string | undefined) ??
        `Resend API error ${status}`;
      console.error('[send-email] Resend rejected:', errMsg, body);
      return res.status(status).json({ error: errMsg });
    }

    return res.status(200).json({ id: body.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[send-email] Unexpected error:', msg);
    return res.status(500).json({ error: msg });
  }
}
