import { Router } from "express";
import { isAuthenticated } from "../localAuth";
import {
  generateAndStoreOrgKeyPair,
  getOrgActiveKey,
  signTrainingRecord,
  verifyTrainingRecord,
  signAllUnsignedRecords,
  exportPublicKeyPem,
  computeFingerprint,
} from "../services/crypto-signing";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { isPlatformStaff, getUserMemberships, requireOrg } from "../middleware/tenant";
import { queueAuditReadinessRefresh } from "../services/audit-readiness";

const router = Router();

// Only platform staff or an admin member of the org may manage its key lifecycle.
async function requireOrgAdmin(req: any, res: any, orgId: string): Promise<boolean> {
  if (isPlatformStaff(req.user?.email)) return true;
  const memberships = await getUserMemberships(req.user.id);
  const membership = memberships.find((m) => m.organizationId === orgId);
  if (membership && membership.orgRole === "admin") return true;
  res.status(403).json({ message: "Only an admin of this organization can generate its signing keys" });
  return false;
}

// POST /api/org-keys/generate — generate Ed25519 key pair for the organization
router.post("/generate", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    if (!(await requireOrgAdmin(req, res, orgId))) return;
    const result = await generateAndStoreOrgKeyPair(orgId);
    res.json({
      success: true,
      algorithm: result.algorithm,
      fingerprint: result.fingerprint,
      publicKeyPem: result.publicKeyPem,
      createdAt: result.createdAt,
      message: "Ed25519 key pair generated. Private key is encrypted and stored server-side.",
    });
  } catch (err: any) {
    console.error("Key generation error:", err);
    res.status(500).json({ message: err.message || "Key generation failed" });
  }
});

// GET /api/org-keys/current — get the active org key (public only)
router.get("/current", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const key = await getOrgActiveKey(orgId);
    if (!key) {
      return res.json({ hasKey: false, message: "No key generated yet" });
    }
    res.json({
      hasKey: true,
      fingerprint: key.key_fingerprint,
      algorithm: key.algorithm,
      publicKeyPem: key.public_key_pem,
      createdAt: key.created_at,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to fetch key" });
  }
});

// GET /api/org-keys/public-key — download public key as PEM file
router.get("/public-key", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const pem = await exportPublicKeyPem(orgId);
    if (!pem) return res.status(404).json({ message: "No key found" });
    res.setHeader("Content-Type", "application/x-pem-file");
    res.setHeader("Content-Disposition", `attachment; filename="bccs-org-public-key.pem"`);
    res.send(pem);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/org-keys/sign/:eventId — sign a single training record
router.post("/sign/:eventId", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const result = await signTrainingRecord(req.params.eventId, orgId);
    queueAuditReadinessRefresh(orgId, 'record_signed');
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error("Sign record error:", err);
    res.status(500).json({ message: err.message || "Signing failed" });
  }
});

// POST /api/org-keys/sign-all — sign all unsigned records
router.post("/sign-all", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const result = await signAllUnsignedRecords(orgId);
    queueAuditReadinessRefresh(orgId, 'records_bulk_signed');
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Bulk signing failed" });
  }
});

// GET /api/org-keys/verify/:eventId — verify a record's cryptographic signature
router.get("/verify/:eventId", async (req, res) => {
  // Verification is intentionally public — anyone with the event ID can verify
  try {
    const result = await verifyTrainingRecord(req.params.eventId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Verification failed" });
  }
});

// GET /api/org-keys/chain — get signed records forming the chain
router.get("/chain", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const rows = await db.execute(sql`
      SELECT id, student_name, instructor_name, event_type, event_date,
             status, key_fingerprint, signed_data_hash, chain_hash, signed_at,
             signature
      FROM bccs_training_events
      WHERE signature IS NOT NULL AND organization_id = ${orgId}
      ORDER BY signed_at ASC
    `).then(r => (r as any).rows);

    res.json({
      chainLength: rows.length,
      records: rows.map((r: any, i: number) => ({
        index: i + 1,
        id: r.id,
        studentName: r.student_name,
        instructorName: r.instructor_name,
        eventType: r.event_type,
        eventDate: r.event_date,
        status: r.status,
        keyFingerprint: r.key_fingerprint,
        signedDataHash: r.signed_data_hash,
        chainHash: r.chain_hash,
        signedAt: r.signed_at,
        signaturePreview: r.signature ? r.signature.slice(0, 16) + "..." : null,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to fetch chain" });
  }
});

// POST /api/org-keys/generate-for-org — generate key for a specific org (org setup flow)
// Only platform staff or an admin member of that organization may (re)generate its key.
router.post("/generate-for-org", isAuthenticated, async (req: any, res) => {
  try {
    const { orgId } = req.body;
    if (!orgId) return res.status(400).json({ message: "orgId required" });
    if (!(await requireOrgAdmin(req, res, orgId))) return;
    const result = await generateAndStoreOrgKeyPair(orgId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Key generation failed" });
  }
});

export default router;
