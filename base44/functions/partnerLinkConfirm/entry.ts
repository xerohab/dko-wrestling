
import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

import {
  LIVE_ENABLED,
  getPartnerStatus,
  perkSphereRequest
} from "../../shared/perkSphereClient.ts";

/**
 * DKO Wrestling — Perk Sphere account-link confirmation
 *
 * Security:
 * - Requires an authenticated DKO Wrestling user.
 * - Never accepts the partner account ID from the browser.
 * - Uses partner-signed Linux API authentication.
 * - Linux validates the single-use challenge.
 * - Never stores the raw challenge token.
 * - Does not mark an account linked unless Linux confirms it.
 *
 * Linux endpoint:
 * POST /v1/partner-links/confirm
 *
 * Body:
 * {
 *   challenge,
 *   partner_account_reference: authenticated DKO user ID
 * }
 */

function jsonResponse(data, status = 200) {
  return Response.json(data, { status });
}

function getItems(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.items)) return result.items;
  return [];
}

export default async function (req) {
  try {
    // --------------------------------------------------
    // 1. Authenticate the DKO Wrestling user
    // --------------------------------------------------

    const base44 = createClientFromRequest(req);

    let user;

    try {
      user = await base44.auth.me();
    } catch (_error) {
      return jsonResponse({
        ok: false,
        code: "unauthorized",
        message: "Please sign in to DKO Wrestling."
      }, 401);
    }

    if (!user?.id) {
      return jsonResponse({
        ok: false,
        code: "unauthorized",
        message: "Please sign in to DKO Wrestling."
      }, 401);
    }

    // --------------------------------------------------
    // 2. Validate the challenge
    // --------------------------------------------------

    let body = {};

    try {
      body = await req.json();
    } catch (_error) {
      return jsonResponse({
        ok: false,
        code: "bad_request",
        message: "Invalid request."
      }, 400);
    }

    const challenge =
      typeof body?.challenge === "string"
        ? body.challenge.trim()
        : "";

    if (!challenge) {
      return jsonResponse({
        ok: false,
        code: "missing_challenge",
        message: "Please enter your Perk Sphere challenge token."
      }, 400);
    }

    // Linux currently issues a 43-character base64url
    // challenge. Validate its shape without logging it.
    if (!/^[A-Za-z0-9_-]{43}$/.test(challenge)) {
      return jsonResponse({
        ok: false,
        code: "invalid_challenge",
        message: "Invalid challenge format. Please generate a new challenge on Perk Sphere."
      }, 400);
    }

    // --------------------------------------------------
    // 3. Check whether this user is already linked
    // --------------------------------------------------

    const existingResult =
      await base44.entities.PerkSphereLink.filter(
        {
          user_id: user.id,
          status: "linked"
        },
        {
          limit: 1
        }
      );

    const existingLinks = getItems(existingResult);

    if (existingLinks.length > 0) {
      return jsonResponse({
        ok: true,
        linked: true,
        already: true,
        perksphere_user_id:
          existingLinks[0].perksphere_user_id || null,
        message: "Your DKO Wrestling account is already connected to Perk Sphere."
      });
    }

    // --------------------------------------------------
    // 4. Ensure the integration is enabled
    // --------------------------------------------------

    if (!LIVE_ENABLED) {
      return jsonResponse({
        ok: false,
        code: "setup_required",
        partnerStatus: getPartnerStatus(),
        message: "Perk Sphere account linking is not enabled."
      }, 503);
    }

    // --------------------------------------------------
    // 5. Confirm with the Linux API
    // --------------------------------------------------

    const result = await perkSphereRequest(
      "POST",
      "/v1/partner-links/confirm",
      {
        challenge,
        partner_account_reference: user.id
      }
    );

    if (!result.ok) {
      return jsonResponse({
        ok: false,
        code: result.code || "linux_confirmation_failed",
        message:
          result.message ||
          "Perk Sphere could not confirm this account link."
      }, 502);
    }

    const linuxData = result.data || {};

    // Linux must explicitly confirm success and return
    // the authoritative link identifier.
    if (
      linuxData.ok !== true ||
      typeof linuxData.link_uuid !== "string" ||
      !linuxData.link_uuid
    ) {
      return jsonResponse({
        ok: false,
        code: "unexpected_linux_response",
        message:
          "Perk Sphere returned an incomplete confirmation. Please contact support before retrying."
      }, 502);
    }

    // --------------------------------------------------
    // 6. Save the verified association in Base44
    // --------------------------------------------------

    // Linux returns link_uuid and status, but does not
    // currently guarantee perksphere_user_id in this response.
    const perkSphereUserId =
      typeof linuxData.perksphere_user_id === "string"
        ? linuxData.perksphere_user_id
        : null;

    const now = new Date().toISOString();

    // Do not store the raw challenge.
    //
    // The existing schema uses challenge_id. We store the
    // non-secret Linux link UUID in that field for now.
    // This assumes challenge_id accepts a string.
    try {
      await base44.asServiceRole.entities.PerkSphereLink.create({
        user_id: user.id,
        user_email: user.email || null,
        status: "linked",
        challenge_id: linuxData.link_uuid,
        perksphere_user_id: perkSphereUserId,
        linked_at: now
      });
    } catch (_error) {
      // Linux may already have consumed the challenge.
      // Do not claim the local record was created.
      return jsonResponse({
        ok: false,
        code: "local_sync_failed",
        linux_confirmed: true,
        message:
          "Linux confirmed your account link, but DKO Wrestling could not save the connection. Do not generate another challenge yet; the records need synchronising."
      }, 500);
    }

    // --------------------------------------------------
    // 7. Return successful confirmation
    // --------------------------------------------------

    return jsonResponse({
      ok: true,
      linked: true,
      link_uuid: linuxData.link_uuid,
      perksphere_user_id: perkSphereUserId,
      message:
        "Your DKO Wrestling account is now connected to Perk Sphere."
    });

  } catch (_error) {
    // Never return stack traces, HMAC credentials,
    // challenge tokens or internal exception details.
    return jsonResponse({
      ok: false,
      code: "confirmation_error",
      message:
        "Account linking could not be completed. Please try again or contact support."
    }, 500);
  }
}
