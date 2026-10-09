import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  LIVE_ENABLED,
  getPartnerStatus,
  perkSphereRequest,
  PERKSPHERE_PARTNER_UUID,
} from "../../shared/perkSphereClient.ts";

// Provisional permitted event types — MUST be confirmed against the actual Linux
// partner configuration before live submission is enabled.
const ALLOWED_EVENT_TYPES = [
  "account_registered",
  "video_watch_progress",
  "livestream_watch_progress",
  "livestream_ended",
  "purchase_completed",
];

// Submits a reward-eligible activity event to Perk Sphere for the signed-in,
// linked DKO user. Enforces deduplication (stable event_id), user-scoping, and
// the YouTube rule (always 0 points / 0 XP). Perk Sphere remains the reward
// authority; DKO never awards points or XP locally. Reward-bearing submission is
// disabled (LIVE_ENABLED = false) until the partner is verified and activated.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ ok: false, code: "unauthorized", message: "Sign in required." }, { status: 401 });
    }

    let body = {};
    try { body = await req.json(); } catch (_e) {}
    const eventType = body.event_type;
    const eventId = body.event_id;
    const source = body.source || "internal";
    if (!eventType || !ALLOWED_EVENT_TYPES.includes(eventType)) {
      return Response.json({ ok: false, code: "bad_request", message: "Unsupported event type." }, { status: 400 });
    }
    if (!eventId) {
      return Response.json({ ok: false, code: "bad_request", message: "A stable event_id is required for deduplication." }, { status: 400 });
    }

    // Must have a Linux-confirmed link.
    const linkRes = await base44.entities.PerkSphereLink.filter(
      { user_id: user.id, status: "linked" },
      { limit: 1 }
    );
    const linkItems = Array.isArray(linkRes) ? linkRes : (linkRes.items || []);
    const link = linkItems[0];
    if (!link) {
      return Response.json({ ok: false, code: "not_linked", message: "Connect your Perk Sphere account first." }, { status: 409 });
    }

    // Deduplication: reject a replayed/duplicate event_id for this user.
    const dupRes = await base44.entities.PerkSphereEvent.filter(
      { user_id: user.id, event_id: eventId },
      { limit: 1 }
    );
    const dupItems = Array.isArray(dupRes) ? dupRes : (dupRes.items || []);
    if (dupItems[0]) {
      return Response.json({ ok: false, code: "duplicate", message: "This event has already been submitted." }, { status: 409 });
    }

    // Reward-bearing submission is disabled until verified. Do not record a
    // pending event (so a later, live submission is not blocked by dedup).
    if (!LIVE_ENABLED) {
      return Response.json({
        ok: false,
        code: "setup_required",
        partnerStatus: getPartnerStatus(),
        message: "Reward-bearing event submission is disabled until the Perk Sphere partner is verified and activated.",
      }, { status: 503 });
    }

    // --- Live flow ---
    // YouTube sources never earn points or XP, regardless of watch duration.
    const isYoutube = source === "youtube" || body.video_source === "youtube";

    const created = await base44.entities.PerkSphereEvent.create({
      user_id: user.id,
      user_email: user.email,
      event_id: eventId,
      event_type: eventType,
      source,
      status: "pending",
    });

    const res = await perkSphereRequest("POST", "/v1/partner/events", {
      partner_uuid: PERKSPHERE_PARTNER_UUID,
      partner_user_id: user.id,
      perksphere_user_id: link.perksphere_user_id,
      event: {
        event_id: eventId,
        event_type: eventType,
        source,
        points: isYoutube ? 0 : (body.points ?? 0),
        xp: isYoutube ? 0 : (body.xp ?? 0),
        occurred_at: new Date().toISOString(),
        payload: body.payload || {},
      },
    });

    if (!res.ok) {
      await base44.entities.PerkSphereEvent.update(created.id, { status: "rejected", result: res.code });
      return Response.json({ ok: false, code: res.code, message: res.message }, { status: 502 });
    }

    await base44.entities.PerkSphereEvent.update(created.id, {
      status: "submitted",
      submitted_at: new Date().toISOString(),
      result: "ok",
    });
    return Response.json({ ok: true, submitted: true });
  } catch (error) {
    return Response.json({ ok: false, code: "error", message: "Event submission failed." }, { status: 500 });
  }
}