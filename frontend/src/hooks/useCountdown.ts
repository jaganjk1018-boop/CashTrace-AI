// src/hooks/useCountdown.ts
//
// Returns the remaining time until `targetIso`, updating every second,
// plus an urgency level used to color the countdown (green/amber/red).

import { useEffect, useState } from "react";

export type Urgency = "safe" | "warning" | "critical" | "expired";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Expired";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function getUrgency(ms: number): Urgency {
  if (ms <= 0) return "expired";
  const minutesLeft = ms / 60000;
  if (minutesLeft <= 15) return "critical";
  if (minutesLeft <= 60) return "warning";
  return "safe";
}

export function useCountdown(targetIso: string) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [targetIso]);

  const remainingMs = new Date(targetIso).getTime() - now;

  return {
    label: formatRemaining(remainingMs),
    urgency: getUrgency(remainingMs),
    remainingMs,
  };
}
