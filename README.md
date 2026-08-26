# CashTrace AI — Predictive Cybercrime Intervention Platform

CashTrace AI is an MVP core build developed for the Smart India Hackathon (Problem Statement: **SIH26184 — Ministry of Home Affairs**). It ingests real-time citizen cybercrime complaints, links suspicious transaction flows into mule account clusters, computes active cash-withdrawal risk scores, and visualizes them on a live command-center map with countdown-based urgency timelines for law enforcement dispatch.

---

## 🏗️ Monorepo Structure

```bash
├── database/
│   └── migration.sql      # Postgres + PostGIS DB schema migration
├── backend/
│   ├── Dockerfile         # Node.js backend Docker deployment configuration
│   ├── package.json       # Express & Socket.IO dependencies
│   └── server.js          # REST Ingestion & Geocoding API + websocket handler
├── ml-service/
│   ├── Dockerfile         # Python environment configuration
│   ├── requirements.txt   # Python client libraries (Faker, psycopg2)
│   └── seed.py            # Synthetic dataset generator & database populator
├── frontend/
│   ├── package.json       # Vite & React dependencies
│   ├── tailwind.config.js # Command Center custom dark theme setup
│   ├── vite.config.ts     # Vite compilation rules
│   └── src/
│       ├── main.tsx       # React mounting
│       ├── App.tsx        # Command Center Dashboard & react-leaflet map
│       └── index.css      # Custom dark-theme map styles and animations
├── docker-compose.yml     # Local Postgres container + services deployment
└── README.md              # Documentation
```

---

## 🛠️ Prerequisites

Before running CashTrace AI locally, make sure you have the following installed:
- **Node.js** (v18.x or later)
- **npm** (v9.x or later)
- **Python** (v3.10 or later - optional, if running seed script without Docker)
- **Docker** and **Docker Compose**

---

## 🚀 Getting Started

You can spin up the database and backend automatically using Docker, or run all components manually.

### Option A: Running with Docker Compose (Recommended)

1. **Start the database and backend services:**
   ```bash
   docker-compose up --build
   ```
   This will spin up:
   * **PostgreSQL + PostGIS** database on port `5432`
   * **Node.js Express backend** on port `5000` (after database health check passes)
   * **ML seed generator**, which runs once, runs the migrations, seeds ~500 complaints, ~150 accounts, transactions, and ~50 ATMs, and then exits.

2. **Start the React Frontend:**
   In a new terminal window:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

### Option B: Running Manually (Without Docker Compose)

#### 1. Database Setup
Create a PostgreSQL database and enable the PostGIS extension. You can use a free cloud provider like **Supabase** or run a local instance:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
```
Apply all SQL tables by importing the [database/migration.sql](file:///c:/Users/Jagan/OneDrive/Desktop/sih%20cyclone/cyber%20pro/database/migration.sql) script in your Postgres console.

#### 2. Seed the Database
Create a `.env` file in the `ml-service/` folder with your connection string:
```env
DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<dbname>
```
Install dependencies and execute the seeder:
```bash
cd ml-service
pip install -r requirements.txt
python seed.py
```

#### 3. Run the Backend API
Create a `.env` file in the `backend/` folder:
```env
DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<dbname>
PORT=5000
```
Install packages and start the dev server:
```bash
cd backend
npm install
npm run dev
```

#### 4. Run the Frontend App
Create a `.env` file in the `frontend/` folder:
```env
VITE_BACKEND_URL=http://localhost:5000
```
Start the Vite dev server:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## ⚡ End-to-End Demo Verification Walkthrough

1. **Verify the Live Map**: Upon opening the application, you will see a command center dark map indicating active withdrawal alerts clustered around major Indian cities (e.g. Delhi, Mumbai, Bengaluru).
2. **Review Urgency Timelines**: The left sidebar ranks predicted withdrawals in descending order of calculated risk. Look at the countdown timers; they represent the predicted cashout windows and will update color dynamically:
   * **Green**: Safe intercept buffer (> 2 hours remaining)
   * **Amber**: Approaching cashout (1 - 2 hours remaining)
   * **Red**: Immediate threat (< 1 hour remaining)
3. **Simulate a Live Cybercrime Incident**:
   * Click **Quick Simulate** in the header.
   * This generates a synthetic incident targeting a mule account, geocodes the victim location using OSM Nominatim, and inserts the data.
   * The backend instantly recalculates predictions, triggers the Socket.IO event, and you'll see a **critical alert toast notification** on the screen.
   * The active queue updates in real-time, placing the new risk card at the top, and a pulsing circle appears on the map.
4. **Dispatch Tactical Units**:
   * Click on any prediction card. The map will draw a dotted polyline connecting the victim's location to the target ATM withdrawal point.
   * Click **Dispatch Intercept Unit** in the detail brief panel.
   * An action record will instantly feed into the **Tactical Log Feed** log console at the bottom-left.

---

## 🛡️ Heuristic Score Formula

Predictions are generated dynamically using the following threat logic:

$$\text{Risk Score} = \left( \frac{1}{\max(\text{Hours Since Last Txn}, 0.1)} \right) \times \left( \frac{1}{1 + \text{Distance to ATM (km)}} \right)$$

This penalizes predictions where transaction reports have grown cold and filters predictions that do not locate close to ATMs (within a default 15km intercept radius).
