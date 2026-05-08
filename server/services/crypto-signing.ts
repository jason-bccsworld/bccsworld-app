/**
 * BCCS Cryptographic Signing Service
 * Implements real Ed25519 key pair generation, AES-256-GCM private key encryption,
 * and cryptographic chain-of-trust signing for training records.
 */
import crypto from "crypto";
import { db } from "../db";
import { sql } from "drizzle-orm";

// ── Encryption helpers ──────────────────────────────────────────────────────

function getEncryptionKey(): Buffer {
  // Derive a stable 32-byte AES key from the environment secret
  // Different per deployment — never needs to be stored separately
  const secret = (process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || "bccs-default-secret") + "bccs-signing-v1";
  return Buffer.from(crypto.createHash("sha256").update(secret).digest());
}

function encryptPrivateKey(privatePem: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(privatePem, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Store as iv:tag:ciphertext — all hex-encoded
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptPrivateKey(stored: string): string {
  const [ivHex, tagHex, cipherHex] = stored.split(":");
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(cipherHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
}

// ── Fingerprint ─────────────────────────────────────────────────────────────

export function computeFingerprint(publicKeyPem: string): string {
  // Strip PEM headers and decode DER
  const der = Buffer.from(
    publicKeyPem.replace(/-----[^-]+-----/g, "").replace(/\s/g, ""),
    "base64"
  );
  const hash = crypto.createHash("sha256").update(der).digest("hex");
  // Format like SSH: XX:XX:XX:...  (first 8 pairs)
  return hash.match(/.{2}/g)!.slice(0, 8).join(":");
}

// ── DB helpers ──────────────────────────────────────────────────────────────

export async function ensureCryptoTables(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bccs_org_crypto_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id VARCHAR(300) NOT NULL,
      algorithm VARCHAR(20) NOT NULL DEFAULT 'ed25519',
      public_key_pem TEXT NOT NULL,
      encrypted_private_key TEXT NOT NULL,
      key_fingerprint VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      is_active BOOLEAN DEFAULT TRUE
    )
  `);

  // Add signature columns to bccs_training_events if they don't exist
  await db.execute(sql`ALTER TABLE bccs_training_events ADD COLUMN IF NOT EXISTS signature TEXT`);
  await db.execute(sql`ALTER TABLE bccs_training_events ADD COLUMN IF NOT EXISTS signed_data_hash VARCHAR(64)`);
  await db.execute(sql`ALTER TABLE bccs_training_events ADD COLUMN IF NOT EXISTS chain_hash VARCHAR(64)`);
  await db.execute(sql`ALTER TABLE bccs_training_events ADD COLUMN IF NOT EXISTS key_fingerprint VARCHAR(100)`);
  await db.execute(sql`ALTER TABLE bccs_training_events ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP`);
}

// ── Key pair generation ─────────────────────────────────────────────────────

export interface OrgKeyResult {
  publicKeyPem: string;
  fingerprint: string;
  algorithm: string;
  createdAt: string;
}

export async function generateAndStoreOrgKeyPair(orgIdentifier: string): Promise<OrgKeyResult> {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const fingerprint = computeFingerprint(publicKey);
  const encryptedPrivate = encryptPrivateKey(privateKey);

  // Deactivate any existing active keys for this org
  await db.execute(sql`
    UPDATE bccs_org_crypto_keys SET is_active = FALSE
    WHERE org_id = ${orgIdentifier} AND is_active = TRUE
  `);

  const createdAt = new Date().toISOString();
  await db.execute(sql`
    INSERT INTO bccs_org_crypto_keys
      (org_id, algorithm, public_key_pem, encrypted_private_key, key_fingerprint, created_at, is_active)
    VALUES
      (${orgIdentifier}, 'ed25519', ${publicKey}, ${encryptedPrivate}, ${fingerprint}, NOW(), TRUE)
  `);

  return { publicKeyPem: publicKey, fingerprint, algorithm: "ed25519", createdAt };
}

// ── Retrieve org key ────────────────────────────────────────────────────────

interface OrgKeyRow {
  id: string;
  public_key_pem: string;
  encrypted_private_key: string;
  key_fingerprint: string;
  algorithm: string;
  created_at: string;
}

export async function getOrgActiveKey(orgIdentifier: string): Promise<OrgKeyRow | null> {
  const rows = await db.execute(sql`
    SELECT id, public_key_pem, encrypted_private_key, key_fingerprint, algorithm, created_at
    FROM bccs_org_crypto_keys
    WHERE org_id = ${orgIdentifier} AND is_active = TRUE
    ORDER BY created_at DESC
    LIMIT 1
  `).then(r => (r as any).rows as OrgKeyRow[]);

  return rows[0] ?? null;
}

// ── Get latest chain hash ───────────────────────────────────────────────────

async function getLatestChainHash(orgIdentifier: string): Promise<string> {
  const rows = await db.execute(sql`
    SELECT chain_hash FROM bccs_training_events
    WHERE key_fingerprint IS NOT NULL AND chain_hash IS NOT NULL
    ORDER BY signed_at DESC
    LIMIT 1
  `).then(r => (r as any).rows);
  return (rows[0]?.chain_hash as string) ?? "0000000000000000000000000000000000000000000000000000000000000000";
}

// ── Sign a training record ──────────────────────────────────────────────────

export interface SignatureResult {
  signature: string;
  signedDataHash: string;
  chainHash: string;
  keyFingerprint: string;
  signedAt: string;
}

export async function signTrainingRecord(
  eventId: string,
  orgIdentifier: string
): Promise<SignatureResult> {
  // Fetch the record
  const rows = await db.execute(sql`
    SELECT id, student_name, instructor_name, event_type, event_date,
           duration_hours, curriculum_item, status, blockchain_hash
    FROM bccs_training_events WHERE id = ${eventId}
  `).then(r => (r as any).rows);

  if (!rows[0]) throw new Error(`Training record ${eventId} not found`);
  const record = rows[0];

  // Get the org's active key
  const keyRow = await getOrgActiveKey(orgIdentifier);
  if (!keyRow) throw new Error(`No active key found for org ${orgIdentifier}. Generate a key first.`);

  const privateKeyPem = decryptPrivateKey(keyRow.encrypted_private_key);
  const prevChainHash = await getLatestChainHash(orgIdentifier);

  // Canonical data to sign — deterministic ordering
  const canonicalData = JSON.stringify({
    id: record.id,
    studentName: record.student_name,
    instructorName: record.instructor_name,
    eventType: record.event_type,
    eventDate: record.event_date,
    durationHours: record.duration_hours,
    curriculumItem: record.curriculum_item,
    status: record.status,
    prevChainHash,
    bccsVersion: "1.0",
  });

  const dataBuffer = Buffer.from(canonicalData, "utf8");
  const sigBuffer = crypto.sign(null, dataBuffer, privateKeyPem);

  const signedDataHash = crypto.createHash("sha256").update(dataBuffer).digest("hex");
  const chainHash = crypto.createHash("sha256")
    .update(signedDataHash + prevChainHash)
    .digest("hex");
  const signature = sigBuffer.toString("hex");
  const signedAt = new Date().toISOString();

  // Persist back to the record
  await db.execute(sql`
    UPDATE bccs_training_events SET
      signature        = ${signature},
      signed_data_hash = ${signedDataHash},
      chain_hash       = ${chainHash},
      key_fingerprint  = ${keyRow.key_fingerprint},
      signed_at        = NOW()
    WHERE id = ${eventId}
  `);

  return {
    signature,
    signedDataHash,
    chainHash,
    keyFingerprint: keyRow.key_fingerprint,
    signedAt,
  };
}

// ── Verify a training record's signature ────────────────────────────────────

export interface VerifyResult {
  valid: boolean;
  eventId: string;
  keyFingerprint: string | null;
  signedAt: string | null;
  details: string;
}

export async function verifyTrainingRecord(eventId: string): Promise<VerifyResult> {
  const rows = await db.execute(sql`
    SELECT id, student_name, instructor_name, event_type, event_date,
           duration_hours, curriculum_item, status, blockchain_hash,
           signature, signed_data_hash, chain_hash, key_fingerprint, signed_at
    FROM bccs_training_events WHERE id = ${eventId}
  `).then(r => (r as any).rows);

  if (!rows[0]) return { valid: false, eventId, keyFingerprint: null, signedAt: null, details: "Record not found" };
  const record = rows[0];

  if (!record.signature || !record.signed_data_hash || !record.key_fingerprint) {
    return { valid: false, eventId, keyFingerprint: null, signedAt: null, details: "Record has not been signed" };
  }

  // Find the key by fingerprint
  const keyRows = await db.execute(sql`
    SELECT public_key_pem, encrypted_private_key FROM bccs_org_crypto_keys
    WHERE key_fingerprint = ${record.key_fingerprint}
    LIMIT 1
  `).then(r => (r as any).rows);

  if (!keyRows[0]) {
    return {
      valid: false,
      eventId,
      keyFingerprint: record.key_fingerprint,
      signedAt: record.signed_at,
      details: "Signing key not found in system",
    };
  }

  // We need to re-derive prevChainHash — look up the record just before this one
  // by signed_at, and get its chain_hash (or genesis hash if first)
  const prevRows = await db.execute(sql`
    SELECT chain_hash FROM bccs_training_events
    WHERE key_fingerprint IS NOT NULL
      AND signed_at < ${record.signed_at}
    ORDER BY signed_at DESC
    LIMIT 1
  `).then(r => (r as any).rows);

  const prevChainHash = (prevRows[0]?.chain_hash as string)
    ?? "0000000000000000000000000000000000000000000000000000000000000000";

  const canonicalData = JSON.stringify({
    id: record.id,
    studentName: record.student_name,
    instructorName: record.instructor_name,
    eventType: record.event_type,
    eventDate: record.event_date,
    durationHours: record.duration_hours,
    curriculumItem: record.curriculum_item,
    status: record.status,
    prevChainHash,
    bccsVersion: "1.0",
  });

  const dataBuffer = Buffer.from(canonicalData, "utf8");
  const sigBuffer = Buffer.from(record.signature, "hex");

  let valid = false;
  try {
    valid = crypto.verify(null, dataBuffer, keyRows[0].public_key_pem, sigBuffer);
  } catch {
    valid = false;
  }

  // Additionally verify the data hash hasn't been altered
  const expectedHash = crypto.createHash("sha256").update(dataBuffer).digest("hex");
  const hashMatch = expectedHash === record.signed_data_hash;

  return {
    valid: valid && hashMatch,
    eventId,
    keyFingerprint: record.key_fingerprint,
    signedAt: record.signed_at,
    details: valid && hashMatch
      ? "Signature valid — record is authentic and unaltered"
      : !hashMatch
      ? "Data hash mismatch — record may have been tampered with"
      : "Signature invalid — cryptographic verification failed",
  };
}

// ── Bulk sign all unsigned records for an org ───────────────────────────────

export async function signAllUnsignedRecords(orgIdentifier: string): Promise<{ signed: number; failed: number }> {
  const rows = await db.execute(sql`
    SELECT id FROM bccs_training_events
    WHERE signature IS NULL
    ORDER BY event_date ASC
  `).then(r => (r as any).rows);

  let signed = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await signTrainingRecord(row.id, orgIdentifier);
      signed++;
    } catch {
      failed++;
    }
  }
  return { signed, failed };
}

// ── Export public key as PEM ────────────────────────────────────────────────

export async function exportPublicKeyPem(orgIdentifier: string): Promise<string | null> {
  const key = await getOrgActiveKey(orgIdentifier);
  return key?.public_key_pem ?? null;
}
