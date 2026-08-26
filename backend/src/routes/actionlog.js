// src/routes/actionlog.js
import express from "express";
import { appendAction, verifyChain } from "../services/ledger.js";

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

export default router;
