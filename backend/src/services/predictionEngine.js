// src/services/predictionEngine.js
//
// Heuristic risk scoring engine for CashTrace AI.
//
// Logic:
//   1. Find each mule account's most recent incoming transaction (the money
//      it just received from a victim's complaint).
//   2. Recency matters: the sooner after receiving funds, the higher the
//      cash-out risk (mules typically withdraw within a few hours).
//   3. Frequency matters: mule accounts reused across many complaints are
//      more established/active cash-out points, so more transactions = higher risk.
//   4. Proximity: we link each mule account's last-known "region" (from the
//      victim's location on that transaction) to the nearest withdrawal point
//      within a 25km radius — that's our predicted cash-out location.
//   5. predicted_window_end = last transaction time + 4 hours, based on the
//      historical mule cash-out lag we baked into the synthetic dataset.

import { pool } from "../db.js";

const RADIUS_METERS = 25000; // 25km
const CASH_OUT_WINDOW_HOURS = 4;

export async function computeActivePredictions(limit = 10) {
  const { rows } = await pool.query(
    `
    WITH last_mule_activity AS (
      -- Most recent transaction received by each mule account, with the
      -- victim's location on that transaction used as the activity region.
      SELECT DISTINCT ON (t.to_account)
        t.to_account AS account_number,
        t.txn_time AS last_txn_time,
        t.amount AS last_amount,
        c.id AS complaint_id,
        c.victim_bank,
        c.victim_location
      FROM transactions t
      JOIN complaints c ON c.id = t.complaint_id
      JOIN accounts a ON a.account_number = t.to_account AND a.is_flagged_mule = true
      ORDER BY t.to_account, t.txn_time DESC
    ),
    txn_counts AS (
      SELECT to_account AS account_number, COUNT(*) AS txn_count
      FROM transactions
      GROUP BY to_account
    ),
    nearest_withdrawal AS (
      -- For each mule account's last activity region, find the closest
      -- withdrawal point within the radius.
      SELECT
        lma.account_number,
        wp.id AS withdrawal_point_id,
        wp.name AS withdrawal_point_name,
        wp.bank_name AS withdrawal_bank_name,
        ST_Y(wp.location::geometry) AS wp_lat,
        ST_X(wp.location::geometry) AS wp_lng,
        ST_Distance(lma.victim_location, wp.location) AS distance_meters,
        ROW_NUMBER() OVER (
          PARTITION BY lma.account_number
          ORDER BY ST_Distance(lma.victim_location, wp.location) ASC
        ) AS rn
      FROM last_mule_activity lma
      JOIN withdrawal_points wp
        ON ST_DWithin(lma.victim_location, wp.location, ${RADIUS_METERS})
    )
    SELECT
      a.id AS account_id,
      lma.account_number,
      lma.complaint_id,
      a.bank_name AS mule_bank_name,
      lma.last_txn_time,
      lma.last_amount,
      lma.victim_bank,
      ST_Y(lma.victim_location::geometry) AS victim_lat,
      ST_X(lma.victim_location::geometry) AS victim_lng,
      tc.txn_count,
      nw.withdrawal_point_id,
      nw.withdrawal_point_name,
      nw.withdrawal_bank_name,
      nw.wp_lat,
      nw.wp_lng,
      nw.distance_meters,
      EXTRACT(EPOCH FROM (now() - lma.last_txn_time)) / 3600.0 AS hours_since_last_txn
    FROM last_mule_activity lma
    JOIN accounts a ON a.account_number = lma.account_number
    JOIN txn_counts tc ON tc.account_number = lma.account_number
    LEFT JOIN nearest_withdrawal nw ON nw.account_number = lma.account_number AND nw.rn = 1
    WHERE nw.withdrawal_point_id IS NOT NULL
    ORDER BY lma.last_txn_time DESC
    LIMIT 200;
    `
  );

  // Compute the heuristic risk score in JS
  const scored = rows.map((row) => {
    const hoursSince = Math.max(row.hours_since_last_txn, 0.1); // avoid divide-by-zero
    const recencyScore = 1 / hoursSince;
    const frequencyScore = Number(row.txn_count);
    const proximityScore = 1 / (1 + Number(row.distance_meters) / 1000); // closer = higher

    const riskScore = recencyScore * frequencyScore * proximityScore;
    const probability = Math.min(riskScore / 5, 1); // normalize roughly into 0-1 for display

    const predictedWindowStart = new Date(row.last_txn_time);
    const predictedWindowEnd = new Date(
      new Date(row.last_txn_time).getTime() + CASH_OUT_WINDOW_HOURS * 60 * 60 * 1000
    );

    // Explainability breakdown normalized to percentages
    const rawFactors = {
      recency: recencyScore,
      frequency: frequencyScore,
      proximity: proximityScore,
    };
    const totalRaw = rawFactors.recency + rawFactors.frequency + rawFactors.proximity;
    const explanation = {
      summary: `Flagged mainly because this account received funds ${hoursSince.toFixed(
        1
      )}h ago, has been used in ${row.txn_count} prior case(s), and the nearest cash-out point is only ${(
        Number(row.distance_meters) / 1000
      ).toFixed(1)}km from the victim's reported location.`,
      factors: [
        {
          label: "Recency of last transaction",
          detail: `${hoursSince.toFixed(1)} hours since funds received`,
          weight_pct: Math.round((rawFactors.recency / totalRaw) * 100),
        },
        {
          label: "Mule account reuse frequency",
          detail: `Linked to ${row.txn_count} complaint(s)`,
          weight_pct: Math.round((rawFactors.frequency / totalRaw) * 100),
        },
        {
          label: "Proximity to withdrawal point",
          detail: `${(Number(row.distance_meters) / 1000).toFixed(1)} km away`,
          weight_pct: Math.round((rawFactors.proximity / totalRaw) * 100),
        },
      ],
    };

    return {
      account_id: row.account_id,
      complaint_id: row.complaint_id,
      account_number: row.account_number,
      mule_bank_name: row.mule_bank_name,
      victim_bank: row.victim_bank,
      last_amount: Number(row.last_amount),
      txn_count: Number(row.txn_count),
      withdrawal_point_id: row.withdrawal_point_id,
      withdrawal_point_name: row.withdrawal_point_name,
      withdrawal_bank_name: row.withdrawal_bank_name,
      location: { lat: Number(row.wp_lat), lng: Number(row.wp_lng) },
      victim_location: { lat: Number(row.victim_lat), lng: Number(row.victim_lng) },
      distance_km: Number(row.distance_meters) / 1000,
      probability,
      explanation,
      predicted_window_start: predictedWindowStart.toISOString(),
      predicted_window_end: predictedWindowEnd.toISOString(),
      is_expired: predictedWindowEnd.getTime() < Date.now(),
    };
  });

  // Highest risk first, drop already-expired windows, cap to `limit`.
  return scored
    .filter((p) => !p.is_expired)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, limit);
}
