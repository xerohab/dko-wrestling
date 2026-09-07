import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'You must be logged in to redeem this link.' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const code = (body.code || "").toString().trim();
    if (!code) return Response.json({ error: 'Invalid link.' }, { status: 400 });

    // Look up the link (admin-only read, so use service role)
    const links = await base44.asServiceRole.entities.SubscriptionLink.filter({ code });
    const link = links[0];
    if (!link) return Response.json({ error: 'This invite link is invalid or no longer exists.' }, { status: 404 });
    if (!link.is_active) return Response.json({ error: 'This invite link has been deactivated.' }, { status: 400 });

    // Check expiry
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return Response.json({ error: 'This invite link has expired.' }, { status: 400 });
    }

    // Check usage limit
    if (link.max_uses > 0 && (link.used_count || 0) >= link.max_uses) {
      return Response.json({ error: 'This invite link has reached its maximum number of uses.' }, { status: 400 });
    }

    // Look up the plan
    const plan = await base44.asServiceRole.entities.SubscriptionPlan.get(link.plan_id);
    if (!plan) return Response.json({ error: 'The plan associated with this link no longer exists.' }, { status: 404 });

    // Cancel any existing active subscription for this user
    const existing = await base44.asServiceRole.entities.UserSubscription.filter({ user_email: user.email, status: 'active' });
    for (const sub of existing) {
      await base44.asServiceRole.entities.UserSubscription.update(sub.id, { status: 'cancelled', end_date: new Date().toISOString() });
    }

    // Grant the new subscription
    await base44.asServiceRole.entities.UserSubscription.create({
      user_email: user.email,
      user_id: user.id,
      plan_id: plan.id,
      plan_name: plan.name,
      status: 'active',
      start_date: new Date().toISOString(),
      end_date: plan.interval === 'one_time' ? null : undefined,
    });

    // Increment used_count
    await base44.asServiceRole.entities.SubscriptionLink.update(link.id, { used_count: (link.used_count || 0) + 1 });

    return Response.json({ success: true, plan_name: plan.name });
  } catch (error) {
    return Response.json({ error: error.message || 'Something went wrong.' }, { status: 500 });
  }
}