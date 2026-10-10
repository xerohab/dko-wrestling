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
      { limit: 10 }
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
    await base44.entities.PerkSphereLink.update(link.id, {
      status: "unlinked",
      unlinked_at: new Date().toISOString(),
    });
    return Response.json({
      ok: true,
      unlinked: true,
      serverConfirmed: false,
      message: "Disconnected locally. Server-side revocation is mediated by Perk Sphere and is not confirmed until Linux confirms.",
    });
  } catch (error) {
    return Response.json({ ok: false, code: "error", message: "Unlinking failed." }, { status: 500 });
  }
}