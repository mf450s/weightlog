import AsyncStorage from "@react-native-async-storage/async-storage";
import { WeightEntry, Settings } from "./types";

const ENTRIES_KEY = "weightlog_entries";
const SETTINGS_KEY = "weightlog_settings";
const QUEUE_KEY = "weightlog_sync_queue";

// ── Entries ────────────────────────────────────

export async function getLocalEntries(): Promise<WeightEntry[]> {
  const raw = await AsyncStorage.getItem(ENTRIES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveLocalEntries(entries: WeightEntry[]): Promise<void> {
  // Keep only latest 2 years locally for performance
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 2);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const trimmed = entries.filter((e) => e.date >= cutoffStr);
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(trimmed));
}

export async function addLocalEntry(entry: WeightEntry): Promise<void> {
  const entries = await getLocalEntries();
  const idx = entries.findIndex((e) => e.date === entry.date);
  if (idx >= 0) entries[idx] = entry;
  else entries.unshift(entry);
  entries.sort((a, b) => b.date.localeCompare(a.date));
  await saveLocalEntries(entries);
}

export async function removeLocalEntry(id: number): Promise<void> {
  const entries = await getLocalEntries();
  await saveLocalEntries(entries.filter((e) => e.id !== id));
}

// ── Settings ────────────────────────────────────

export async function getLocalSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  return raw
    ? JSON.parse(raw)
    : { height_cm: null, target_weight: null, unit: "kg" };
}

export async function saveLocalSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ── Sync Queue (offline-first) ──────────────────

interface QueuedAction {
  id: string;
  type: "create" | "update" | "delete";
  date?: string;
  weight?: number;
  note?: string;
  entryId?: number;
  timestamp: number;
}

export async function getSyncQueue(): Promise<QueuedAction[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addToQueue(action: Omit<QueuedAction, "id" | "timestamp">) {
  const queue = await getSyncQueue();
  queue.push({ ...action, id: Math.random().toString(36).slice(2), timestamp: Date.now() });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
