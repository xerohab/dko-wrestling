import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  LIVE_ENABLED,
  getPartnerStatus,
  perkSphereRequest,
} from "../../shared/perkSphereClient.ts";

// Exact lowercase Linux event types the DKO Wrestling partner is authorised to
// submit. Unsupported event types are rejected.
const ALLOWED_EVENT_TYPES = ["stream_watch_progress", "stream_ended", "registration_completed"];

// Validates evidence against the strict per-type Linux contract.
function validateEvidence(eventType, ev) {
  if (!ev || typeof ev !== "object" || Array.isArray(ev)) {
    return "Evidence object is required.";
  }
  if (eventType === "stream_watch_progress") {
    if (typeof ev.stream_id !== "string" || !ev.stream_id) return "evidence.stream_id is required.";
    if (typeof ev.viewer_session_id !== "string" || !ev.viewer_session_id) return "evidence.viewer_session_id is required.";
    const s = Number(ev.eligible_seconds);
    if (!Number.isInteger(s) || s < 0 || s > 86400) return "evidence.eligible_seconds must be an integer from 0 to 86400.";
    return null;
  }
  if (eventType === "stream_ended") {
    if (typeof ev.stream_id !== "string" || !ev.stream_id) return "evidence.stream_id is required.";
    if (typeof ev.ended_at !== "string" || !ev.ended_at) return "evidence.ended_at (UTC ISO-8601) is required.";
    return null;
  }
  // registration_completed
  if (typeof ev.registration_reference !== "string" || !ev.registration_reference) {
    return "evidence.registration_reference is required.";
  }
  return null;
}

// Builds evidence with EXACTLY the permitted fields for the event type.
function buildEvidence(eventType, ev) {
  if (eventType === "stream_watch_progress") {
    return {
      stream_id: ev.stream_id,
      viewer_session_id: ev.viewer_session_id,
      eligible_seconds: Number(ev.eligible_seconds),
    };
  }
  if (eventType === "stream_ended") {
    return { stream_id: ev.stream_id, ended_at: ev.ended_at };
  }
  return { registration_reference: ev.registration_reference };
}

// Submits a reward-eligible activity event to Perk Sphere for the signed-in,
// linked DKO user. Enforces idempotency (stable partner_event_id), user-scoping,
// and the strict Linux event payload contract. DKO never awards Points/XP —
// Linux is the sole reward authority. Submission is disabled (LIVE_ENABLED =
// false) until the partner is activated.
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
    // partner_event_id is the Linux dedup key; accept event_id as a legacy alias.
    const partnerEventId = body.partner_event_id || body.event_id;
    const evidence = body.evidence;

    if (!eventType || !ALLOWED_EVENT_TYPES.includes(eventType)) {
      return Response.json({ ok: false, code: "bad_request", message: "Unsupported event type." }, { status: 400 });
    }
    if (!partnerEventId) {
      return Response.json({ ok: false, code: "bad_request", message: "A stable partner_event_id is required for deduplication." }, { status: 400 });
    }
    const evErr = validateEvidence(eventType, evidence);
    if (evErr) {
      return Response.json({ ok: false, code: "bad_request", message: evErr }, { status: 400 });
    }

    // Deduplication (idempotency): reject a replayed partner_event_id for this
    // user before any submission. A duplicate can never produce duplicate rewards.
    const dupRes = await base44.entities.PerkSphereEvent.filter(
      { user_id: user.id, event_id: partnerEventId },
      { limit: 1 }
    );
    const dupItems = Array.isArray(dupRes) ? dupRes : (dupRes.items || []);
    if (dupItems[0]) {
      return Response.json({ ok: false, code: "duplicate", message: "This event has already been submitted." }, { status: 409 });
    }

    // Must have a Linux-confirmed link.
    const linkRes = await base44.entities.PerkSphereLink.filter(
      { user_id: user.id, status: "linked" },
      { limit: 1 }
    );
    const linkItems = Array.isArray(linkRes) ? linkRes : (linkRes.items || []);
    if (!linkItems[0]) {
      return Response.json({ ok: false, code: "not_linked", message: "Connect your Perk Sphere account first." }, { status: 409 });
    }

    // Submission is disabled until the partner is activated. Do not record a
    // pending event (so a later live submission is not blocked by dedup).
    if (!LIVE_ENABLED) {
      return Response.json({
        ok: false,
        code: "setup_required",
        partnerStatus: getPartnerStatus(),
        message: "Event submission is disabled until the Perk Sphere partner is activated.",
      }, { status: 503 });
    }

    // --- Live flow ---
    const occurredAt = new Date().toISOString(); // UTC ISO-8601, within the 24h window
    const cleanEvidence = buildEvidence(eventType, evidence);

    const created = await base44.entities.PerkSphereEvent.create({
      user_id: user.id,
      user_email: user.email,
      event_id: partnerEventId,
      event_type: eventType,
      source: "internal",
      status: "pending",
    });

    // Linux event validator permits ONLY these top-level fields. DKO never sends
    // event_id, points, xp, reward_eligible or other unsupported fields, and never
    // awards Points/XP. partner_account_reference is the authenticated DKO user —
    // never a browser-supplied identity.
    const payload = {
      event_type: eventType,
      partner_event_id: partnerEventId,
      partner_account_reference: user.id,
      occurred_at,
      evidence: cleanEvidence,
    };
    if (typeof body.task_reference === "string" && body.task_reference) payload.task_reference = body.task_reference;
    if (typeof body.resource_reference === "string" && body.resource_reference) payload.resource_reference = body.resource_reference;

    const res = await perkSphereRequest("POST", "/v1/partners/events", payload);

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