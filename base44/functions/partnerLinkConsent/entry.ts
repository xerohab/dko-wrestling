import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  LIVE_ENABLED,
  getPartnerStatus,
} from "../../shared/perkSphereClient.ts";

// Starts the Perk Sphere account-linking flow for the signed-in DKO user.
//
// Contract: `POST /v1/partner-links/challenges` requires Perk Sphere SERVICE
// authentication, which the DKO partner cannot impersonate. The challenge is
// issued by Perk Sphere's backend for its logged-in user; the user returns to
// DKO with the challenge and partnerLinkConfirm calls
// `POST /v1/partner-links/confirm` (partner HMAC).
//
// The exact Perk Sphere frontend linking URL and challenge handoff are NOT
// confirmed. This function reports that as a blocker rather than inventing a
// redirect URL or calling the service-authenticated endpoint. Never fakes success.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ ok: false, code: "unauthorized", message: "Sign in required." }, { status: 401 });
    }

    if (!LIVE_ENABLED) {
      return Response.json({
        ok: false,
        code: "setup_required",
        partnerStatus: getPartnerStatus(),
        message: "Perk Sphere account linking is not live yet. The DKO Wrestling partner is still completing verification.",
      }, { status: 503 });
    }

    // --- Live flow ---
    // BLOCKER: the Perk Sphere frontend linking destination and challenge handoff
    // are not confirmed. DKO cannot call /v1/partner-links/challenges (requires
    // Perk Sphere service authentication). Do not invent a URL.
    return Response.json({
      ok: false,
      code: "consent_url_unavailable",
      partnerStatus: getPartnerStatus(),
      message: "The Perk Sphere linking redirect is not configured. The challenge is issued by Perk Sphere and confirmed via partnerLinkConfirm once the handoff URL is confirmed.",
      blocker: "Perk Sphere frontend linking URL / challenge handoff not confirmed.",
    }, { status: 503 });
  } catch (error) {
    return Response.json({ ok: false, code: "error", message: "Linking could not start." }, { status: 500 });
  }
}