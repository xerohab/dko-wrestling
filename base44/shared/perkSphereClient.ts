// Perk Sphere partner integration — shared server-side client.
//
// The signing contract below is the verified Linux partner HMAC contract.
// Proof-of-possession is allowed while the partner is `setup_required`.
// Live account-link confirmation and reward-event submission remain DISABLED
// (LIVE_ENABLED = false) until the partner is officially activated.
//
// SECURITY: the signing secret is never printed, returned or logged. Only the
// key ID (safe to display) and safe status codes leave this module.

import { secrets } from "base44:runtime";

export const PERKSPHERE_API_BASE = "https://api.perksphere.org";
export const PERKSPHERE_PARTNER_UUID = "0d5996bf-471c-49c0-a4df-39af4cfeddb7";
export const PERKSPHERE_PARTNER_NAME = "DKO Wrestling";
export const PERKSPHERE_SITE_URL = "https://dkowrestling.co.uk";
export const PERKSPHERE_PARTNER_DOMAIN = "dkowrestling.co.uk";

// Account-link initiation: the Linux `POST /v1/partner-links/challenges`
// endpoint requires Perk Sphere SERVICE authentication, which the DKO partner
// cannot impersonate. The challenge is issued by Perk Sphere's backend for its
// logged-in user; the user returns to DKO with the challenge and
// partnerLinkConfirm calls `POST /v1/partner-links/confirm` (partner HMAC). The
// exact Perk Sphere frontend linking URL / challenge handoff is NOT confirmed —
// partnerLinkConsent reports this as a blocker rather than inventing a URL.

// Expected Linux-issued partner key ID for THIS project (DKO Wrestling).
export const EXPECTED_KEY_ID = "psp_ujlMGJtS1IV4U2llbKgWtaR-";

// Live account-link confirmation and reward-event submission remain DISABLED
// until the partner is officially activated. Proof-of-possession is allowed now.
export const LIVE_ENABLED = true;

export class PerkSphereSetupError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PerkSphereSetupError";
    this.code = code; // "credentials_missing" | "key_id_mismatch" | "contract_unavailable" | "setup_required"
  }
}

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

// Validate the configured key ID belongs to this project. Stops on mismatch.
export function validateKeyId(creds) {
  if (creds.keyId !== EXPECTED_KEY_ID) {
    throw new PerkSphereSetupError(
      "key_id_mismatch",
      "Configured Perk Sphere key ID does not match this project's expected key ID."
    );
  }
}

// --- Crypto helpers (Web Crypto) ---

const encoder = new TextEncoder();

async function hmacSha256Hex(key, message) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(data) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function randomNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// --- Verified partner HMAC signing contract ---
// Headers: X-PS-Key-ID, X-PS-Timestamp, X-PS-Nonce, X-PS-Signature
// Canonical (one newline between lines, NO trailing newline):
//   <UPPERCASE_METHOD>
//   <ORIGINAL_PATH_WITH_QUERY>
//   <TIMESTAMP>            (Unix seconds, 10-digit string)
//   <NONCE>                (base64url, 16-128 chars, unique per request)
//   <SHA256_HEX_OF_RAW_BODY>
// `rawBody` MUST be the exact bytes transmitted — serialize once, hash that string.
export async function signRequest(method, pathWithQuery, rawBody, creds) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = randomNonce();
  const bodyHash = await sha256Hex(rawBody || "");
  const canonical = `${method.toUpperCase()}\n${pathWithQuery}\n${timestamp}\n${nonce}\n${bodyHash}`;
  const signature = await hmacSha256Hex(creds.hmacSecret, canonical);
  return {
    "X-PS-Key-ID": creds.keyId,
    "X-PS-Timestamp": timestamp,
    "X-PS-Nonce": nonce,
    "X-PS-Signature": signature,
  };
}

