import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  LIVE_ENABLED,
  getPartnerStatus,
  perkSphereRequest,
} from "../../shared/perkSphereClient.ts";

// Confirms a Perk Sphere link using the challenge issued by Perk Sphere's
// backend. The account is NOT considered linked until Linux confirms.
//
// Contract: `POST /v1/partner-links/confirm` (partner HMAC) with exactly:
//   { challenge, partner_account_reference }
// partner_account_reference is the authenticated DKO Wrestling user id — never
// a browser-supplied identity.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ ok: false, code: "unauthorized", message: "Sign in required." }, { status: 401 });
    }

    let body = {};
    try { body = await req.json(); } catch (_e) {}
    const challenge = body.challenge;
    if (!challenge) {
      return Response.json({ ok: false, code: "bad_request", message: "Missing challenge." }, { status: 400 });
    }

    // Idempotent: if already linked, return the existing association.
    const existingRes = await base44.entities.PerkSphereLink.filter(
      { user_id: user.id, status: "linked" },
      { limit: 1 }
    );
    const existingItems = Array.isArray(existingRes) ? existingRes : (existingRes.items || []);
    if (existingItems[0]) {
      return Response.json({ ok: true, linked: true, already: true, perksphere_user_id: existingItems[0].perksphere_user_id || null });
    }

    if (!LIVE_ENABLED) {
      return Response.json({
        ok: false,
        code: "setup_required",
        partnerStatus: getPartnerStatus(),
        message: "Perk Sphere account linking is not live yet.",
      }, { status: 503 });
    }

    // --- Live flow: confirm the Perk Sphere-issued challenge (partner HMAC) ---
    const res = await perkSphereRequest("POST", "/v1/partner-links/confirm", {
      challenge,
      partner_account_reference: user.id,
    });
    if (!res.ok) {
      return Response.json({ ok: false, code: res.code, message: res.message }, { status: 502 });
    }

    // Linux confirmed the association — mark linked.
    const psUserId = res.data?.perksphere_user_id || null;
    await base44.entities.PerkSphereLink.create({
      user_id: user.id,
      user_email: user.email,
      status: "linked",
      challenge_id: challenge,
      perksphere_user_id: psUserId,
      linked_at: new Date().toISOString(),
    });
    return Response.json({ ok: true, linked: true, perksphere_user_id: psUserId });
  } catch (error) {
    return Response.json({ ok: false, code: "error", message: "Linking confirmation failed." }, { status: 500 });
  }
}