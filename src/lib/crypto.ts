import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  randomInt,
  sign,
  verify,
  type KeyObject,
} from "node:crypto";

/**
 * Secret de l'application (APP_SECRET, 32 caractères ou plus). Il sert à dériver :
 *  - la clé AES-GCM qui chiffre les mots de passe temporaires ;
 *  - la paire de clés Ed25519 qui signe les QR codes des convocations (RG-04).
 */
function appSecret(): string {
  const secret = process.env.APP_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_SECRET manquant ou trop court (32 caractères minimum).");
  }
  return "mianara-secret-de-developpement-a-remplacer-en-production";
}

const derive = (label: string) => createHash("sha256").update(`${label}:${appSecret()}`).digest();

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/* ---------- Chiffrement (mot de passe temporaire) ---------- */

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", derive("aes"), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}

export function decrypt(token: string): string | null {
  try {
    const raw = Buffer.from(token, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", derive("aes"), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/* ---------- Signature Ed25519 des QR codes ---------- */

// En-tête DER PKCS#8 d'une clé privée Ed25519 : il précède la graine de 32 octets.
const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

let keys: { privateKey: KeyObject; publicKey: KeyObject } | null = null;

function qrKeys() {
  if (!keys) {
    const privateKey = createPrivateKey({
      key: Buffer.concat([ED25519_PKCS8_PREFIX, derive("qr-ed25519")]),
      format: "der",
      type: "pkcs8",
    });
    keys = { privateKey, publicKey: createPublicKey(privateKey) };
  }
  return keys;
}

/** Clé publique (PEM) à embarquer dans un scanner hors ligne. */
export const qrPublicKeyPem = () => qrKeys().publicKey.export({ format: "pem", type: "spki" }).toString();

const QR_PREFIX = "MIA1.";

/** Jeton du QR : version + identifiant du candidat (16 octets) + signature. Aucune donnée personnelle. */
export function signQr(candidateId: string): string {
  const payload = Buffer.concat([Buffer.from([1]), Buffer.from(candidateId.replace(/-/g, ""), "hex")]);
  const signature = sign(null, payload, qrKeys().privateKey);
  return QR_PREFIX + Buffer.concat([payload, signature]).toString("base64url");
}

/** Renvoie l'identifiant du candidat si la signature est valide, sinon `null`. */
export function verifyQr(token: string): string | null {
  if (!token.startsWith(QR_PREFIX)) return null;
  try {
    const raw = Buffer.from(token.slice(QR_PREFIX.length), "base64url");
    if (raw.length !== 17 + 64 || raw[0] !== 1) return null;
    const payload = raw.subarray(0, 17);
    if (!verify(null, payload, qrKeys().publicKey, raw.subarray(17))) return null;
    const hex = payload.subarray(1).toString("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    return null;
  }
}

/* ---------- Identifiants ---------- */

// Sans 0/O, 1/l/I : le mot de passe se recopie depuis une convocation imprimée.
const PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function temporaryPassword(length = 10): string {
  let out = "";
  for (let i = 0; i < length; i++) out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  return out;
}

export const sessionToken = () => randomBytes(32).toString("base64url");
