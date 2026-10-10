import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  loadCredentials, signRequest, PERKSPHERE_API_BASE,
  EXPECTED_KEY_ID, PERKSPHERE_PARTNER_NAME,
} from "../../shared/perkSphereClient.ts";

// Admin-only signed probe. Discovers real Linux endpoint paths/schemas by
// sending correctly-signed (and one deliberately-invalid) requests and
// recording the safe status/error info. Never returns secrets or signatures.
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
    const probeUser = { partner_user_id: "probe-dko", partner_user_email: "probe@dkowrestling.co.uk" };

    // Unlink candidates under /v1/partner-links/* + DELETE on root.
    const linkCandidates = [
      { label: "pl_unlink", method: "POST", path: "/v1/partner-links/unlink", body: probeUser },
      { label: "pl_remove", method: "POST", path: "/v1/partner-links/remove", body: probeUser },
      { label: "pl_revoke", method: "POST", path: "/v1/partner-links/revoke", body: probeUser },
      { label: "pl_delete", method: "POST", path: "/v1/partner-links/delete", body: probeUser },
      { label: "pl_root_delete", method: "DELETE", path: "/v1/partner-links", body: probeUser },
      { label: "pl_confirm_post", method: "POST", path: "/v1/partner-links/confirm", body: probeUser },
    ];
    for (const c of linkCandidates) {
      try { results[c.label] = await signedProbe(c.method, c.path, c.body, creds); }
      catch (_e) { results[c.label] = { status: 0, errorCode: "fetch_error", message: "Request failed." }; }
    }

    // Events endpoint — valid signature, minimal evidence payload (probe user, no reward fields).
    const testEvent = {
      partner_user_id: "probe-dko",
      event_type: "STREAM_VIEW_PROGRESS",
      event_id: `probe-evt-${Date.now()}`,
      source: "internal",
      evidence: { progress_seconds: 30 },
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