import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'editor') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const title = (body.title || "").toString().trim();
    const content = (body.content || "").toString().trim();
    const actionUrl = (body.action_url || "").toString().trim();
    const actionLabel = (body.action_label || "Read Now").toString().trim();

    if (!title || !content) {
      return Response.json({ error: 'title and content are required' }, { status: 400 });
    }

    const subs = await base44.asServiceRole.entities.UserSubscription.filter({ status: "active" });
    const userIds = [...new Set(subs.map(s => s.user_id).filter(Boolean))];

    let sent = 0;
    let failed = 0;
    for (const uid of userIds) {
      try {
        await base44.asServiceRole.integrations.Core.SendPushNotification({
          user_id: uid,
          title,
          content,
          action_label: actionLabel,
          action_url: actionUrl || undefined,
        });
        sent++;
      } catch {
        failed++;
      }
    }

    return Response.json({ sent, failed, total: userIds.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}