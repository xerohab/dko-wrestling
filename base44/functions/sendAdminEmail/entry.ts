import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { buildEmailTemplate, linkify } from '../../shared/emailTemplate.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'editor') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const subject = (body.subject || "").toString().trim();
    const message = (body.body || "").toString();
    const mode = (body.mode || "all").toString();
    const userIds = Array.isArray(body.user_ids) ? body.user_ids.filter(Boolean) : [];

    if (!subject || !message.trim()) {
      return Response.json({ error: 'subject and body are required' }, { status: 400 });
    }

    const allUsers = await base44.asServiceRole.entities.User.list("-created_date", 1000);
    let recipients = allUsers.filter(u => u.email);
    if (mode === "selected") {
      const idSet = new Set(userIds);
      recipients = recipients.filter(u => idSet.has(u.id));
    }

    const safeMessage = message
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .split('\n')
      .map(p => `<p style="font-size:15px;line-height:1.6;color:#d4d4d4;margin:0 0 14px;">${linkify(p) || '&nbsp;'}</p>`)
      .join('');

    const inner = `${safeMessage}
<p style="margin-top:28px;padding-top:16px;border-top:1px solid #2a2a2a;font-size:12px;color:#888;">— DKO Wrestling Team</p>`;

    const html = buildEmailTemplate(inner, { preHeader: subject });

    let sent = 0;
    let failed = 0;
    for (const u of recipients) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({ to: u.email, subject, body: html, from_name: "DKO Wrestling" });
        sent++;
      } catch {
        failed++;
      }
    }
    return Response.json({ sent, failed, total: recipients.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}