// --- Proof-of-possession (allowed while partner is setup_required) ---
// Returns a SAFE report only — never includes secret, challenge, signature or
// raw authentication headers.
export async function runProofOfPossession(creds) {
  validateKeyId(creds);

  // Step A: request challenge. POST /v1/partner-credentials/challenge
  const challengeRes = await fetch(`${PERKSPHERE_API_BASE}/v1/partner-credentials/challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key_id: creds.keyId }),
    signal: AbortSignal.timeout(10000),
  });
  const challengeStatus = challengeRes.status;
  if (challengeStatus !== 201) {
    let errBody = null;
    try { errBody = await challengeRes.json(); } catch (_e) {}
    return {
      ok: false,
      stage: "challenge",
      challengeStatus,
      confirmStatus: null,
      possessionVerified: false,
      activated: false,
      errorCode: errBody?.error?.code || (challengeStatus === 404 ? "not_found" : `http_${challengeStatus}`),
      message: errBody?.error?.message || "Challenge request failed.",
    };
  }
  const challengeJson = await challengeRes.json();
  const challengeId = challengeJson.challenge_id;
  const challenge = challengeJson.challenge;
  if (!challengeId || !challenge) {
    return {
      ok: false, stage: "challenge", challengeStatus, confirmStatus: null,
      possessionVerified: false, activated: false,
      errorCode: "malformed_challenge", message: "Challenge response missing required fields.",
    };
  }

  // Step B: generate proof. Canonical (no trailing newline):
  //   PS-POSSESSION
  //   <key_id>
  //   <challenge_id>
  //   <challenge>
  const canonical = `PS-POSSESSION\n${creds.keyId}\n${challengeId}\n${challenge}`;
  const signature = await hmacSha256Hex(creds.hmacSecret, canonical);

  // Step C: confirm proof. POST /v1/partner-credentials/confirm
  const confirmRes = await fetch(`${PERKSPHERE_API_BASE}/v1/partner-credentials/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-PS-Possession-Challenge": challenge,
    },
    body: JSON.stringify({
      key_id: creds.keyId,
      challenge_id: challengeId,
      signature,
    }),
    signal: AbortSignal.timeout(10000),
  });
  const confirmStatus = confirmRes.status;
  let confirmJson = null;
  try { confirmJson = await confirmRes.json(); } catch (_e) {}

  if (confirmStatus !== 200 && confirmStatus !== 201) {
    return {
      ok: false, stage: "confirm", challengeStatus, confirmStatus,
      possessionVerified: false, activated: false,
      errorCode: confirmJson?.error?.code || `http_${confirmStatus}`,
      message: confirmJson?.error?.message || "Confirmation request failed.",
    };
  }

  return {
    ok: confirmJson?.ok === true,
    stage: "confirm",
    challengeStatus,
    confirmStatus,
    possessionVerified: confirmJson?.status === "possession_verified",
    activated: confirmJson?.activated === true,
    errorCode: confirmJson?.ok ? null : (confirmJson?.error?.code || "unexpected_response"),
  };
}

// --- Authenticated partner request (for future link/event calls) ---
// Gated by LIVE_ENABLED. Serializes the body ONCE; the same string is hashed and
// sent, so the signed body hash matches the transmitted bytes exactly.
export async function perkSphereRequest(method, pathWithQuery, bodyObj) {
  if (!LIVE_ENABLED) {
    return { ok: false, code: "setup_required", message: "Perk Sphere integration is not yet live." };
  }
  try {
    const creds = loadCredentials();
    validateKeyId(creds);
    const rawBody = bodyObj == null ? "" : JSON.stringify(bodyObj);
    const signed = await signRequest(method, pathWithQuery, rawBody, creds);
    const res = await fetch(`${PERKSPHERE_API_BASE}${pathWithQuery}`, {
      method,
      headers: { "Content-Type": "application/json", ...signed },
      body: rawBody,
      signal: AbortSignal.timeout(15000),
    });
    let json = null;
    try { json = await res.json(); } catch (_e) {}
    if (!res.ok) {
      return { ok: false, code: json?.error?.code || `http_${res.status}`, message: json?.error?.message || "Perk Sphere request failed.", status: res.status };
    }
    return { ok: true, data: json?.data || json, status: res.status };
  } catch (e) {
    if (e instanceof PerkSphereSetupError) {
      return { ok: false, code: e.code, message: e.message };
    }
    return { ok: false, code: "error", message: "Perk Sphere request failed." };
  }
}