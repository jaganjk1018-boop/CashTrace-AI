"""
CashTrace AI — Synthetic Data Seed Script
Generates ~500 realistic complaints, mule accounts (with reuse patterns),
transactions, and withdrawal points, then inserts them into Supabase Postgres.

SETUP:
  pip install faker psycopg2-binary python-dotenv

USAGE:
  1. Create a `.env` file in the same folder as this script with:
       DATABASE_URL=postgresql://postgres.xxxx:YOUR_PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
  2. Run:  python seed.py
"""

import os
import random
import uuid
from datetime import datetime, timedelta

import psycopg2
from faker import Faker
from dotenv import load_dotenv

load_dotenv()
fake = Faker("en_IN")  # Indian locale for realistic names

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise SystemExit("ERROR: Set DATABASE_URL in a .env file before running this script.")

# Indian cities with approximate lat/long (used to cluster mule activity realistically)
CITIES = [
    ("Chennai", 13.0827, 80.2707),
    ("Mumbai", 19.0760, 72.8777),
    ("Delhi", 28.7041, 77.1025),
    ("Bengaluru", 12.9716, 77.5946),
    ("Hyderabad", 17.3850, 78.4867),
    ("Pune", 18.5204, 73.8567),
    ("Kolkata", 22.5726, 88.3639),
    ("Ahmedabad", 23.0225, 72.5714),
    ("Jaipur", 26.9124, 75.7873),
    ("Lucknow", 26.8467, 80.9462),
    ("Kochi", 9.9312, 76.2673),
    ("Coimbatore", 11.0168, 76.9558),
]

BANKS = ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Punjab National Bank",
         "Bank of Baroda", "Canara Bank", "Kotak Mahindra Bank", "IDBI Bank", "Union Bank of India"]

N_COMPLAINTS = 500
N_ACCOUNTS = 150
N_MULE_ACCOUNTS = 30       # subset of accounts deliberately reused across complaints
N_WITHDRAWAL_POINTS = 50


def jitter(lat, lng, km_radius=15):
    """Small random offset so points aren't stacked exactly on the city center."""
    delta = km_radius / 111.0  # rough km-to-degree conversion
    return lat + random.uniform(-delta, delta), lng + random.uniform(-delta, delta)


def random_ifsc():
    bank_code = fake.lexify(text="????").upper()
    return f"{bank_code}0{random.randint(100000, 999999)}"


def run_migrations(conn):
    print("Running migrations...")
    migration_path = os.path.join(os.path.dirname(__file__), "..", "database", "migration.sql")
    if not os.path.exists(migration_path):
        print(f"Migration file not found at {migration_path}, skipping migration step.")
        return
    with open(migration_path, "r") as f:
        sql = f.read()
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
    print("Migrations run successfully.")


