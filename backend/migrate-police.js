// backend/migrate-police.js
import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL not found in backend/.env!");
  process.exit(1);
}

async function run() {
  const pool = new pg.Pool({ connectionString });
  console.log("Connecting to Supabase...");
  
  try {
    // 1. Create police_stations table
    console.log("Creating police_stations table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS police_stations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        location GEOGRAPHY(POINT, 4326) NOT NULL,
        contact_number VARCHAR(50),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS police_stations_location_idx ON police_stations USING gist(location);
    `);

    // 2. Check if we already have seeded police stations
    const { rows } = await pool.query("SELECT COUNT(*) FROM police_stations");
    if (parseInt(rows[0].count) > 0) {
      console.log("police_stations already seeded. Skipping seed.");
    } else {
      console.log("Seeding police stations...");
      await pool.query(`
        INSERT INTO police_stations (name, location, contact_number) VALUES 
        -- Chennai
        ('Chennai Central Cyber Crime Cell', ST_SetSRID(ST_MakePoint(80.2707, 13.0827), 4326)::geography, '+91-44-23452345'),
        ('Mylapore Police Station', ST_SetSRID(ST_MakePoint(80.2612, 13.0330), 4326)::geography, '+91-44-23452346'),
        ('Adyar Police Station', ST_SetSRID(ST_MakePoint(80.2520, 12.9980), 4326)::geography, '+91-44-23452347'),
        
        -- Mumbai
        ('Mumbai Cyber HQ - Bandra Kurla Complex', ST_SetSRID(ST_MakePoint(72.8777, 19.0760), 4326)::geography, '+91-22-26504000'),
        ('Bandra Police Station', ST_SetSRID(ST_MakePoint(72.8402, 19.0544), 4326)::geography, '+91-22-26504001'),
        ('Andheri Police Precinct', ST_SetSRID(ST_MakePoint(72.8525, 19.1175), 4326)::geography, '+91-22-26504002'),
        
        -- Delhi
        ('Delhi Central Cyber Cell (Dwarka)', ST_SetSRID(ST_MakePoint(77.1025, 28.7041), 4326)::geography, '+91-11-23010101'),
        ('Connaught Place Police Station', ST_SetSRID(ST_MakePoint(77.2183, 28.6304), 4326)::geography, '+91-11-23010102'),
        ('Saket Police Station', ST_SetSRID(ST_MakePoint(77.2082, 28.5221), 4326)::geography, '+91-11-23010103'),
        
        -- Bengaluru
        ('Bengaluru Commissionerate Cyber Crime Station', ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326)::geography, '+91-80-22942222'),
        ('Koramangala Police Station', ST_SetSRID(ST_MakePoint(77.6244, 12.9352), 4326)::geography, '+91-80-22942223'),
        ('Indiranagar Police Station', ST_SetSRID(ST_MakePoint(77.6387, 12.9784), 4326)::geography, '+91-80-22942224'),
        
        -- Hyderabad
        ('Hyderabad Cyber Crime Station (CCS)', ST_SetSRID(ST_MakePoint(78.4867, 17.3850), 4326)::geography, '+91-40-27852435'),
        ('Secunderabad Police Station', ST_SetSRID(ST_MakePoint(78.5022, 17.4399), 4326)::geography, '+91-40-27852436'),
        
        -- Pune
        ('Pune Cyber Cell HQ (Shivajinagar)', ST_SetSRID(ST_MakePoint(73.8567, 18.5204), 4326)::geography, '+91-20-26208299'),
        ('Koregaon Park Police Station', ST_SetSRID(ST_MakePoint(73.8906, 18.5362), 4326)::geography, '+91-20-26208300'),
        
        -- Kolkata
        ('Kolkata Cyber Police Station (Lalbazar)', ST_SetSRID(ST_MakePoint(88.3639, 22.5726), 4326)::geography, '+91-33-22143000'),
        ('Salt Lake Cyber Crime Cell', ST_SetSRID(ST_MakePoint(88.4277, 22.5851), 4326)::geography, '+91-33-22143001');
      `);
      console.log("Successfully seeded police stations.");
    }
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await pool.end();
  }
}

run();
