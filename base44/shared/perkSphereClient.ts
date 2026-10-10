
import { secrets } from "base44:runtime";

/**
 * Perk Sphere — DKO Wrestling partner integration
 *
 * Server-side only.
 *
 * Linux is authoritative for:
 * - Partner authentication
 * - Account-link confirmation
 * - Reward event processing
 *
 * Base44 is responsible for authenticated DKO user identity
 * and displaying the connection status.
 *
 * Never import this module into frontend components.
 */

export const PERKSPHERE_API_BASE = "https://api.perksphere.org";

export const PERKSPHERE_PARTNER_UUID =
  "0d5996bf-471c-49c0-a4df-39af4cfeddb7";

export const PERKSPHERE_PARTNER_NAME = "DKO Wrestling";
export const PERKSPHERE_SITE_URL = "https://dkowrestling.co.uk";
export const PERKSPHERE_PARTNER_DOMAIN = "dkowrestling.co.uk";

export const EXPECTED_KEY_ID =
  "psp_ujlMGJtS1IV4U2llbKgWtaR-";

/**
 * DKO Wrestling has been activated on the Linux backend.
 *
 * This enables partner-signed account confirmation and
 * eligible reward-event submission.
 *
 * This does not itself prove the Base44 secrets match
 * the currently active Linux credential.
 */
export const LIVE_ENABLED = true;

export class PerkSphereSetupError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PerkSphereSetupError";
    this.code = code;
  }
}

export function getPartnerStatus() {
  return LIVE_ENABLED ? "active" : "setup_required";
}

/**
 * Load partner credentials from Base44 server-side secrets.
 * Never expose the secret to the browser or logs.
 */
export function loadCredentials() {
  let keyId;
  let hmacSecret;

  try {
    keyId = secrets.get("PERKSPHERE_PARTNER_KEY_ID");
    hmacSecret = secrets.get("PERKSPHERE_PARTNER_HMAC_SECRET");
  } catch (_error) {
    throw new PerkSphereSetupError(
      "credentials_missing",
      "Perk Sphere partner credentials are not configured."
    );
  }

  if (
    typeof keyId !== "string" ||
    !keyId ||
    typeof hmacSecret !== "string" ||
    !hmacSecret
  ) {
    throw new PerkSphereSetupError(
      "credentials_missing",
      "Perk Sphere partner credentials are not configured."
    );
  }

  return { keyId, hmacSecret };
}

/**
 * Ensure the configured key belongs to DKO Wrestling.
 *
 * Do not remove this check merely to bypass an error.
 * If credentials were rotated, update EXPECTED_KEY_ID
 * only after verifying the new active Linux key.
 */
export function validateKeyId(creds) {
  if (!creds || creds.keyId !== EXPECTED_KEY_ID) {
    throw new PerkSphereSetupError(
      "key_id_mismatch",
      "Configured Perk Sphere key ID does not match DKO Wrestling's expected key."
    );
  }
}

// ------------------------------------------------------------------
// Cryptographic helpers
// ------------------------------------------------------------------

const encoder = new TextEncoder();

async function hmacSha256Hex(key, message) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(message)
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(data) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(data)
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Signed Linux partner request.
 *
 * Canonical format:
 *
 * METHOD
 * PATH_WITH_QUERY
 * UNIX_TIMESTAMP
 * NONCE
 * SHA256_RAW_BODY
 *
 * No trailing newline.
 */
export async function signRequest(
  method,
  pathWithQuery,
  rawBody,
  creds
) {
  validateKeyId(creds);

  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = randomNonce();

  const bodyHash = await sha256Hex(rawBody || "");

  const canonical = [
    method.toUpperCase(),
    pathWithQuery,
    timestamp,
    nonce,
    bodyHash
  ].join("\n");

  const signature = await hmacSha256Hex(
    creds.hmacSecret,
    canonical
  );

  return {
    "X-PS-Key-ID": creds.keyId,
    "X-PS-Timestamp": timestamp,
    "X-PS-Nonce": nonce,
    "X-PS-Signature": signature
  };
}

// ------------------------------------------------------------------
// Safe Linux error handling
// ------------------------------------------------------------------

function parseLinuxError(json, status) {
  const error = json?.error;

  if (typeof error === "string") {
    return {
      code: error,
      message: error
    };
  }

  if (error && typeof error === "object") {
    return {
      code: error.code || `http_${status}`,
      message: error.message || "Perk Sphere request failed."
    };
  }

  return {
    code: json?.code || `http_${status}`,
    message:
      typeof json?.message === "string"
        ? json.message
        : "Perk Sphere request failed."
  };
}

// ------------------------------------------------------------------
// Partner proof-of-possession
// ------------------------------------------------------------------

/**
 * This is separate from account linking.
 * Retained for compatibility with existing DKO functions.
 */
