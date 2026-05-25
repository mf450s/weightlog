import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../lib/colors";
import { WeightEntry, Stats } from "../lib/types";
import { getLocalEntries, getLocalSettings } from "../lib/storage";
import { fetchEntries, fetchStats, upsertEntry } from "../lib/api";
import { BigNumber, Card, StatPill, WeightInput, ActionButton } from "../components/ui";

const c = Colors.dark;

export default function HomeScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [weightInput, setWeightInput] = useState("");
  const [note, setNote] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unit, setUnit] = useState("kg");

  const today = new Date().toISOString().split("T")[0];
  const todayEntry = entries.find((e) => e.date === today);

  const loadData = useCallback(async () => {
    try {
      const [localEntries, localSettings] = await Promise.all([
        getLocalEntries(),
        getLocalSettings(),
      ]);
      setEntries(localEntries);
      setUnit(localSettings.unit);

      // Try API sync in background
      try {
        const [apiEntries, apiStats] = await Promise.all([
          fetchEntries(),
          fetchStats(),
        ]);
        setEntries(apiEntries);
        setStats(apiStats);
        setUnit((await getLocalSettings()).unit);
      } catch {
        // Offline — compute stats locally
        if (localEntries.length > 0) {
          const weights = localEntries.map((e) => e.weight);
          setStats({
            total_entries: localEntries.length,
            first_date: localEntries[localEntries.length - 1].date,
            last_date: localEntries[0].date,
            min_weight: Math.min(...weights),
            max_weight: Math.max(...weights),
            avg_weight: Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10,
            latest_weight: localEntries[0].weight,
            weight_change: localEntries.length >= 2
              ? Math.round((localEntries[0].weight - localEntries[localEntries.length - 1].weight) * 10) / 10
              : null,
            bmi: null,
            target_weight: localSettings.target_weight,
            target_progress_pct: null,
          });
        }
      }

      if (todayEntry) setWeightInput(String(todayEntry.weight));
    } catch (e) {
      console.error("Load error:", e);
    }
  }, [todayEntry?.date]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSave = async () => {
    const w = parseFloat(weightInput);
    if (!w || w <= 0 || w > 500) return;
    setSaving(true);
    try {
      await upsertEntry(today, w, note);
      await loadData();
      setNote("");
    } catch {
      // Save locally as fallback
      const localEntry: WeightEntry = {
        id: todayEntry?.id ?? Date.now(),
        date: today,
        weight: w,
        note,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const all = entries.filter((e) => e.date !== today);
      all.unshift(localEntry);
      setEntries(all);
      setNote("");
      setWeightInput("");
      await (await import("../lib/storage")).saveLocalEntries(all);
    }
    setSaving(false);
  };

  const convertWeight = (kg: number) => unit === "lbs" ? Math.round(kg * 2.2046 * 10) / 10 : kg;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>WeightLog</Text>
          <View style={styles.headerIcons}>
            <Ionicons
              name="bar-chart-outline"
              size={22}
              color={c.textDim}
              style={{ marginRight: 16 }}
              onPress={() => router.push("/history")}
            />
            <Ionicons
              name="settings-outline"
              size={22}
              color={c.textDim}
              onPress={() => router.push("/settings")}
            />
          </View>
        </View>

        {/* Current weight display */}
        <Card style={styles.weightCard}>
          {todayEntry ? (
            <BigNumber
              value={convertWeight(todayEntry.weight)}
              unit={unit}
              subtitle={`Today · ${today}`}
            />
          ) : stats?.latest_weight ? (
            <BigNumber
              value={convertWeight(stats.latest_weight)}
              unit={unit}
              subtitle={`Last entry · ${stats.last_date}`}
            />
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <Text style={{ color: c.accent, fontSize: 48, marginBottom: 8 }}>⚖️</Text>
              <Text style={{ color: c.textDim, fontSize: 16 }}>
                No entries yet. Start tracking.
              </Text>
            </View>
          )}
        </Card>

        {/* Stats row */}
        {stats && stats.total_entries > 0 && (
          <Card style={styles.statsCard}>
            <View style={styles.statsRow}>
              <StatPill
                label={stats.total_entries === 1 ? "Entry" : "Entries"}
                value={String(stats.total_entries)}
              />
              <StatPill
                label={unit === "lbs" ? "Δ lbs" : "Δ kg"}
                value={
                  stats.weight_change !== null
                    ? (stats.weight_change > 0 ? "+" : "") + convertWeight(Math.abs(stats.weight_change))
                    : "—"
                }
                color={
                  stats.target_weight && stats.weight_change !== null
                    ? (stats.weight_change > 0
                        ? (stats.latest_weight! < stats.target_weight ? c.accent : c.accent2)
                        : stats.latest_weight! > stats.target_weight ? c.accent : c.accent2)
                    : undefined
                }
              />
              <StatPill
                label="BMI"
                value={stats.bmi ? String(stats.bmi) : "—"}
              />
              {stats.target_weight && (
                <StatPill
                  label="Target"
                  value={`${convertWeight(stats.target_weight)} ${unit}`}
                  color={c.accent3}
                />
              )}
            </View>
            {stats.target_progress_pct !== null && (
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, Math.abs(stats.target_progress_pct))}%` },
                  ]}
                />
                <Text style={styles.progressText}>
                  {stats.target_progress_pct > 0 ? `${stats.target_progress_pct}% to target` : "Just started"}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Quick entry */}
        <Card>
          <Text style={styles.sectionTitle}>
            {todayEntry ? "Update today's weight" : "Log today's weight"}
          </Text>
          <WeightInput value={weightInput} onChange={setWeightInput} />
          <ActionButton
            label={saving ? "Saving..." : todayEntry ? "Update" : "Log Weight"}
            onPress={handleSave}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: "800", color: c.text },
  headerIcons: { flexDirection: "row" },
  weightCard: { marginBottom: 12, paddingVertical: 24 },
  statsCard: { marginBottom: 12 },
  statsRow: { flexDirection: "row", justifyContent: "space-around" },
  progressBar: {
    height: 6,
    backgroundColor: c.surface2,
    borderRadius: 3,
    marginTop: 16,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: c.accent,
    borderRadius: 3,
  },
  progressText: {
    color: c.textDim,
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },
  sectionTitle: {
    color: c.textDim,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
});
