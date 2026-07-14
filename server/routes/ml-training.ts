import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import { requireOrg } from "../middleware/tenant";

const router = Router();

// GET /api/ml/metrics — real metrics from the agentic document pipeline plus
// platform data sources.
router.get("/metrics", isAuthenticated, async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const [submissions] = await db.execute(sql`
      SELECT COUNT(*) AS total FROM digital_form_submissions WHERE organization_id = ${orgId}
    `).then(r => (r as any).rows);

    const [templates] = await db.execute(sql`
      SELECT COUNT(*) AS total FROM digital_form_templates WHERE status = 'active' AND organization_id = ${orgId}
    `).then(r => (r as any).rows);

    const [events] = await db.execute(sql`
      SELECT COUNT(*) AS total FROM bccs_training_events WHERE organization_id = ${orgId}
    `).then(r => (r as any).rows);

    const [students] = await db.execute(sql`
      SELECT COUNT(*) AS total FROM students WHERE organization_id = ${orgId}
    `).then(r => (r as any).rows);

    const [instructors] = await db.execute(sql`
      SELECT COUNT(*) AS total FROM bccs_instructor_records WHERE organization_id = ${orgId}
    `).then(r => (r as any).rows);

    // ── Real pipeline metrics ──────────────────────────────────────────────
    const [docStats] = await db.execute(sql`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE status = 'auto_approved')::int AS auto_approved,
             COUNT(*) FILTER (WHERE status = 'needs_review')::int AS needs_review,
             COUNT(*) FILTER (WHERE status = 'approved')::int AS human_approved,
             COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
             COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
             ROUND(AVG(overall_confidence) FILTER (WHERE overall_confidence IS NOT NULL))::int AS avg_confidence
      FROM bccs_documents WHERE organization_id = ${orgId}
    `).then(r => (r as any).rows);

    const [feedback] = await db.execute(sql`
      SELECT COUNT(*)::int AS total FROM bccs_ml_feedback WHERE organization_id = ${orgId}
    `).then(r => (r as any).rows);

    // Per-field accuracy from reviewed fields: approved (kept as-is) vs corrected.
    const fieldRows = await db.execute(sql`
      SELECT f.field_name,
             COUNT(*) FILTER (WHERE f.status = 'approved')::int AS kept,
             COUNT(*) FILTER (WHERE f.status = 'corrected')::int AS corrected
      FROM bccs_document_fields f
      JOIN bccs_documents d ON d.id = f.document_id
      WHERE d.organization_id = ${orgId} AND f.status IN ('approved', 'corrected')
      GROUP BY f.field_name
      ORDER BY COUNT(*) DESC
      LIMIT 20
    `).then(r => (r as any).rows);

    const fieldAccuracyBreakdown: Record<string, number> = {};
    let keptTotal = 0;
    let reviewedTotal = 0;
    for (const row of fieldRows) {
      const kept = Number(row.kept || 0);
      const corrected = Number(row.corrected || 0);
      const total = kept + corrected;
      if (total > 0) {
        fieldAccuracyBreakdown[row.field_name] = Math.round((kept / total) * 100);
        keptTotal += kept;
        reviewedTotal += total;
      }
    }

    // Overall extraction accuracy: real (share of reviewed fields the AI got
    // right) when review data exists; otherwise fall back to avg confidence.
    const accuracyImprovement = reviewedTotal > 0
      ? Math.round((keptTotal / reviewedTotal) * 1000) / 10
      : Number(docStats?.avg_confidence ?? 0);

    // Learned prompt guidance per document type
    const guidanceRows = await db.execute(sql`
      SELECT document_type, version, source_correction_count, updated_at
      FROM bccs_prompt_guidance
      WHERE organization_id = ${orgId} AND is_active = TRUE
      ORDER BY updated_at DESC
    `).then(r => (r as any).rows);

    let lastTrainingDate = "Not yet trained";
    let modelVersion = "baseline-v0";
    try {
      const [meta] = await db.execute(sql`
        SELECT value FROM bccs_ml_meta WHERE key = 'last_training'
      `).then(r => (r as any).rows);
      if (meta?.value) {
        const parsed = JSON.parse(meta.value);
        lastTrainingDate = parsed.date;
        modelVersion = parsed.version;
      }
    } catch {
      // table doesn't exist yet — will be created on first learning pass
    }

    res.json({
      totalFormSubmissions: Number(submissions?.total || 0),
      totalTrainingEvents: Number(events?.total || 0),
      totalStudents: Number(students?.total || 0),
      totalInstructors: Number(instructors?.total || 0),
      totalTemplates: Number(templates?.total || 0),
      totalCorrections: Number(feedback?.total || 0),
      accuracyImprovement,
      fieldAccuracyBreakdown,
      modelVersion,
      lastTrainingDate,
      pipeline: {
        totalDocuments: Number(docStats?.total || 0),
        autoApproved: Number(docStats?.auto_approved || 0),
        needsReview: Number(docStats?.needs_review || 0),
        humanApproved: Number(docStats?.human_approved || 0),
        rejected: Number(docStats?.rejected || 0),
        failed: Number(docStats?.failed || 0),
        avgConfidence: Number(docStats?.avg_confidence || 0),
        guidance: guidanceRows.map((g: any) => ({
          documentType: g.document_type,
          version: Number(g.version),
          correctionsLearnedFrom: Number(g.source_correction_count),
          updatedAt: g.updated_at,
        })),
      },
    });
  } catch (err) {
    console.error("ML metrics error:", err);
    res.status(500).json({ message: "Failed to fetch ML metrics" });
  }
});

