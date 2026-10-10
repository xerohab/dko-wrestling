import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  LIVE_ENABLED,
  getPartnerStatus,
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
    // No server-side unlink endpoint was discoverable on the Linux API (all
    // candidates returned 404). The user disconnects locally; server-side
    // cleanup is completed by the user on Perk Sphere, or once Linux exposes an
    // unlink endpoint. The local record is marked unlinked so the user is
    // disconnected. serverConfirmed is false until an endpoint exists.
    await base44.entities.PerkSphereLink.update(link.id, {
      status: "unlinked",
      unlinked_at: new Date().toISOString(),
    });
    return Response.json({ ok: true, unlinked: true, serverConfirmed: false });
  } catch (error) {
    return Response.json({ ok: false, code: "error", message: "Unlinking failed." }, { status: 500 });
  }
}