// Gmail API Service for CA Financial Automation & Audit Workspace
import { GoogleAuthExpiredError } from './driveService';

function handleGmailError(res: Response, errData: any, actionDesc: string): never {
  const msg = errData?.error?.message || `Failed to ${actionDesc} (HTTP ${res.status})`;
  if (
    res.status === 401 ||
    msg.includes('UNAUTHENTICATED') ||
    msg.includes('Invalid Credentials') ||
    msg.includes('invalid authentication credentials')
  ) {
    throw new GoogleAuthExpiredError(
      `Google Workspace access token has expired while trying to ${actionDesc}. Please reconnect your Google account.`,
      res.status
    );
  }
  throw new Error(msg);
}

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  labelIds: string[];
}

export interface GmailMessageDetail extends GmailMessageSummary {
  cc?: string;
  bcc?: string;
  bodyHtml?: string;
  bodyText?: string;
}

export interface SendEmailParams {
  to: string;
  from?: string;
  cc?: string;
  bcc?: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
}

/**
 * Encodes string to standard Base64URL without URL-unsafe chars or padding
 */
function utf8ToBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Builds RFC 2822 compliant MIME email message string
 */
function buildMimeMessage(params: SendEmailParams): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const lines: string[] = [
    `To: ${params.to}`,
  ];

  if (params.from) {
    lines.push(`From: ${params.from}`);
  }
  if (params.cc) {
    lines.push(`Cc: ${params.cc}`);
  }
  if (params.bcc) {
    lines.push(`Bcc: ${params.bcc}`);
  }

  // UTF-8 encoded subject
  const subjectEncoded = `=?UTF-8?B?${btoa(
    Array.from(new TextEncoder().encode(params.subject))
      .map((b) => String.fromCharCode(b))
      .join('')
  )}?=`;
  lines.push(`Subject: ${subjectEncoded}`);
  lines.push('MIME-Version: 1.0');
  lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
  lines.push('');

  // Plaintext part
  const textContent = params.bodyText || params.bodyHtml.replace(/<[^>]*>?/gm, '');
  lines.push(`--${boundary}`);
  lines.push('Content-Type: text/plain; charset=UTF-8');
  lines.push('Content-Transfer-Encoding: base64');
  lines.push('');
  lines.push(
    btoa(
      Array.from(new TextEncoder().encode(textContent))
        .map((b) => String.fromCharCode(b))
        .join('')
    )
  );
  lines.push('');

  // HTML part
  lines.push(`--${boundary}`);
  lines.push('Content-Type: text/html; charset=UTF-8');
  lines.push('Content-Transfer-Encoding: base64');
  lines.push('');
  lines.push(
    btoa(
      Array.from(new TextEncoder().encode(params.bodyHtml))
        .map((b) => String.fromCharCode(b))
        .join('')
    )
  );
  lines.push('');

  // End boundary
  lines.push(`--${boundary}--`);

  return lines.join('\r\n');
}

/**
 * Get Gmail User Profile
 */
export async function getGmailProfile(accessToken: string): Promise<GmailProfile> {
  if (!accessToken || accessToken.startsWith('sandbox_')) {
    throw new Error('Gmail session is not active or token has expired. Please sign in with your Google account.');
  }

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    handleGmailError(res, errData, 'fetch Gmail profile');
  }

  return res.json();
}

/**
 * List recent messages with parsed headers
 */
export async function listGmailMessages(
  accessToken: string,
  query: string = '',
  maxResults: number = 15
): Promise<GmailMessageSummary[]> {
  if (!accessToken || accessToken.startsWith('sandbox_')) {
    return [];
  }
  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  url.searchParams.set('maxResults', maxResults.toString());
  if (query.trim()) {
    url.searchParams.set('q', query.trim());
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    handleGmailError(res, errData, 'list Gmail messages');
  }

  const data = await res.json();
  const rawList: { id: string; threadId: string }[] = data.messages || [];

  if (rawList.length === 0) {
    return [];
  }

  // Fetch summaries in parallel (batched limit to maxResults)
  const summaries = await Promise.all(
    rawList.map(async (item) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
          }
        );

        if (!detailRes.ok) {
          return null;
        }

        const detail = await detailRes.json();
        const headers: { name: string; value: string }[] = detail.payload?.headers || [];
        const subject = headers.find((h) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
        const from = headers.find((h) => h.name.toLowerCase() === 'from')?.value || '';
        const to = headers.find((h) => h.name.toLowerCase() === 'to')?.value || '';
        const date = headers.find((h) => h.name.toLowerCase() === 'date')?.value || '';

        return {
          id: detail.id,
          threadId: detail.threadId,
          snippet: detail.snippet || '',
          subject,
          from,
          to,
          date,
          labelIds: detail.labelIds || [],
        };
      } catch {
        return null;
      }
    })
  );

  return summaries.filter((s): s is GmailMessageSummary => s !== null);
}

/**
 * Fetch full message details including parsed body
 */
export async function getGmailMessageDetail(
  accessToken: string,
  messageId: string
): Promise<GmailMessageDetail> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    handleGmailError(res, errData, 'fetch message details');
  }

  const data = await res.json();
  const headers: { name: string; value: string }[] = data.payload?.headers || [];
  const subject = headers.find((h) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
  const from = headers.find((h) => h.name.toLowerCase() === 'from')?.value || '';
  const to = headers.find((h) => h.name.toLowerCase() === 'to')?.value || '';
  const cc = headers.find((h) => h.name.toLowerCase() === 'cc')?.value;
  const date = headers.find((h) => h.name.toLowerCase() === 'date')?.value || '';

  // Extract body parts
  let bodyHtml = '';
  let bodyText = '';

  const extractBody = (part: any) => {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      try {
        const decoded = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        bodyText += decoded;
      } catch {}
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      try {
        const decoded = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        bodyHtml += decoded;
      } catch {}
    }

    if (part.parts && Array.isArray(part.parts)) {
      part.parts.forEach(extractBody);
    }
  };

  if (data.payload) {
    extractBody(data.payload);
  }

  return {
    id: data.id,
    threadId: data.threadId,
    snippet: data.snippet || '',
    subject,
    from,
    to,
    cc,
    date,
    labelIds: data.labelIds || [],
    bodyHtml: bodyHtml || undefined,
    bodyText: bodyText || data.snippet || '',
  };
}

/**
 * Send email via Gmail API
 */
export async function sendGmailEmail(
  accessToken: string,
  params: SendEmailParams
): Promise<{ id: string; threadId: string }> {
  if (!accessToken || accessToken.startsWith('sandbox_')) {
    throw new Error('Gmail session is not active or token has expired. Please sign in with your Google account.');
  }

  const mime = buildMimeMessage(params);
  const raw = utf8ToBase64Url(mime);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    handleGmailError(res, errData, 'send email');
  }

  return res.json();
}

/**
 * Save draft email in Gmail
 */
export async function createGmailDraft(
  accessToken: string,
  params: SendEmailParams
): Promise<{ id: string; message: { id: string } }> {
  const mime = buildMimeMessage(params);
  const raw = utf8ToBase64Url(mime);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: { raw },
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    handleGmailError(res, errData, 'create draft in Gmail');
  }

  return res.json();
}

/**
 * Move message to Trash
 */
export async function trashGmailMessage(accessToken: string, messageId: string): Promise<void> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    handleGmailError(res, errData, 'trash email');
  }
}
