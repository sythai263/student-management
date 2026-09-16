/**
 * ECDSA P-256 message signing for quiz Broadcast anti-spoofing.
 *
 * The host generates an ephemeral keypair per session and stores the
 * public key (JWK) on the quizSessions row; every host command is
 * signed and players verify it. Each player also generates a keypair —
 * the host binds playerId -> publicKey on first hello and verifies
 * every answer signature.
 *
 * NOTE: crypto.subtle only exists in secure contexts (HTTPS or
 * localhost). Callers must check isSigningSupported() and decide how
 * to degrade — see docs/7-realtime-quiz.md.
 */

const ECDSA_PARAMS: EcKeyGenParams = { name: "ECDSA", namedCurve: "P-256" };
const SIGN_PARAMS: EcdsaParams = { name: "ECDSA", hash: "SHA-256" };

export function isSigningSupported(): boolean {
  return (
    typeof globalThis.crypto !== "undefined" &&
    !!globalThis.crypto.subtle
  );
}

export interface SigningKeys {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
}

export async function generateSigningKeys(): Promise<SigningKeys> {
  const pair = await crypto.subtle.generateKey(ECDSA_PARAMS, true, [
    "sign",
    "verify",
  ]);
  const [publicKeyJwk, privateKeyJwk] = await Promise.all([
    crypto.subtle.exportKey("jwk", pair.publicKey),
    crypto.subtle.exportKey("jwk", pair.privateKey),
  ]);
  return {
    privateKey: pair.privateKey,
    publicKey: pair.publicKey,
    publicKeyJwk,
    privateKeyJwk,
  };
}

export async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", jwk, ECDSA_PARAMS, true, ["sign"]);
}

export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", jwk, ECDSA_PARAMS, false, ["verify"]);
}

/** Deterministic JSON: object keys sorted recursively, undefined dropped. */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`)
    .join(",")}}`;
}

/** The canonical signing input: payload minus its `sig` field. */
export function signingInput(payload: Record<string, unknown>): string {
  const rest = { ...payload };
  delete rest.sig;
  return canonicalize(rest);
}

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function signPayload(
  privateKey: CryptoKey,
  payload: Record<string, unknown>,
): Promise<string> {
  const data = new TextEncoder().encode(signingInput(payload));
  const sig = await crypto.subtle.sign(SIGN_PARAMS, privateKey, data);
  return toBase64(sig);
}

export async function verifyPayload(
  publicKey: CryptoKey,
  payload: Record<string, unknown>,
): Promise<boolean> {
  const sig = payload.sig;
  if (typeof sig !== "string" || !sig) return false;
  try {
    const data = new TextEncoder().encode(signingInput(payload));
    return await crypto.subtle.verify(
      SIGN_PARAMS,
      publicKey,
      fromBase64(sig) as BufferSource,
      data,
    );
  } catch {
    return false;
  }
}