def main():
    conn = psycopg2.connect(DATABASE_URL)
    run_migrations(conn)
    cur = conn.cursor()

    print("Clearing existing demo data (if any)...")
    cur.execute("TRUNCATE action_log, predictions, transactions, withdrawal_points, accounts, complaints CASCADE;")

    # -------------------------------------------------------------
    # 1. Generate accounts (a mix of normal + flagged mule accounts)
    # -------------------------------------------------------------
    print(f"Generating {N_ACCOUNTS} accounts ({N_MULE_ACCOUNTS} marked as mule)...")
    accounts = []
    mule_account_numbers = []

    for i in range(N_ACCOUNTS):
        is_mule = i < N_MULE_ACCOUNTS
        account_id = str(uuid.uuid4())
        account_number = fake.numerify(text="##########")
        ifsc = random_ifsc()
        bank_name = random.choice(BANKS)
        first_seen = fake.date_time_between(start_date="-180d", end_date="-1d")
        
        # Risk score is initialized higher for mule accounts so the prediction engine
        # computes correct risk values (> 0.70) for alerts.
        risk_score = round(random.uniform(0.70, 0.95), 2) if is_mule else 0.0

        accounts.append((account_id, account_number, ifsc, bank_name, first_seen, risk_score, is_mule))
        if is_mule:
            mule_account_numbers.append(account_number)

    cur.executemany(
        """INSERT INTO accounts (id, account_number, ifsc, bank_name, first_seen, risk_score, is_flagged_mule)
           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
        accounts,
    )

    # -------------------------------------------------------------
    # 2. Generate withdrawal points (ATMs/branches), clustered near cities
    # -------------------------------------------------------------
    print(f"Generating {N_WITHDRAWAL_POINTS} withdrawal points...")
    withdrawal_points = []
    for _ in range(N_WITHDRAWAL_POINTS):
        city, lat, lng, = random.choice(CITIES)
        wlat, wlng = jitter(lat, lng, km_radius=10)
        wp_id = str(uuid.uuid4())
        name = f"{random.choice(BANKS)} {random.choice(['ATM', 'Branch'])} - {city} {fake.street_name()}"
        wp_type = random.choice(["ATM", "ATM", "ATM", "Branch"])  # ATMs more common
        withdrawal_points.append((wp_id, name, wlng, wlat, random.choice(BANKS), wp_type))

    cur.executemany(
        """INSERT INTO withdrawal_points (id, name, location, bank_name, type)
           VALUES (%s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s, %s)""",
        [(wp[0], wp[1], wp[2], wp[3], wp[4], wp[5]) for wp in withdrawal_points],
    )

    # -------------------------------------------------------------
    # 3. Generate complaints (victims), each near a random city
    # -------------------------------------------------------------
    print(f"Generating {N_COMPLAINTS} complaints...")
    complaints = []
    for i in range(N_COMPLAINTS):
        city, lat, lng = random.choice(CITIES)
        vlat, vlng = jitter(lat, lng, km_radius=20)
        complaint_id = str(uuid.uuid4())
        complaint_number = f"NCRP{2026}{100000 + i}"
        victim_name = fake.name()
        victim_bank = random.choice(BANKS)
        amount_lost = round(random.uniform(5000, 500000), 2)
        
        # To make sure we have active predictions right away, let's make some complaints
        # extremely recent (within the last 2 hours).
        if i < 15:
            reported_at = datetime.now() - timedelta(minutes=random.randint(10, 110))
        else:
            reported_at = fake.date_time_between(start_date="-30d", end_date="now")
            
        status = random.choice(["open", "open", "open", "investigating", "closed"])

        complaints.append((complaint_id, complaint_number, victim_name, victim_bank,
                            vlng, vlat, amount_lost, reported_at, status))

    cur.executemany(
        """INSERT INTO complaints (id, complaint_number, victim_name, victim_bank, victim_location, amount_lost, reported_at, status)
           VALUES (%s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s, %s, %s)""",
        [(c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7], c[8]) for c in complaints],
    )

    # -------------------------------------------------------------
    # 4. Generate transactions — deliberately reuse mule accounts
    #    across multiple complaints to create real graph patterns.
    # -------------------------------------------------------------
    print("Generating transactions with mule reuse patterns...")
    transactions = []
    for complaint in complaints:
        complaint_id, _, _, _, _, _, amount_lost, reported_at, _ = complaint

        # 80% of complaints route through a mule account (realistic mule concentration)
        if random.random() < 0.8:
            to_account = random.choice(mule_account_numbers)
        else:
            to_account = random.choice([a[1] for a in accounts])

        from_account = random.choice([a[1] for a in accounts if a[1] != to_account])

        # Time-lag: mule accounts cash out fast — minutes to a few hours after receiving funds
        lag_minutes = random.randint(15, 240)
        txn_time = reported_at + timedelta(minutes=lag_minutes)

        transactions.append((str(uuid.uuid4()), complaint_id, from_account, to_account, amount_lost, txn_time))

    cur.executemany(
        """INSERT INTO transactions (id, complaint_id, from_account, to_account, amount, txn_time)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        transactions,
    )

    conn.commit()

    # -------------------------------------------------------------
    # Summary
    # -------------------------------------------------------------
    cur.execute("SELECT COUNT(*) FROM complaints;")
    n_complaints = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM accounts WHERE is_flagged_mule = true;")
    n_mules = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM transactions;")
    n_txns = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM withdrawal_points;")
    n_wp = cur.fetchone()[0]

    print("\n[SUCCESS] Seed complete!")
    print(f"   Complaints:        {n_complaints}")
    print(f"   Accounts (mule):   {n_mules}")
    print(f"   Transactions:      {n_txns}")
    print(f"   Withdrawal points: {n_wp}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
