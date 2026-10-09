import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  loadCredentials,
  runProofOfPossession,
  EXPECTED_KEY_ID,
  PERKSPHERE_PARTNER_NAME,
} from "../../shared/perkSphereClient.ts";

// Controlled proof-of-possession test (admin only). Completes one real Linux
// challenge + confirmation using the configured credentials, and returns a SAFE
// report only. Does not create, rotate, revoke credentials or activate the partner.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ ok: false, code: "unauthorized", message: "Sign in required." }, { status: 401 });
    }
    if (user.role !== "admin") {
      return Response.json({ ok: false, code: "forbidden", message: "Admin only." }, { status: 403 });
    }

    let creds;
    try {
      creds = loadCredentials();
    } catch (e) {
      return Response.json({ ok: false, code: e.code, message: e.message }, { status: 503 });
    }

    // Only run the live test if the configured key ID matches this project.
    if (creds.keyId !== EXPECTED_KEY_ID) {
      return Response.json({
        ok: false,
        code: "key_id_mismatch",
        project: PERKSPHERE_PARTNER_NAME,
        expectedKeyId: EXPECTED_KEY_ID,
        message: "Configured key ID does not match this project. Live proof test aborted.",
      }, { status: 409 });
    }

    const report = await runProofOfPossession(creds);
    return Response.json({
      ok: report.ok,
      project: PERKSPHERE_PARTNER_NAME,
      keyId: creds.keyId,
      ...report,
    }, { status: report.ok ? 200 : 502 });
  } catch (error) {
    return Response.json({ ok: false, code: "error", message: "Proof-of-possession failed." }, { status: 500 });
  }
}