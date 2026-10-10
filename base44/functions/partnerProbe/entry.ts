import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  loadCredentials, signRequest, PERKSPHERE_API_BASE,
  EXPECTED_KEY_ID, PERKSPHERE_PARTNER_NAME, PERKSPHERE_PARTNER_UUID,
} from "../../shared/perkSphereClient.ts";

// Admin-only signed probe. Verifies the corrected Linux contract by sending
// correctly-signed (and one deliberately-invalid) requests and recording safe
// status/error info. Never returns secrets or signatures.
async function signedProbe(method, path, bodyObj, creds, opts = {}) {
  const rawBody = bodyObj == null ? "" : JSON.stringify(bodyObj);
  const headers = await signRequest(method, path, rawBody, creds);
  if (opts.invalidSig) headers["X-PS-Signature"] = "0".repeat(64);
  const res = await fetch(`${PERKSPHERE_API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: rawBody,
    signal: AbortSignal.timeout(10000),
  });
  let json = null;
  try { json = await res.json(); } catch (_e) {}
  return {
    status: res.status,
    ok: json?.ok === true,
    errorCode: json?.error?.code || null,
    message: json?.error?.message || null,
    fields: json?.error?.fields || null,
  };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, code: "unauthorized", message: "Sign in required." }, { status: 401 });
    if (user.role !== "admin") return Response.json({ ok: false, code: "forbidden", message: "Admin only." }, { status: 403 });

    let creds;
    try { creds = loadCredentials(); } catch (e) { return Response.json({ ok: false, code: e.code, message: e.message }, { status: 503 }); }
    if (creds.keyId !== EXPECTED_KEY_ID) return Response.json({ ok: false, code: "key_id_mismatch", message: "Key ID mismatch." }, { status: 409 });

    const results = {};
    const probeRef = "probe-dko";

    // Link challenge endpoint — requires Perk Sphere SERVICE auth. Probed with
    // partner HMAC to document that it is not partner-callable.
    try { results.pl_challenges = await signedProbe("POST", "/v1/partner-links/challenges", { partner_uuid: PERKSPHERE_PARTNER_UUID, user_reference: probeRef }, creds); }
    catch (_e) { results.pl_challenges = { status: 0, errorCode: "fetch_error", message: "Request failed." }; }

    // Link confirm — partner HMAC. Corrected body: { challenge, partner_account_reference }.
    try { results.pl_confirm = await signedProbe("POST", "/v1/partner-links/confirm", { challenge: "probe-challenge", partner_account_reference: probeRef }, creds); }
    catch (_e) { results.pl_confirm = { status: 0, errorCode: "fetch_error", message: "Request failed." }; }

    // Unlink — requires Perk Sphere SERVICE auth. Probed with partner HMAC to
    // document that it is not partner-callable.
    try { results.pl_unlink = await signedProbe("POST", "/partners/account-link/unlink", { partner_uuid: PERKSPHERE_PARTNER_UUID, user_reference: probeRef }, creds); }
    catch (_e) { results.pl_unlink = { status: 0, errorCode: "fetch_error", message: "Request failed." }; }

    // Events endpoint — valid signature, corrected contract payload.
    const testEvent = {
      event_type: "stream_watch_progress",
      partner_event_id: `probe-evt-${Date.now()}`,
      partner_account_reference: probeRef,
      occurred_at: new Date().toISOString(),
      evidence: { stream_id: "probe-stream", viewer_session_id: "probe-session", eligible_seconds: 30 },
    };
    try { results.events_valid_sig = await signedProbe("POST", "/v1/partners/events", testEvent, creds); }
    catch (_e) { results.events_valid_sig = { status: 0, errorCode: "fetch_error", message: "Request failed." }; }

    // Events endpoint — deliberately invalid signature (verify signing enforcement).
    try { results.events_invalid_sig = await signedProbe("POST", "/v1/partners/events", testEvent, creds, { invalidSig: true }); }
    catch (_e) { results.events_invalid_sig = { status: 0, errorCode: "fetch_error", message: "Request failed." }; }

    return Response.json({ ok: true, project: PERKSPHERE_PARTNER_NAME, keyId: creds.keyId, results });
  } catch (error) {
    return Response.json({ ok: false, code: "error", message: "Probe failed." }, { status: 500 });
  }
}