export async function runProofOfPossession(creds) {
  validateKeyId(creds);

  const challengeRes = await fetch(
    `${PERKSPHERE_API_BASE}/v1/partner-credentials/challenge`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        key_id: creds.keyId
      }),
      signal: AbortSignal.timeout(10000)
    }
  );

  const challengeStatus = challengeRes.status;

  if (challengeStatus !== 201) {
    const json = await challengeRes.json().catch(() => null);
    const error = parseLinuxError(json, challengeStatus);

    return {
      ok: false,
      stage: "challenge",
      challengeStatus,
      confirmStatus: null,
      possessionVerified: false,
      activated: false,
      errorCode: error.code,
      message: error.message
    };
  }

  const challengeJson =
    await challengeRes.json().catch(() => null);

  const challengeId = challengeJson?.challenge_id;
  const challenge = challengeJson?.challenge;

  if (!challengeId || !challenge) {
    return {
      ok: false,
      stage: "challenge",
      challengeStatus,
      confirmStatus: null,
      possessionVerified: false,
      activated: false,
      errorCode: "malformed_challenge",
      message: "Challenge response missing required fields."
    };
  }

  const canonical = [
    "PS-POSSESSION",
    creds.keyId,
    challengeId,
    challenge
  ].join("\n");

  const signature = await hmacSha256Hex(
    creds.hmacSecret,
    canonical
  );

  const confirmRes = await fetch(
    `${PERKSPHERE_API_BASE}/v1/partner-credentials/confirm`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PS-Possession-Challenge": challenge
      },
      body: JSON.stringify({
        key_id: creds.keyId,
        challenge_id: challengeId,
        signature
      }),
      signal: AbortSignal.timeout(10000)
    }
  );

  const confirmStatus = confirmRes.status;

  const confirmJson =
    await confirmRes.json().catch(() => null);

  if (confirmStatus !== 200 && confirmStatus !== 201) {
    const error = parseLinuxError(confirmJson, confirmStatus);

    return {
      ok: false,
      stage: "confirm",
      challengeStatus,
      confirmStatus,
      possessionVerified: false,
      activated: false,
      errorCode: error.code,
      message: error.message
    };
  }

  const ok = confirmJson?.ok === true;

  return {
    ok,
    stage: "confirm",
    challengeStatus,
    confirmStatus,
    possessionVerified:
      confirmJson?.status === "possession_verified",
    activated: confirmJson?.activated === true,
    errorCode:
      ok
        ? null
        : confirmJson?.error?.code || "unexpected_response"
  };
}

// ------------------------------------------------------------------
// Authenticated Linux partner requests
// ------------------------------------------------------------------

const ALLOWED_API_PATHS = new Set([
  "/v1/partner-links/confirm",
  "/v1/partners/events",
  "/partners/account-link/unlink"
]);

/**
 * Performs a partner-signed Linux API request.
 *
 * Body is serialized once and those exact bytes are signed.
 *
 * Only approved partner operations are permitted.
 */
export async function perkSphereRequest(
  method,
  pathWithQuery,
  bodyObj
) {
  if (!LIVE_ENABLED) {
    return {
      ok: false,
      code: "setup_required",
      message: "Perk Sphere integration is not yet live."
    };
  }

  if (
    method !== "POST" ||
    !ALLOWED_API_PATHS.has(pathWithQuery)
  ) {
    return {
      ok: false,
      code: "invalid_endpoint",
      message: "Unsupported Perk Sphere partner endpoint."
    };
  }

  try {
    const creds = loadCredentials();

    validateKeyId(creds);

    const rawBody =
      bodyObj == null ? "" : JSON.stringify(bodyObj);

    const signed = await signRequest(
      method,
      pathWithQuery,
      rawBody,
      creds
    );

    const response = await fetch(
      `${PERKSPHERE_API_BASE}${pathWithQuery}`,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          ...signed
        },
        body: rawBody,
        signal: AbortSignal.timeout(15000)
      }
    );

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      const error = parseLinuxError(
        json,
        response.status
      );

      return {
        ok: false,
        code: error.code,
        message: error.message,
        status: response.status
      };
    }

    const data = json?.data || json;

    if (!data || data.ok !== true) {
      const error = parseLinuxError(
        data,
        response.status
      );

      return {
        ok: false,
        code:
          error.code === `http_${response.status}`
            ? "unexpected_response"
            : error.code,
        message: error.message,
        status: response.status
      };
    }

    return {
      ok: true,
      data,
      status: response.status
    };
  } catch (error) {
    if (error instanceof PerkSphereSetupError) {
      return {
        ok: false,
        code: error.code,
        message: error.message
      };
    }

    return {
      ok: false,
      code: "linux_unreachable",
      message:
        "Unable to contact the Perk Sphere Linux API."
    };
  }
}
