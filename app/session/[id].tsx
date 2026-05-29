import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors as c } from "../../lib/colors";
import type { SessionSet, ExerciseRead } from "../../lib/types";
import { getSession, listSessionSets, listExercises, deleteSessionSet, deleteSession } from "../../lib/api";
import { Card, Section, StatRow, Badge } from "../../components/ui";

export default function SessionDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sets, setSets] = useState<SessionSet[]>([]);
  const [exercises, setExercises] = useState<ExerciseRead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, exs] = await Promise.all([
          listSessionSets(Number(id)),
          listExercises(),
        ]);
        setSets(s.sort((a, b) => a.set_number - b.set_number));
        setExercises(exs);
      } catch {}
      setLoading(false);
    })();
  }, [id]);

  // Group by exercise
  const grouped = new Map<number, SessionSet[]>();
  for (const s of sets) {
    const exId = s.exercise_id ?? 0;
    if (!grouped.has(exId)) grouped.set(exId, []);
    grouped.get(exId)!.push(s);
  }

  const getExName = (exId: number | null) => exercises.find((e) => e.id === exId)?.name ?? "Unknown";

  const totalSets = sets.length;
  const totalVolume = sets
    .filter((s) => s.weight_kg != null && s.reps != null)
    .reduce((sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: c.textDim }}>Loading...</Text>
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
        <Text style={styles.title}>Session</Text>
        <TouchableOpacity
          onPress={() => {
            Alert.alert("Delete Session?", "This cannot be undone.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                  await deleteSession(Number(id));
                  router.back();
                },
              },
            ]);
          }}
        >
          <Ionicons name="trash-outline" size={20} color={c.accent3} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Card style={{ marginBottom: 16 }}>
          <StatRow
            items={[
              { label: "Sets", value: String(totalSets) },
              { label: "Volume", value: `${totalVolume.toLocaleString()} kg` },
              { label: "Exercises", value: String(grouped.size) },
            ]}
          />
        </Card>

        {[...grouped.entries()].map(([exId, exSets]) => (
          <Card key={exId} style={{ marginBottom: 12 }}>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: "700", marginBottom: 10 }}>
              {getExName(exId)}
            </Text>
            {/* Header row */}
            <View style={{ flexDirection: "row", marginBottom: 6 }}>
              <Text style={styles.colHeader}>Set</Text>
              <Text style={styles.colHeader}>kg</Text>
              <Text style={styles.colHeader}>Reps</Text>
              <Text style={styles.colHeader}>RIR</Text>
            </View>
            {exSets.map((s) => (
              <View key={s.id} style={styles.setRow}>
                <Text style={styles.setNum}>#{s.set_number}</Text>
                <Text style={styles.setVal}>{s.weight_kg ?? "—"}</Text>
                <Text style={styles.setVal}>{s.reps ?? "—"}</Text>
                <Text style={styles.setVal}>{s.rir ?? "—"}</Text>
                {s.personal_record && (
                  <Badge label="PR" color={c.accent2} />
                )}
              </View>
            ))}
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 20, fontWeight: "700", color: c.text },
  colHeader: { color: c.textDim, fontSize: 11, fontWeight: "600", flex: 1 },
  setRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  setNum: { color: c.textDim, fontSize: 13, fontWeight: "600", flex: 1 },
  setVal: { color: c.text, fontSize: 15, fontWeight: "600", flex: 1 },
});
