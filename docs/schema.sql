-- CashTrace AI — Full Database Schema
-- Run this in the Supabase SQL Editor (or any Postgres instance with PostGIS).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Complaints Table
CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_number VARCHAR(100) UNIQUE NOT NULL,
  victim_name VARCHAR(255),
  victim_bank VARCHAR(100),
  victim_location GEOGRAPHY(POINT, 4326),
  amount_lost NUMERIC(15, 2),
  reported_at TIMESTAMPTZ DEFAULT now(),
  status VARCHAR(50) DEFAULT 'open'
);

-- Create a spatial index for faster geographical search on complaints
CREATE INDEX IF NOT EXISTS complaints_location_idx ON complaints USING gist(victim_location);

-- 2. Accounts Table
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number VARCHAR(100) UNIQUE NOT NULL,
  ifsc VARCHAR(20),
  bank_name VARCHAR(100),
  first_seen TIMESTAMPTZ,
  risk_score NUMERIC(5, 2) DEFAULT 0,
  is_flagged_mule BOOLEAN DEFAULT false
);

-- 3. Transactions Table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
  from_account VARCHAR(100) NOT NULL,
  to_account VARCHAR(100) REFERENCES accounts(account_number) ON DELETE CASCADE,
  amount NUMERIC(15, 2),
  txn_time TIMESTAMPTZ
);

-- 4. Withdrawal Points Table
CREATE TABLE withdrawal_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  location GEOGRAPHY(POINT, 4326),
  bank_name VARCHAR(100),
  type VARCHAR(50) CHECK (type IN ('ATM', 'Branch'))
);

-- Create spatial index on withdrawal points
CREATE INDEX IF NOT EXISTS withdrawal_points_location_idx ON withdrawal_points USING gist(location);

-- 5. Predictions Table
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  withdrawal_point_id UUID REFERENCES withdrawal_points(id) ON DELETE CASCADE,
  probability NUMERIC(5, 2),
  predicted_window_start TIMESTAMPTZ,
  predicted_window_end TIMESTAMPTZ,
  explanation JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Action Log Table
CREATE TABLE action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
  officer_id VARCHAR(100),
  action_type VARCHAR(100),
  payload JSONB,
  prev_hash VARCHAR(64),
  curr_hash VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT now()
);
