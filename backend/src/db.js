// src/db.js
// Central Postgres connection pool, shared by all routes.

import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Supabase requires SSL
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle Postgres client", err);
});
