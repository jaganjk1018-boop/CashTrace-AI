// backend/truncate-actionlog.js
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

async function run() {
  const pool = new pg.Pool({ connectionString });
  try {
    await pool.query("TRUNCATE action_log CASCADE;");
    console.log("SUCCESS: Action log truncated.");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
