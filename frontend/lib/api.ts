import { Platform } from "react-native";
import { WeightEntry, Stats, Settings } from "./types";

// Android emulator uses 10.0.2.2 to reach host localhost
// iOS simulator can use localhost directly
const BASE_URL = Platform.select({
  android: "http://10.0.2.2:8001",
  ios: "http://localhost:8001",
  default: "http://localhost:8001",
});

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Entries ──────────────────────────────────────

export async function fetchEntries(): Promise<WeightEntry[]> {
  return request<WeightEntry[]>("/api/entries");
}

export async function createEntry(date: string, weight: number, note = ""): Promise<WeightEntry> {
  return request<WeightEntry>("/api/entries", {
    method: "POST",
    body: JSON.stringify({ date, weight, note }),
  });
}

export async function upsertEntry(date: string, weight: number, note = ""): Promise<WeightEntry> {
  return request<WeightEntry>(`/api/entries/by-date/${date}`, {
    method: "PUT",
    body: JSON.stringify({ date, weight, note }),
  });
}

export async function deleteEntry(id: number): Promise<void> {
  return request<void>(`/api/entries/${id}`, { method: "DELETE" });
}

// ── Stats ────────────────────────────────────────

export async function fetchStats(): Promise<Stats> {
  return request<Stats>("/api/stats");
}

// ── Settings ─────────────────────────────────────

export async function fetchSettings(): Promise<Settings> {
  return request<Settings>("/api/settings");
}

export async function updateSettings(settings: Settings): Promise<Settings> {
  return request<Settings>("/api/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}
