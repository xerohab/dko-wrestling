import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  LIVE_ENABLED,
  getPartnerStatus,
  perkSphereRequest,
  PERKSPHERE_PARTNER_UUID,
  PERKSPHERE_SITE_URL,
} from "../../shared/perkSphereClient.ts";

// Starts the Perk Sphere account-linking flow for the signed-in DKO user.
// Returns a consent URL the user is redirected to. Never fakes success.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ ok: false, code: "unauthorized", message: "Sign in required." }, { status: 401 });
    }

    // While the partner is not live, surface the correct pending status — do not
    // create a pending record that can never complete.
    if (!LIVE_ENABLED) {
      return Response.json({
        ok: false,
        code: "setup_required",
        partnerStatus: getPartnerStatus(),
        message: "Perk Sphere account linking is not live yet. The DKO Wrestling partner is still completing verification.",
      }, { status: 503 });
    }

    // --- Live flow (active once contract + credentials + verification are complete) ---

    // 1. Invalidate any existing pending link for this user (prevents duplicate linking).
    const pendingRes = await base44.entities.PerkSphereLink.filter(
      { user_id: user.id, status: "pending" },
      { limit: 20 }
    );
    const pendingItems = Array.isArray(pendingRes) ? pendingRes : (pendingRes.items || []);
    for (const p of pendingItems) {
      await base44.entities.PerkSphereLink.update(p.id, { status: "unlinked", unlinked_at: new Date().toISOString() });
    }

    // 2. Create a local pending link record scoped to THIS user.
    const challengeId = crypto.randomUUID();
    await base44.entities.PerkSphereLink.create({
      user_id: user.id,
      user_email: user.email,
      status: "pending",
      challenge_id: challengeId,
    });

    // 3. Request a linking challenge from Perk Sphere (partner-HMAC signed).
    const res = await perkSphereRequest("POST", "/v1/partner-links/challenges", {
      partner_uuid: PERKSPHERE_PARTNER_UUID,
      partner_user_id: user.id,
      partner_user_email: user.email,
      return_url: `${PERKSPHERE_SITE_URL}/profile`,
      challenge_id: challengeId,
    });

    if (!res.ok) {
      return Response.json({ ok: false, code: res.code, message: res.message }, { status: 502 });
    }

    const consentUrl = res.data?.consent_url || res.data?.redirect_url;
    return Response.json({ ok: true, challengeId, consentUrl });
  } catch (error) {
    return Response.json({ ok: false, code: "error", message: "Linking could not start." }, { status: 500 });
  }
}