import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, StyleSheet } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors as c } from "../lib/colors";
import type { ExerciseRead, MuscleGroup, MuscleRegion } from "../lib/types";
import { listExercises, createExercise, deleteExercise, listMuscleGroups, listMuscleRegions, getExerciseHistory, getExercise1rm } from "../lib/api";
import { Card, Section, Btn, Input, Badge, StatRow } from "../components/ui";

export default function ExercisesScreen() {
  const [exercises, setExercises] = useState<ExerciseRead[]>([]);
  const [groups, setGroups] = useState<MuscleGroup[]>([]);
  const [regions, setRegions] = useState<MuscleRegion[]>([]);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [selectedEx, setSelectedEx] = useState<ExerciseRead | null>(null);
  const [exHistory, setExHistory] = useState<any>(null);
  const [ex1rm, setEx1rm] = useState<any>(null);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    const [exs, grps, regs] = await Promise.all([listExercises(), listMuscleGroups(), listMuscleRegions()]);
    setExercises(exs);
    setGroups(grps);
    setRegions(regs);
  };

  const getRegionName = (id: number | null) => regions.find((r) => r.id === id)?.name ?? "";
  const getGroupName = (regionId: number | null) => {
    const region = regions.find((r) => r.id === regionId);
    return region ? groups.find((g) => g.id === region.group_id)?.name ?? "" : "";
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createExercise({ name: newName.trim(), muscle_region_id: selectedRegion });
      setNewName("");
      setSelectedRegion(null);
      setShowCreate(false);
      await loadData();
    } catch (e: any) { Alert.alert("Error", e.message); }
  };

  const handleSelect = async (ex: ExerciseRead) => {
    setSelectedEx(ex);
    try {
      const [history, rm] = await Promise.all([
        getExerciseHistory(ex.id),
        getExercise1rm(ex.id),
      ]);
      setExHistory(history);
      setEx1rm(rm);
    } catch { setExHistory(null); setEx1rm(null); }
  };

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Exercises</Text>
        <TouchableOpacity onPress={() => setShowCreate(!showCreate)}>
          <Ionicons name={showCreate ? "close" : "add"} size={24} color={c.accent} />
        </TouchableOpacity>
      </View>

      {showCreate && (
        <View style={{ padding: 16 }}>
          <Card>
            <Input value={newName} onChange={setNewName} placeholder="Exercise name (e.g. Bench Press)" style={{ marginBottom: 8 }} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {regions.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.chip, selectedRegion === r.id && { backgroundColor: c.accent }]}
                  onPress={() => setSelectedRegion(selectedRegion === r.id ? null : r.id)}
                >
                  <Text style={{ color: selectedRegion === r.id ? "#09090B" : c.textDim, fontSize: 12, fontWeight: "600" }}>
                    {r.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Btn label="Create Exercise" onPress={handleCreate} disabled={!newName.trim()} />
          </Card>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Input value={search} onChange={setSearch} placeholder="Search exercises..." style={{ marginBottom: 12 }} />

        {selectedEx ? (
          <View>
            <TouchableOpacity onPress={() => { setSelectedEx(null); setExHistory(null); setEx1rm(null); }}>
              <Text style={{ color: c.accent, fontSize: 14, marginBottom: 8 }}>← Back to list</Text>
            </TouchableOpacity>
            <Card style={{ marginBottom: 12 }}>
              <Text style={{ color: c.text, fontSize: 22, fontWeight: "800", marginBottom: 4 }}>
                {selectedEx.name}
              </Text>
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
                {getGroupName(selectedEx.muscle_region_id) && <Badge label={getGroupName(selectedEx.muscle_region_id)} />}
                {getRegionName(selectedEx.muscle_region_id) && <Badge label={getRegionName(selectedEx.muscle_region_id)} color={c.accent4} />}
              </View>
              {ex1rm && ex1rm.length > 0 && (
                <StatRow
                  items={[
                    { label: "Best 1RM", value: `${Math.round(ex1rm[ex1rm.length - 1]?.estimated_1rm ?? 0)} kg`, color: c.accent2 },
                    { label: "Sessions", value: String(exHistory?.length ?? 0) },
                    { label: "Last", value: exHistory?.[exHistory.length - 1]?.performed_at?.split("T")[0] ?? "—" },
                  ]}
                />
              )}
            </Card>
            {exHistory && exHistory.length > 0 && (
              <Section title="Recent Sessions">
                {exHistory.slice(-5).reverse().map((h: any) => (
                  <Card key={h.session_id} style={{ marginBottom: 8 }}>
                    <Text style={{ color: c.textDim, fontSize: 12, marginBottom: 4 }}>{h.performed_at.split("T")[0]}</Text>
                    {h.sets.map((s: any, i: number) => (
                      <Text key={i} style={{ color: c.text, fontSize: 13 }}>
                        Set {s.set_number}: {s.weight_kg ?? "—"} kg × {s.reps ?? "—"} reps {s.rir != null ? `(${s.rir} RIR)` : ""}
                      </Text>
                    ))}
                  </Card>
                ))}
              </Section>
            )}
          </View>
        ) : (
          <>
            {filtered.map((ex) => (
              <TouchableOpacity key={ex.id} style={styles.exRow} onPress={() => handleSelect(ex)}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontSize: 15, fontWeight: "600" }}>{ex.name}</Text>
                  <Text style={{ color: c.textDim, fontSize: 12 }}>
                    {getRegionName(ex.muscle_region_id)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={c.textDim} />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 20, fontWeight: "700", color: c.text },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: c.surface2, marginRight: 6 },
  exRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
});
