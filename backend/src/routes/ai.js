// src/routes/ai.js
import express from "express";
import { pool } from "../db.js";
import { summarizeCase, draftFreezeRequest } from "../services/llm.js";

const router = express.Router();

// POST /api/ai/summarize
// Body: { complaintId } -> fetches the complaint + linked transactions,
// returns a 3-line investigative brief.
router.post("/summarize", async (req, res) => {
  try {
    const { complaintId } = req.body;
    if (!complaintId) {
      return res.status(400).json({ error: "complaintId is required" });
    }

    const complaintResult = await pool.query(
      `SELECT complaint_number, victim_name, victim_bank, amount_lost, reported_at, status
       FROM complaints WHERE id = $1`,
      [complaintId]
    );

    if (complaintResult.rows.length === 0) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const transactionsResult = await pool.query(
      `SELECT t.amount, t.txn_time, a.bank_name AS mule_bank, a.is_flagged_mule
       FROM transactions t
       JOIN accounts a ON a.account_number = t.to_account
       WHERE t.complaint_id = $1
       ORDER BY t.txn_time ASC`,
      [complaintId]
    );

    const brief = await summarizeCase({
      ...complaintResult.rows[0],
      transactions: transactionsResult.rows,
    });

    res.json({ brief });
  } catch (err) {
    console.error("Error summarizing case:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/ai/draft-freeze
// Body: { complaintId, accountId } -> drafts a freeze request document.
router.post("/draft-freeze", async (req, res) => {
  try {
    const { complaintId, accountId } = req.body;
    if (!complaintId || !accountId) {
      return res.status(400).json({ error: "complaintId and accountId are required" });
    }

    const complaintResult = await pool.query(
      `SELECT complaint_number, victim_name, victim_bank, amount_lost, reported_at
       FROM complaints WHERE id = $1`,
      [complaintId]
    );
    const accountResult = await pool.query(
      `SELECT account_number, ifsc, bank_name FROM accounts WHERE id = $1`,
      [accountId]
    );

    if (complaintResult.rows.length === 0 || accountResult.rows.length === 0) {
      return res.status(404).json({ error: "Complaint or account not found" });
    }

    const draft = await draftFreezeRequest({
      complaint: complaintResult.rows[0],
      account_to_freeze: accountResult.rows[0],
    });

    res.json({ draft });
  } catch (err) {
    console.error("Error drafting freeze request:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

export default router;
