import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { Colors } from "../lib/colors";
import { WeightEntry } from "../lib/types";
import { getLocalEntries, saveLocalEntries, removeLocalEntry } from "../lib/storage";
import { fetchEntries, deleteEntry } from "../lib/api";
import { WeightChart } from "../components/WeightChart";
import { Card } from "../components/ui";

const c = Colors.dark;
const DAYS = [7, 30, 90, 365];

export default function HistoryScreen() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [days, setDays] = useState(30);

  useEffect(() => {
    (async () => {
      const local = await getLocalEntries();
      setEntries(local);
      try {
        const api = await fetchEntries();
        setEntries(api);
      } catch {}
    })();
  }, []);

  const handleDelete = (entry: WeightEntry) => {
    Alert.alert("Delete entry?", `${entry.date} — ${entry.weight} kg`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteEntry(entry.id);
          } catch {}
          await removeLocalEntry(entry.id);
          setEntries((prev) => prev.filter((e) => e.id !== entry.id));
        },
      },
    ]);
  };

  if (entries.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={c.text} />
          </TouchableOpacity>
          <Text style={styles.title}>History</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: c.textDim, fontSize: 16 }}>No entries yet</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={styles.title}>History</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Time range selector */}
      <View style={styles.rangeRow}>
        {DAYS.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.rangeBtn, days === d && styles.rangeBtnActive]}
            onPress={() => setDays(d)}
          >
            <Text
              style={[
                styles.rangeText,
                days === d && styles.rangeTextActive,
              ]}
            >
              {d === 365 ? "1Y" : `${d}D`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart */}
      <Card style={{ marginHorizontal: 16, marginBottom: 12 }}>
        <WeightChart entries={entries} days={days} />
      </Card>

      {/* Entry list */}
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {entries
          .filter((e) => {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            return e.date >= cutoff.toISOString().split("T")[0];
          })
          .map((entry, i) => {
            const prev =
              i < entries.length - 1 ? entries[i + 1]?.weight : null;
            const diff = prev !== null ? entry.weight - prev : null;

            return (
              <View key={entry.id} style={styles.entryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryDate}>
                    {format(parseISO(entry.date), "EEE, dd MMM yyyy")}
                  </Text>
                  {entry.note ? (
                    <Text style={styles.entryNote}>{entry.note}</Text>
                  ) : null}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.entryWeight}>{entry.weight} kg</Text>
                  {diff !== null && diff !== 0 && (
                    <Text
                      style={{
                        color: diff < 0 ? c.accent : c.accent2,
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      {diff > 0 ? "+" : ""}
                      {diff.toFixed(1)} kg
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={{ marginLeft: 10 }}
                  onPress={() => handleDelete(entry)}
                >
                  <Ionicons name="trash-outline" size={16} color={c.textDim} />
                </TouchableOpacity>
              </View>
            );
          })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: "700", color: c.text },
  rangeRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  rangeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: c.surface,
  },
  rangeBtnActive: { backgroundColor: c.accent },
  rangeText: { color: c.textDim, fontSize: 14, fontWeight: "600" },
  rangeTextActive: { color: "#0A0A0A" },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  entryDate: { color: c.text, fontSize: 15, fontWeight: "500" },
  entryNote: { color: c.textDim, fontSize: 12, marginTop: 2 },
  entryWeight: { color: c.text, fontSize: 18, fontWeight: "700" },
});
