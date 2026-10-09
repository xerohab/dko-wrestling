// Perk Sphere partner integration — shared server-side client.
//
// SECURITY & HONESTY CONTRACT
// --------------------------
// The exact Perk Sphere "Linux" partner HMAC authentication contract (canonical
// signing string, header names, timestamp/nonce format) and the exact
// request/response schemas for partner-links and events are NOT publicly
// documented and were NOT present in this project. Per project policy we do NOT
// guess these. Until the real contract is supplied:
//   - signRequest() throws a structured "contract_unavailable" error,
//   - LIVE_ENABLED is false, so every wire call returns a safe "setup_required"
//     result and NEVER fabricates a successful link or reward.
// Flip LIVE_ENABLED to true ONLY after: the signing contract is implemented in
// signRequest(), both partner secrets are set, DNS/proof-of-possession
// verification is complete, and the partner is officially activated by Perk
// Sphere administrators.

import { secrets } from "base44:runtime";

export const PERKSPHERE_API_BASE = "https://api.perksphere.org";
export const PERKSPHERE_PARTNER_UUID = "0d5996bf-471c-49c0-a4df-39af4cfeddb7";
export const PERKSPHERE_PARTNER_NAME = "DKO Wrestling";
export const PERKSPHERE_SITE_URL = "https://dkowrestling.co.uk";

// Production live integration is DISABLED until the partner is verified & activated.
export const LIVE_ENABLED = false;

export class PerkSphereSetupError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PerkSphereSetupError";
    this.code = code; // "credentials_missing" | "contract_unavailable" | "setup_required"
  }
}

// The known current Linux partner status. Do not claim "active" until Linux says so.
export function getPartnerStatus() {
  return "setup_required";
}

export function loadCredentials() {
  let keyId;
  let hmacSecret;
  try {
    keyId = secrets.get("PERKSPHERE_PARTNER_KEY_ID");
    hmacSecret = secrets.get("PERKSPHERE_PARTNER_HMAC_SECRET");
  } catch (_e) {
    throw new PerkSphereSetupError("credentials_missing", "Perk Sphere partner credentials are not configured.");
  }
  if (!keyId || !hmacSecret) {
    throw new PerkSphereSetupError("credentials_missing", "Perk Sphere partner credentials are not configured.");
  }
  return { keyId, hmacSecret };
}

// Build the signed request headers for a Perk Sphere partner-authenticated call.
//
// NOT IMPLEMENTED BY DESIGN: the canonical signing string, header names and
// timestamp/nonce scheme are part of the unavailable Linux contract. Implement
// them here once the real spec is provided. Until then this throws, which
// guarantees no request is ever sent with a guessed signature.
export function signRequest(/* method, path, body, creds */) {
  throw new PerkSphereSetupError(
    "contract_unavailable",
    "Perk Sphere HMAC signing contract is not yet configured."
  );
}

// Centralised, safe outbound call. Never throws on setup problems — returns a
// structured { ok, code, message, data? } result so calling functions can surface
// a safe pending/setup status to the user without leaking secrets.
export async function perkSphereRequest(method, path, body) {
  if (!LIVE_ENABLED) {
    return { ok: false, code: "setup_required", message: "Perk Sphere integration is not yet live." };
  }
  try {
    const creds = loadCredentials();
    // Throws contract_unavailable until the real signing contract is implemented.
    signRequest(method, path, body, creds);
    // Real signed fetch (using the headers from signRequest) goes here once the
    // contract is implemented. Until then we do not send anything.
    return { ok: false, code: "contract_unavailable", message: "Perk Sphere wire contract is not yet implemented." };
  } catch (e) {
    if (e instanceof PerkSphereSetupError) {
      return { ok: false, code: e.code, message: e.message };
    }
    return { ok: false, code: "error", message: "Perk Sphere request failed." };
  }
}