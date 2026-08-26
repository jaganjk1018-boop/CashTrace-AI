// src/routes/predictions.js
import express from "express";
import { computeActivePredictions } from "../services/predictionEngine.js";

// Factory so we can hand this route access to the shared Socket.IO instance.
export default function createPredictionsRouter(io) {
  const router = express.Router();

  // GET /api/predictions/active
  router.get("/active", async (req, res) => {
    try {
      const predictions = await computeActivePredictions(10);
      res.json(predictions);
    } catch (err) {
      console.error("Error computing predictions:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
