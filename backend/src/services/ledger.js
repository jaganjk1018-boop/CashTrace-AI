// src/services/ledger.js
//
// A lightweight, private hash-chain for the action_log table — this is
// what genuinely earns the "blockchain" theme fit, without the overhead
// of standing up a real blockchain node during a hackathon.
//
// How it works: every officer action (alert sent, freeze drafted, freeze
// approved, case closed) is hashed together with the hash of the PREVIOUS
// action for that case. This creates a chain: if anyone edits an old
// record's payload after the fact, its hash changes, which breaks the
// chain for every record after it — instantly detectable.

import crypto from "crypto";
import { pool } from "../db.js";

const GENESIS_HASH = "0".repeat(64);

// Recursively sort object keys alphabetically to guarantee deterministic
// JSON stringification across JavaScript and PostgreSQL's JSONB serialization formats.
function sortKeys(obj) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortKeys);
  }
  const sorted = {};
  Object.keys(obj).sort().forEach((key) => {
    sorted[key] = sortKeys(obj[key]);
  });
  return sorted;
}

function computeHash({ case_id, officer_id, action_type, payload, prev_hash, created_at }) {
  // Use Unix timestamp string to prevent minor ISO formatting / timezone discrepancies
  const dateStr = new Date(created_at).getTime().toString();
  const canonical = JSON.stringify({
    case_id,
    officer_id,
    action_type,
    payload: sortKeys(payload),
    prev_hash,
    created_at: dateStr,
  });
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

// Appends a new action to a case's chain, linking it to the previous hash.
export async function appendAction({ case_id, officer_id, action_type, payload }) {
  const lastResult = await pool.query(
    `SELECT curr_hash FROM action_log WHERE case_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [case_id]
  );
  const prev_hash = lastResult.rows.length > 0 ? lastResult.rows[0].curr_hash : GENESIS_HASH;

  const created_at = new Date().toISOString();
  const curr_hash = computeHash({ case_id, officer_id, action_type, payload, prev_hash, created_at });

  const insertResult = await pool.query(
    `INSERT INTO action_log (case_id, officer_id, action_type, payload, prev_hash, curr_hash, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [case_id, officer_id, action_type, payload, prev_hash, curr_hash, created_at]
  );

  return insertResult.rows[0];
}

// Recomputes every hash in a case's chain from the stored data and checks
// it against what's saved — if a row was edited directly in the DB after
// the fact, this will catch it (perfect for the live "tamper test" demo).
export async function verifyChain(case_id) {
  const { rows } = await pool.query(
    `SELECT * FROM action_log WHERE case_id = $1 ORDER BY created_at ASC`,
    [case_id]
  );

  let expectedPrevHash = GENESIS_HASH;
  const results = [];

  for (const row of rows) {
    const formattedDate = (row.created_at instanceof Date ? row.created_at : new Date(row.created_at)).toISOString();
    
    const recomputedHash = computeHash({
      case_id: row.case_id,
      officer_id: row.officer_id,
      action_type: row.action_type,
      payload: row.payload,
      prev_hash: row.prev_hash,
      created_at: formattedDate,
    });

    const prevHashMatches = row.prev_hash === expectedPrevHash;
    const hashMatches = recomputedHash === row.curr_hash;

    results.push({
      id: row.id,
      action_type: row.action_type,
      officer_id: row.officer_id,
      payload: row.payload,
      created_at: row.created_at,
      valid: prevHashMatches && hashMatches,
      stored_hash: row.curr_hash,
      recomputed_hash: recomputedHash,
    });

    expectedPrevHash = row.curr_hash;
  }

  const isChainIntact = results.every((r) => r.valid);
  return { case_id, isChainIntact, entries: results };
}
