// src/routes/actionlog.js
import express from "express";
import { appendAction, verifyChain } from "../services/ledger.js";
import { pool } from "../db.js";

const router = express.Router();

// POST /api/actionlog
// Records a new officer action into the hash chain for a case.
// Body: { case_id, officer_id, action_type, payload }
router.post("/", async (req, res) => {
  try {
    const { case_id, officer_id, action_type, payload } = req.body;
    if (!case_id || !action_type) {
      return res.status(400).json({ error: "case_id and action_type are required" });
    }

    const entry = await appendAction({
      case_id,
      officer_id: officer_id || "unknown-officer",
      action_type,
      payload: payload || {},
    });

    res.status(201).json(entry);
  } catch (err) {
    console.error("Error appending action:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/actionlog/:caseId
// Returns the full chain-of-custody trail for a case, plus a verification
// result (recomputes every hash and checks it matches what's stored).
router.get("/:caseId", async (req, res) => {
  try {
    const { caseId } = req.params;
    const verification = await verifyChain(caseId);
    res.json(verification);
  } catch (err) {
    console.error("Error fetching action log:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/actionlog/:caseId/tamper
// Toggles a tamper state on the first action log entry of a case.
router.post("/:caseId/tamper", async (req, res) => {
  try {
    const { caseId } = req.params;
    const { rows } = await pool.query(
      "SELECT * FROM action_log WHERE case_id = $1 ORDER BY created_at ASC LIMIT 1",
      [caseId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "No action logs found for this case" });
    }
    const log = rows[0];
    let newPayload = { ...log.payload };
    
    if (newPayload._tampered) {
      delete newPayload._tampered;
    } else {
      newPayload._tampered = "INJECTED_MULE_DATA_BYPASS";
    }

    await pool.query(
      "UPDATE action_log SET payload = $1 WHERE id = $2",
      [newPayload, log.id]
    );

    res.json({ success: true, tampered: !log.payload._tampered });
  } catch (err) {
    console.error("Error simulating tampering:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
