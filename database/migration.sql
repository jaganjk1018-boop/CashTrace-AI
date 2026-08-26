-- CashTrace AI Database Schema Migration
-- Enables PostGIS extension for spatial/geographical queries
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Drop tables in reverse dependency order to prevent constraint issues
DROP TABLE IF EXISTS action_log CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS withdrawal_points CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;

-- 1. Complaints Table
CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_number VARCHAR(100) NOT NULL UNIQUE,
    victim_name VARCHAR(255) NOT NULL,
    victim_bank VARCHAR(100) NOT NULL,
    victim_location GEOGRAPHY(POINT, 4326) NOT NULL,
    amount_lost NUMERIC(15, 2) NOT NULL,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'reported',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create a spatial index for faster geographical search on complaints
CREATE INDEX complaints_location_idx ON complaints USING gist(victim_location);

-- 2. Accounts Table
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_number VARCHAR(100) NOT NULL UNIQUE,
    ifsc VARCHAR(20) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    first_seen TIMESTAMPTZ NOT NULL,
    risk_score NUMERIC(5, 2) DEFAULT 0.00,
    is_flagged_mule BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Transactions Table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
    from_account VARCHAR(100) NOT NULL,
    to_account VARCHAR(100) REFERENCES accounts(account_number) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    txn_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Withdrawal Points Table
CREATE TABLE withdrawal_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ATM', 'Branch')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create spatial index on withdrawal points
CREATE INDEX withdrawal_points_location_idx ON withdrawal_points USING gist(location);

-- 5. Predictions Table
CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    withdrawal_point_id UUID REFERENCES withdrawal_points(id) ON DELETE CASCADE,
    probability NUMERIC(5, 2) NOT NULL,
    predicted_window_start TIMESTAMPTZ NOT NULL,
    predicted_window_end TIMESTAMPTZ NOT NULL,
    explanation JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Action Log Table
CREATE TABLE action_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL,
    officer_id VARCHAR(100) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    payload JSONB,
    prev_hash VARCHAR(64),
    curr_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
