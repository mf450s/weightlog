export interface WeightEntry {
  id: number;
  date: string; // YYYY-MM-DD
  weight: number;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface Stats {
  total_entries: number;
  first_date: string | null;
  last_date: string | null;
  min_weight: number | null;
  max_weight: number | null;
  avg_weight: number | null;
  latest_weight: number | null;
  weight_change: number | null;
  bmi: number | null;
  target_weight: number | null;
  target_progress_pct: number | null;
}

export interface Settings {
  height_cm: number | null;
  target_weight: number | null;
  unit: "kg" | "lbs";
}

export type Theme = "dark" | "light";
