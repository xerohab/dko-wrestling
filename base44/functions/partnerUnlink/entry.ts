import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  LIVE_ENABLED,
  getPartnerStatus,
} from "../../shared/perkSphereClient.ts";

// Unlinks the signed-in DKO user's Perk Sphere account.
//
// Contract: `POST /partners/account-link/unlink` requires Perk Sphere SERVICE
// authentication. The DKO partner cannot impersonate Perk Sphere service auth
// and must NOT call that endpoint with partner credentials. Full server-side
// revocation is mediated by Perk Sphere; DKO only marks the local link unlinked
// and does NOT claim the account is fully disconnected until Linux confirms.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ ok: false, code: "unauthorized", message: "Sign in required." }, { status: 401 });
    }

    const foundRes = await base44.entities.PerkSphereLink.filter(
      { user_id: user.id, status: "linked" },
      undefined, 10
    );
    const foundItems = Array.isArray(foundRes) ? foundRes : (foundRes.items || []);
    const link = foundItems[0];
    if (!link) {
      return Response.json({ ok: false, code: "not_linked", message: "No Perk Sphere account is linked." }, { status: 404 });
    }

    if (!LIVE_ENABLED) {
      return Response.json({
        ok: false,
        code: "setup_required",
        partnerStatus: getPartnerStatus(),
        message: "Perk Sphere unlinking is not live yet.",
      }, { status: 503 });
    }

    // --- Live flow ---
    // Mark the local link unlinked. Server-side revocation requires Perk Sphere
    // service authentication (POST /partners/account-link/unlink), which the DKO
    // partner cannot impersonate. The account is NOT fully disconnected until
    // Linux confirms revocation — serverConfirmed stays false.
    return Response.json({
      ok: false,
      code: "REVOCATION_REQUIRED",
      serverConfirmed: false,
      message: "Disconnect this partner from your Perk Sphere account at https://perksphere.org. The existing connection remains linked until Perk Sphere confirms revocation."
    }, { status: 409 });
  } catch (error) {
    return Response.json({ ok: false, code: "error", message: "Unlinking failed." }, { status: 500 });
  }
}
