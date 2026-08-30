import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const articleId = (body.articleId || "").toString().trim();
    const force = !!body.force;
    if (!articleId) return Response.json({ error: 'articleId is required' }, { status: 400 });

    const articles = await base44.asServiceRole.entities.Article.filter({ id: articleId });
    const article = articles[0];
    if (!article) return Response.json({ error: 'Article not found' }, { status: 404 });
    if (article.status !== 'published') return Response.json({ error: 'Article is not published' }, { status: 400 });

    // Only send on a fresh publish (within 10 min) unless forced — avoids re-sending on re-publish.
    const publishedMs = article.published_date ? new Date(article.published_date).getTime() : 0;
    const isFresh = publishedMs && (Date.now() - publishedMs) < 10 * 60 * 1000;
    if (!isFresh && !force) {
      return Response.json({ sent: 0, skipped: true, message: 'Not a fresh publish' });
    }

    const users = await base44.asServiceRole.entities.User.list("-created_date", 1000);
    const optedIn = users.filter(u => u.notify_new_articles !== false && u.email);

    const siteUrl = (secrets.get("SITE_URL") || "").replace(/\/$/, "");
    const link = siteUrl ? `${siteUrl}/article/${article.slug}` : `/article/${article.slug}`;
    const prefLink = siteUrl ? `${siteUrl}/profile` : `/profile`;

    const subject = `📰 ${article.title}`;
    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0a;font-family:Inter,Arial,sans-serif;color:#eaeaea;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
<div style="text-align:center;margin-bottom:24px;"><span style="font-family:Oswald,sans-serif;font-weight:700;font-size:22px;letter-spacing:2px;color:#fff;">DKO WRESTLING</span></div>
<h1 style="font-family:Oswald,sans-serif;font-size:28px;font-weight:700;color:#fff;text-transform:uppercase;margin:0 0 16px;">${article.title}</h1>
${article.featured_image ? `<img src="${article.featured_image}" alt="" style="width:100%;border-radius:8px;margin:0 0 16px;" />` : ""}
${article.excerpt ? `<p style="font-size:16px;line-height:1.5;color:#b5b5b5;margin:0 0 20px;">${article.excerpt}</p>` : ""}
<a href="${link}" style="display:inline-block;background:#cc0000;color:#fff;font-family:Oswald,sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:1px;padding:12px 24px;border-radius:6px;text-decoration:none;">Read Full Article</a>
<p style="margin-top:32px;font-size:12px;color:#666;">You're receiving this because you opted in to new article alerts. <a href="${prefLink}" style="color:#888;">Manage preferences</a>.</p>
</div></body></html>`;

    let sent = 0;
    let failed = 0;
    for (const u of optedIn) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({ to: u.email, subject, body: html, from_name: "DKO Wrestling" });
        sent++;
      } catch {
        failed++;
      }
    }

    return Response.json({ sent, failed, total: optedIn.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}