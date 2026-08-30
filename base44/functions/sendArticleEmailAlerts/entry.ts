import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { buildEmailTemplate } from '../../shared/emailTemplate.ts';

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
    const inner = `
<p style="font-family:Oswald,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#e8b923;margin:0 0 12px;">Breaking News</p>
<h1 style="font-family:Oswald,sans-serif;font-size:28px;font-weight:700;color:#fff;text-transform:uppercase;line-height:1.2;margin:0 0 18px;">${article.title}</h1>
${article.featured_image ? `<img src="${article.featured_image}" alt="" style="width:100%;border-radius:10px;margin:0 0 20px;display:block;" />` : ""}
${article.excerpt ? `<p style="font-size:16px;line-height:1.6;color:#b5b5b5;margin:0 0 24px;">${article.excerpt}</p>` : ""}
<a href="${link}" style="display:inline-block;background:#cc0000;color:#fff;font-family:Oswald,sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:1px;font-size:14px;padding:14px 28px;border-radius:8px;text-decoration:none;">Read Full Article &rarr;</a>
<p style="margin-top:32px;padding-top:16px;border-top:1px solid #2a2a2a;font-size:12px;color:#888;">You're receiving this because you opted in to new article alerts. <a href="${prefLink}" style="color:#e8b923;text-decoration:underline;">Manage preferences</a>.</p>`;

    const html = buildEmailTemplate(inner, { siteUrl, preHeader: article.title });

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