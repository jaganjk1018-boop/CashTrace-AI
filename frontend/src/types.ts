// src/types.ts

export interface ExplanationFactor {
  label: string;
  detail: string;
  weight_pct: number;
}

export interface Explanation {
  summary: string;
  factors: ExplanationFactor[];
}

export interface Prediction {
  account_id: string;
  complaint_id: string; // Added complaint_id relation link
  account_number: string;
  mule_bank_name: string;
  victim_bank: string;
  last_amount: number;
  txn_count: number;
  withdrawal_point_id: string;
  withdrawal_point_name: string;
  withdrawal_bank_name: string;
  location: { lat: number; lng: number };
  distance_km: number;
  probability: number; // 0-1
  explanation: Explanation;
  predicted_window_start: string; // ISO date
  predicted_window_end: string; // ISO date
  is_expired: boolean;
  victim_location?: { lat: number; lng: number }; // Optional polyline coordinate
}
