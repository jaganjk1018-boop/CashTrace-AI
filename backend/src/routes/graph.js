// src/routes/graph.js
//
// Exposes the mule-account network as nodes + edges so the frontend can
// render an interactive force-directed graph. Two endpoints:
//   GET /api/graph/network        -> the full mule network (all flagged accounts)
//   GET /api/graph/:accountId     -> a focused subgraph around one account

import express from "express";
import { pool } from "../db.js";

const router = express.Router();

// GET /api/graph/network
// Returns every flagged mule account plus the complaints connected to it,
// with transactions as edges. Capped to keep the force-directed layout readable.
router.get("/network", async (req, res) => {
  try {
    const accountsResult = await pool.query(
      `SELECT id, account_number, bank_name, risk_score
       FROM accounts
       WHERE is_flagged_mule = true`
    );

    if (accountsResult.rows.length === 0) {
      return res.json({ nodes: [], edges: [] });
    }

    const transactionsResult = await pool.query(
      `SELECT t.id, t.complaint_id, t.to_account, t.amount, t.txn_time,
              c.complaint_number, c.victim_bank, c.amount_lost,
              a.id AS to_account_id
       FROM transactions t
       JOIN complaints c ON c.id = t.complaint_id
       JOIN accounts a ON a.account_number = t.to_account
       WHERE t.to_account = ANY($1::varchar[])
       ORDER BY t.txn_time DESC
       LIMIT 300`,
      [accountsResult.rows.map((a) => a.account_number)]
    );

    // Build node list: mule accounts + the distinct complaints linked to them.
    const accountNodes = accountsResult.rows.map((a) => ({
      id: a.id,
      type: "account",
      label: `Acct •${a.account_number.slice(-4)}`,
      bank: a.bank_name,
      risk_score: Number(a.risk_score),
    }));

    const complaintNodeMap = new Map();
    const edges = [];

    for (const t of transactionsResult.rows) {
      if (!complaintNodeMap.has(t.complaint_id)) {
        complaintNodeMap.set(t.complaint_id, {
          id: t.complaint_id,
          type: "complaint",
          label: t.complaint_number,
          bank: t.victim_bank,
          amount_lost: Number(t.amount_lost),
        });
      }
      edges.push({
        source: t.complaint_id,
        target: t.to_account_id, // Map target to matching account UUID id
        amount: Number(t.amount),
        txn_time: t.txn_time,
      });
    }

    res.json({
      nodes: [...accountNodes, ...complaintNodeMap.values()],
      edges,
    });
  } catch (err) {
    console.error("Error building mule network graph:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/graph/:accountId
// A focused view: just this account and the complaints that fed it.
router.get("/:accountId", async (req, res) => {
  try {
    const { accountId } = req.params;

    const accountResult = await pool.query(
      `SELECT id, account_number, bank_name, risk_score, is_flagged_mule
       FROM accounts WHERE id = $1`,
      [accountId]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    const linkedResult = await pool.query(
      `SELECT t.id AS txn_id, t.amount, t.txn_time,
              c.id AS complaint_id, c.complaint_number, c.victim_bank, c.amount_lost
       FROM transactions t
       JOIN complaints c ON c.id = t.complaint_id
       JOIN accounts a ON a.account_number = t.to_account
       WHERE a.id = $1
       ORDER BY t.txn_time DESC`,
      [accountId]
    );

    const account = accountResult.rows[0];
    const nodes = [
      {
        id: account.id,
        type: "account",
        label: `Acct •${account.account_number.slice(-4)}`,
        bank: account.bank_name,
        risk_score: Number(account.risk_score),
      },
      ...linkedResult.rows.map((r) => ({
        id: r.complaint_id,
        type: "complaint",
        label: r.complaint_number,
        bank: r.victim_bank,
        amount_lost: Number(r.amount_lost),
      })),
    ];

    const edges = linkedResult.rows.map((r) => ({
      source: r.complaint_id,
      target: account.id,
      amount: Number(r.amount),
      txn_time: r.txn_time,
    }));

    res.json({ nodes, edges });
  } catch (err) {
    console.error("Error building account subgraph:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
