import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  LIVE_ENABLED,
  getPartnerStatus,
  perkSphereRequest,
  PERKSPHERE_PARTNER_UUID,
} from "../../shared/perkSphereClient.ts";

// Confirms a Perk Sphere link after the user returns from the Perk Sphere consent
// flow. The account is NOT considered linked until Linux confirms the association.
// A user cannot confirm a challenge that belongs to another DKO account.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ ok: false, code: "unauthorized", message: "Sign in required." }, { status: 401 });
    }

    let body = {};
    try { body = await req.json(); } catch (_e) {}
    const challengeId = body.challenge_id;
    const perksphereUserId = body.perksphere_user_id;
    if (!challengeId) {
      return Response.json({ ok: false, code: "bad_request", message: "Missing challenge_id." }, { status: 400 });
    }

    // Find the pending link by challenge_id, then enforce it belongs to THIS user.
    const foundRes = await base44.entities.PerkSphereLink.filter(
      { challenge_id: challengeId, status: "pending" },
      { limit: 10 }
    );
    const foundItems = Array.isArray(foundRes) ? foundRes : (foundRes.items || []);
    const link = foundItems[0];
    if (!link) {
      return Response.json({ ok: false, code: "not_found", message: "Linking session not found or expired." }, { status: 404 });
    }
    if (link.user_id !== user.id) {
      return Response.json({ ok: false, code: "forbidden", message: "This linking session belongs to another account." }, { status: 403 });
    }

    if (!LIVE_ENABLED) {
      return Response.json({
        ok: false,
        code: "setup_required",
        partnerStatus: getPartnerStatus(),
        message: "Perk Sphere account linking is not live yet.",
      }, { status: 503 });
    }

    // --- Live flow ---
    const res = await perkSphereRequest("POST", "/v1/partner-links/confirm", {
      partner_uuid: PERKSPHERE_PARTNER_UUID,
      challenge_id: challengeId,
      partner_user_id: user.id,
      perksphere_user_id: perksphereUserId,
    });
    if (!res.ok) {
      return Response.json({ ok: false, code: res.code, message: res.message }, { status: 502 });
    }

    // Linux confirmed the association — mark linked.
    const psUserId = res.data?.perksphere_user_id || perksphereUserId;
    await base44.entities.PerkSphereLink.update(link.id, {
      status: "linked",
      perksphere_user_id: psUserId,
      linked_at: new Date().toISOString(),
    });
    return Response.json({ ok: true, linked: true, perksphere_user_id: psUserId });
  } catch (error) {
    return Response.json({ ok: false, code: "error", message: "Linking confirmation failed." }, { status: 500 });
  }
}