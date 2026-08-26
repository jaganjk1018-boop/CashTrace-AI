// src/hooks/usePredictions.ts
//
// Connects to the backend's Socket.IO server and keeps a live list of
// active predictions in state. Falls back to a one-time REST fetch on
// mount so the UI isn't empty while waiting for the first socket push.

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { Prediction } from "../types";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

let socket: Socket | null = null;

export function usePredictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [connected, setConnected] = useState(false);
  const [latestPrediction, setLatestPrediction] = useState<Prediction | null>(null);

  useEffect(() => {
    // Initial fetch so the map/list has data immediately.
    fetch(`${BACKEND_URL}/api/predictions/active`)
      .then((res) => res.json())
      .then((data) => setPredictions(data))
      .catch((err) => console.error("Initial predictions fetch failed:", err));

    if (!socket) {
      socket = io(BACKEND_URL);
    }

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    
    // Support both single-object pushes and complete array updates
    socket.on("new_prediction", (data: Prediction | Prediction[]) => {
      if (Array.isArray(data)) {
        setPredictions(data);
        if (data.length > 0) {
          setLatestPrediction(data[0]);
        }
      } else {
        setLatestPrediction(data);
        setPredictions((prev) => {
          // Avoid duplicate predictions for the same account
          const filtered = prev.filter((p) => p.account_number !== data.account_number);
          const updated = [data, ...filtered];
          // Keep top 10 ranked by probability
          return updated
            .sort((a, b) => b.probability - a.probability)
            .slice(0, 10);
        });
      }
    });

    // Handle initial predictions push from server on connection
    socket.on("initial_predictions", (data: Prediction[]) => {
      setPredictions(data);
    });

    return () => {
      socket?.off("new_prediction");
      socket?.off("initial_predictions");
      socket?.off("connect");
      socket?.off("disconnect");
    };
  }, []);

  return { predictions, connected, latestPrediction };
}
