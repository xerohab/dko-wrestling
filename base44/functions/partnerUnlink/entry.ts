import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  LIVE_ENABLED,
  getPartnerStatus,
  perkSphereRequest,
  PERKSPHERE_PARTNER_UUID,
} from "../../shared/perkSphereClient.ts";

// Unlinks the signed-in DKO user's Perk Sphere account. The account is NOT
// considered unlinked until Linux confirms the unlink.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ ok: false, code: "unauthorized", message: "Sign in required." }, { status: 401 });
    }

    // Only the user's own linked record (RLS also enforces this).
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
    const res = await perkSphereRequest("POST", "/v1/partner-links/unlink", {
      partner_uuid: PERKSPHERE_PARTNER_UUID,
      partner_user_id: user.id,
      perksphere_user_id: link.perksphere_user_id,
    });
    if (!res.ok) {
      return Response.json({ ok: false, code: res.code, message: res.message }, { status: 502 });
    }

    // Linux confirmed the unlink.
    await base44.entities.PerkSphereLink.update(link.id, {
      status: "unlinked",
      unlinked_at: new Date().toISOString(),
    });
    return Response.json({ ok: true, unlinked: true });
  } catch (error) {
    return Response.json({ ok: false, code: "error", message: "Unlinking failed." }, { status: 500 });
  }
}