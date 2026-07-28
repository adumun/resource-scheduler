/**
 * Password hashing using Web Crypto PBKDF2.
 *
 * IMPORTANT: This is a local-only, simulated authentication mechanism. It is NOT
 * suitable for production. Passwords never leave the browser, but there is no
 * server-side rate limiting, secret rotation, or transport security. See README.
 */

const ITERATIONS = 100_000;
const KEY_LENGTH_BITS = 256;

function getSubtle(): SubtleCrypto {
  const crypto = globalThis.crypto;
  if (crypto === undefined || crypto.subtle === undefined) {
    throw new Error("Web Crypto API is not available in this environment.");
  }
  return crypto.subtle;
}

function toBase64(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]!);
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const subtle = getSubtle();
  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: fromBase64(salt),
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH_BITS,
  );
  return toBase64(bits);
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  const computed = await hashPassword(password, salt);
  if (computed.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i += 1) {
    diff |= computed.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return diff === 0;
}