// POST /api/ml/train — record a training run and update meta
router.post("/train", isAuthenticated, async (_req, res) => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bccs_ml_meta (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const version = `v${Date.now().toString(36).toUpperCase()}`;
    const payload = JSON.stringify({ date: new Date().toISOString(), version });

    await db.execute(sql`
      INSERT INTO bccs_ml_meta (key, value, updated_at)
      VALUES ('last_training', ${payload}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${payload}, updated_at = NOW()
    `);

    res.json({ success: true, version, trainedAt: new Date().toISOString() });
  } catch (err) {
    console.error("ML train error:", err);
    res.status(500).json({ message: "Failed to run training" });
  }
});

// GET /api/ml/export-data — download the active org's training data as structured JSON
router.get("/export-data", isAuthenticated, async (req, res) => {
  try {
    const orgId = requireOrg(req, res);
    if (!orgId) return;
    const submissions = await db.execute(sql`
      SELECT s.id, s.template_title, s.organization_name, s.submitted_by,
             s.submitted_at, s.status, s.form_data,
             t.fields AS template_fields, t.faa_source_id, t.faa_document_title
      FROM digital_form_submissions s
      LEFT JOIN digital_form_templates t ON t.id = s.template_id
      WHERE s.organization_id = ${orgId}
      ORDER BY s.submitted_at DESC
    `).then(r => (r as any).rows);

    const events = await db.execute(sql`
      SELECT student_name, student_id, instructor_name, event_type,
             event_date, duration_hours, curriculum_item, status, blockchain_hash
      FROM bccs_training_events
      WHERE organization_id = ${orgId}
      ORDER BY event_date DESC
    `).then(r => (r as any).rows);

    const students = await db.execute(sql`
      SELECT first_name, last_name, email, enrollment_date, status
      FROM students
      WHERE organization_id = ${orgId}
      ORDER BY last_name
    `).then(r => (r as any).rows);

    const instructors = await db.execute(sql`
      SELECT first_name, last_name, email, certificate_number, certificate_type, expiration_date
      FROM bccs_instructor_records
      WHERE organization_id = ${orgId}
      ORDER BY last_name
    `).then(r => (r as any).rows);

    res.json({
      exportedAt: new Date().toISOString(),
      summary: {
        formSubmissions: submissions.length,
        trainingEvents: events.length,
        students: students.length,
        instructors: instructors.length,
      },
      formSubmissions: submissions,
      trainingEvents: events,
      students,
      instructors,
    });
  } catch (err) {
    console.error("ML export error:", err);
    res.status(500).json({ message: "Failed to export training data" });
  }
});

export default router;
