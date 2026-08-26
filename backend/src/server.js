// src/server.js
import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server as SocketIOServer } from "socket.io";

import createComplaintsRouter from "./routes/complaints.js";
import createPredictionsRouter from "./routes/predictions.js";
import graphRouter from "./routes/graph.js";
import aiRouter from "./routes/ai.js";
import actionlogRouter from "./routes/actionlog.js";
import { computeActivePredictions } from "./services/predictionEngine.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: "*" }, // fine for hackathon demo; tighten for production
});

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/complaints", createComplaintsRouter(io));
app.use("/api/predictions", createPredictionsRouter(io));
app.use("/api/graph", graphRouter);
app.use("/api/ai", aiRouter);
app.use("/api/actionlog", actionlogRouter);

app.get("/", (req, res) => {
  res.json({ status: "CashTrace AI backend running" });
});

io.on("connection", async (socket) => {
  console.log(`Officer dashboard connected: ${socket.id}`);
  
  try {
    const initialPredictions = await computeActivePredictions(10);
    socket.emit("initial_predictions", initialPredictions);
  } catch (err) {
    console.error("Error pushing initial predictions on connection:", err);
  }

  socket.on("disconnect", () => {
    console.log(`Officer dashboard disconnected: ${socket.id}`);
  });
});

// Periodically recompute predictions and push to all connected dashboards,
// so the countdown/risk list stays live even if no one hits the REST endpoint.
const REFRESH_INTERVAL_MS = 15000; // 15 seconds — good balance for a live demo
setInterval(async () => {
  try {
    const predictions = await computeActivePredictions(10);
    io.emit("new_prediction", predictions);
  } catch (err) {
    console.error("Error in periodic prediction refresh:", err);
  }
}, REFRESH_INTERVAL_MS);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`CashTrace AI backend listening on port ${PORT}`);
});
