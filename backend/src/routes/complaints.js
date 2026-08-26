// src/routes/complaints.js
import express from "express";
import crypto from "crypto";
import { pool } from "../db.js";
import { geocodeAddress } from "../services/geocode.js";
import { computeActivePredictions } from "../services/predictionEngine.js";

export default function createComplaintsRouter(io) {
  const router = express.Router();

  // GET /api/complaints
  // Lightweight list of recent complaints, used by the Chain of Custody case selector
  router.get("/", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const result = await pool.query(
        `SELECT id, complaint_number, victim_bank, amount_lost, reported_at, status
         FROM complaints
         ORDER BY reported_at DESC
         LIMIT $1`,
        [limit]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error listing complaints:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/complaints
  // Accepts either { lat, lng } directly, or { address } to be geocoded.
  router.post("/", async (req, res) => {
    try {
      const {
        victim_name,
        victim_bank,
        amount_lost,
        to_account, // targeted mule account number
        lat,
        lng,
        address,
      } = req.body;

      // Generate a realistic complaint number if not provided
      const complaint_number = req.body.complaint_number || `NCRP2026${Math.floor(100000 + Math.random() * 900000)}`;

      if (!complaint_number || !amount_lost) {
        return res.status(400).json({ error: "complaint_number and amount_lost are required" });
      }

      let finalLat = lat;
      let finalLng = lng;

      // If no coordinates given, geocode the free-text address instead.
      if ((finalLat === undefined || finalLng === undefined) && address) {
        const geo = await geocodeAddress(address);
        if (!geo) {
          return res.status(422).json({ error: "Could not geocode the provided address" });
        }
        finalLat = geo.lat;
        finalLng = geo.lng;
      }

      if (finalLat === undefined || finalLng === undefined) {
        return res.status(400).json({ error: "Provide either lat/lng or an address" });
      }

      // 1. Insert Complaint
      const complaintResult = await pool.query(
        `INSERT INTO complaints (complaint_number, victim_name, victim_bank, victim_location, amount_lost)
         VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $6)
         RETURNING id, complaint_number, victim_name, victim_bank, amount_lost, reported_at, status`,
        [complaint_number, victim_name, victim_bank, finalLng, finalLat, amount_lost]
      );

      const newComplaint = complaintResult.rows[0];

      // 2. If a targeted account is specified, insert a matching transaction to trigger prediction heuristics
      if (to_account) {
        // Ensure the account exists in the accounts database (create a mock if it doesn't exist)
        const accountCheck = await pool.query(
          `SELECT account_number FROM accounts WHERE account_number = $1`,
          [to_account]
        );

        if (accountCheck.rows.length === 0) {
          // Create dummy mule account to preserve relational integrity
          const dummyId = crypto.randomUUID ? crypto.randomUUID() : `mock-id-${Date.now()}`;
          await pool.query(
            `INSERT INTO accounts (id, account_number, ifsc, bank_name, first_seen, risk_score, is_flagged_mule)
             VALUES ($1, $2, $3, $4, NOW() - INTERVAL '10 days', 0.85, TRUE)`,
            [dummyId, to_account, 'MOCK0123456', 'Simulated Bank']
          );
        }

        // Insert transaction mapping complaint to the mule account
        const fromAccountDummy = '9999999999'; // Simulated victim source card
        const txnId = crypto.randomUUID ? crypto.randomUUID() : `txn-${Date.now()}`;
        await pool.query(
          `INSERT INTO transactions (id, complaint_id, from_account, to_account, amount, txn_time)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [txnId, newComplaint.id, fromAccountDummy, to_account, amount_lost]
        );

        // 3. Recompute predictions and broadcast new alert via Socket.IO
        const predictions = await computeActivePredictions(10);
        const specificPrediction = predictions.find(p => p.account_number === to_account);
        
        if (specificPrediction) {
          io.emit("new_prediction", specificPrediction);
        } else if (predictions.length > 0) {
          io.emit("new_prediction", predictions[0]);
        }
      }

      res.status(201).json(newComplaint);
    } catch (err) {
      console.error("Error creating complaint:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/complaints/:id
  // Case detail — the complaint plus any linked accounts/transactions.
  router.get("/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const complaintResult = await pool.query(
        `SELECT id, complaint_number, victim_name, victim_bank, amount_lost, reported_at, status,
                ST_Y(victim_location::geometry) AS lat, ST_X(victim_location::geometry) AS lng
         FROM complaints WHERE id = $1`,
        [id]
      );

      if (complaintResult.rows.length === 0) {
        return res.status(404).json({ error: "Complaint not found" });
      }

      const transactionsResult = await pool.query(
        `SELECT t.id, t.amount, t.txn_time,
                fa.account_number AS from_account_number, fa.is_flagged_mule AS from_is_mule,
                ta.account_number AS to_account_number, ta.is_flagged_mule AS to_is_mule
         FROM transactions t
         LEFT JOIN accounts fa ON fa.account_number = t.from_account
         JOIN accounts ta ON ta.account_number = t.to_account
         WHERE t.complaint_id = $1
         ORDER BY t.txn_time ASC`,
         [id]
      );

      res.json({
        ...complaintResult.rows[0],
        transactions: transactionsResult.rows,
      });
    } catch (err) {
      console.error("Error fetching complaint:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
