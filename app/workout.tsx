import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors as c } from "../lib/colors";
import type {
  ExerciseRead,
  WorkoutSession,
  SessionSet,
  TemplateExercise,
  WorkoutTemplate,
} from "../lib/types";
import {
  createSession,
  getSession,
  updateSession,
  deleteSession,
  listSessionSets,
  createSessionSet,
  updateSessionSet,
  deleteSessionSet,
  listExercises,
  getTemplate,
  listTemplateExercises,
} from "../lib/api";
import { Btn } from "../components/ui";

type LocalSet = {
  key: string; // temp id for local state
  exercise_id: number;
  exercise_name: string;
  set_number: number;
  weight_kg: string;
  reps: string;
  rir: string;
  completed: boolean;
  server_id?: number;
};

export default function WorkoutScreen() {
  const router = useRouter();
  const { id, templateId } = useLocalSearchParams<{ id?: string; templateId?: string }>();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exercises, setExercises] = useState<ExerciseRead[]>([]);
  const [sets, setSets] = useState<LocalSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");

  // Load existing session or create new
  useEffect(() => {
    (async () => {
      try {
        const exs = await listExercises();
        setExercises(exs);

        if (id) {
          const s = await getSession(Number(id));
          setSession(s);
          setNotes(s.notes ?? "");

          const serverSets = await listSessionSets(Number(id));
          if (serverSets.length > 0) {
            const local = serverSets
              .sort((a, b) => a.set_number - b.set_number)
              .map((ss) => ({
                key: String(ss.id),
                exercise_id: ss.exercise_id ?? 0,
                exercise_name: exs.find((e) => e.id === ss.exercise_id)?.name ?? "Unknown",
                set_number: ss.set_number,
                weight_kg: ss.weight_kg != null ? String(ss.weight_kg) : "",
                reps: ss.reps != null ? String(ss.reps) : "",
                rir: ss.rir != null ? String(ss.rir) : "",
                completed: ss.completed,
                server_id: ss.id,
              }));
            setSets(local);
          } else {
            // Existing session with no sets — add default set
            addExerciseToSession(s, exs, templateId ?? null);
          }
        } else {
          // New session
          const s = await createSession({
            performed_at: new Date().toISOString(),
            template_id: templateId ? Number(templateId) : undefined,
          });
          setSession(s);
          if (templateId) {
            try {
              const tpl = await getTemplate(Number(templateId));
              const tplExs = await listTemplateExercises(Number(templateId));
              // Pre-fill sets from template
              const localSets: LocalSet[] = [];
              tplExs.sort((a, b) => (a.order_in_template ?? 0) - (b.order_in_template ?? 0));
              for (const te of tplExs) {
                const ex = exs.find((e) => e.id === te.exercise_id);
                const setName = ex?.name ?? "Exercise";
                const setCount = te.sets ?? 3;
                for (let i = 0; i < setCount; i++) {
                  localSets.push({
                    key: `new_${Date.now()}_${localSets.length}`,
                    exercise_id: te.exercise_id ?? 0,
                    exercise_name: setName,
                    set_number: i + 1,
                    weight_kg: te.weight_kg != null ? String(te.weight_kg) : "",
                    reps: te.reps != null ? String(te.reps) : "",
                    rir: te.rir != null ? String(te.rir) : "",
                    completed: false,
                  });
                }
              }
              setSets(localSets);
              setLoading(false);
              return;
            } catch {}
          }
          // Default: one empty set
          addExerciseToSession(s, exs, null);
        }
      } catch (e: any) {
        Alert.alert("Error", e.message);
        router.back();
      }
      setLoading(false);
    })();
  }, [id, templateId]);

  const addExerciseToSession = async (
    s: WorkoutSession,
    exs: ExerciseRead[],
    tplId: string | null,
  ) => {
    if (tplId) return; // template handled above
    const firstEx = exs[0];
    if (!firstEx) return;
    setSets((prev) => [
      ...prev,
      {
        key: `new_${Date.now()}`,
        exercise_id: firstEx.id,
        exercise_name: firstEx.name,
        set_number: prev.length + 1,
        weight_kg: "",
        reps: "",
        rir: "",
        completed: false,
      },
    ]);
  };

  const addSet = () => {
    if (sets.length === 0) return;
    const last = sets[sets.length - 1];
    setSets((prev) => [
      ...prev,
      {
        key: `new_${Date.now()}`,
        exercise_id: last.exercise_id,
        exercise_name: last.exercise_name,
        set_number: (prev.filter((s) => s.exercise_id === last.exercise_id).length) + 1,
        weight_kg: last.weight_kg,
        reps: last.reps,
        rir: last.rir,
        completed: false,
      },
    ]);
  };

  const selectExercise = (setIdx: number) => {
    Alert.alert("Select Exercise", "", [
      ...exercises.slice(0, 20).map((ex) => ({
        text: ex.name,
        onPress: () => {
          setSets((prev) => {
            const next = [...prev];
            next[setIdx] = { ...next[setIdx], exercise_id: ex.id, exercise_name: ex.name };
            return next;
          });
        },
      })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  };

  const toggleComplete = (idx: number) => {
    setSets((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], completed: !next[idx].completed };
      return next;
    });
  };

  const updateSet = (idx: number, field: keyof LocalSet, value: string) => {
    setSets((prev) => {
      const next = [...prev];
      (next[idx] as any)[field] = value;
      return next;
    });
  };

  const handleSave = async () => {
    if (!session) return;
    setSaving(true);
    try {
      // Sync all sets to server
      const serverSets = sets.filter((s) => s.server_id);
      const newSets = sets.filter((s) => !s.server_id);

      // Create new sets
      for (const s of newSets) {
        const created = await createSessionSet(session.id, {
          exercise_id: s.exercise_id,
          set_number: s.set_number,
          weight_kg: s.weight_kg ? Number(s.weight_kg) : undefined,
          reps: s.reps ? Number(s.reps) : undefined,
          rir: s.rir ? Number(s.rir) : undefined,
        });
        s.server_id = created.id;
      }

      // Update existing sets
      for (const s of serverSets) {
        await updateSessionSet(session.id, s.server_id!, {
          weight_kg: s.weight_kg ? Number(s.weight_kg) : null,
          reps: s.reps ? Number(s.reps) : null,
          rir: s.rir ? Number(s.rir) : null,
          completed: s.completed,
        });
      }

      if (notes !== (session.notes ?? "")) {
        await updateSession(session.id, { notes: notes || null });
      }

      Alert.alert("Saved", "Workout synced.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
    setSaving(false);
  };

  const handleFinish = async () => {
    if (!session) return;
    setSaving(true);
    try {
      // Save all sets first
      for (const s of sets.filter((s) => !s.server_id)) {
        const created = await createSessionSet(session.id, {
          exercise_id: s.exercise_id,
          set_number: s.set_number,
          weight_kg: s.weight_kg ? Number(s.weight_kg) : undefined,
          reps: s.reps ? Number(s.reps) : undefined,
          rir: s.rir ? Number(s.rir) : undefined,
        });
        s.server_id = created.id;
      }
      for (const s of sets.filter((s) => s.server_id)) {
        await updateSessionSet(session.id, s.server_id!, {
          weight_kg: s.weight_kg ? Number(s.weight_kg) : null,
          reps: s.reps ? Number(s.reps) : null,
          rir: s.rir ? Number(s.rir) : null,
          completed: s.completed,
        });
      }
      // End session
      await updateSession(session.id, {
        active_session: false,
        ended_at: new Date().toISOString(),
        notes: notes || null,
      });
      Alert.alert("Done", "Workout finished! 💪", [{ text: "OK", onPress: () => router.replace("/") }]);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
    setSaving(false);
  };

  const handleDeleteSet = (idx: number) => {
    Alert.alert("Delete set?", "", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const s = sets[idx];
          if (s.server_id && session) {
            try { await deleteSessionSet(session.id, s.server_id); } catch {}
          }
          setSets((prev) => prev.filter((_, i) => i !== idx));
        },
      },
    ]);
  };

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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {session ? new Date(session.performed_at).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" }) : "Workout"}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Ionicons name="cloud-upload-outline" size={22} color={saving ? c.textDim : c.accent2} />
        </TouchableOpacity>
      </View>

      {/* Notes */}
      <TouchableOpacity style={styles.notesBar} onPress={() => setEditingNotes(!editingNotes)}>
        <Ionicons name="create-outline" size={16} color={c.textDim} />
        <Text style={{ color: notes ? c.text : c.textDim, fontSize: 14, marginLeft: 8, flex: 1 }}>
          {notes || "Add workout notes..."}
        </Text>
      </TouchableOpacity>
      {editingNotes && (
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="How did it feel? What to improve?"
          placeholderTextColor={c.border}
          multiline
          autoFocus
          onBlur={() => setEditingNotes(false)}
        />
      )}

      {/* Sets */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 160 }}>
        {sets.map((s, i) => {
          const isNewExercise = i === 0 || s.exercise_id !== sets[i - 1]?.exercise_id;
          return (
            <View key={s.key}>
              {isNewExercise && (
                <TouchableOpacity style={styles.exerciseHeader} onPress={() => selectExercise(i)}>
                  <Text style={styles.exerciseName}>{s.exercise_name}</Text>
                  <Ionicons name="chevron-down" size={14} color={c.textDim} />
                </TouchableOpacity>
              )}

              <View style={[styles.setRow, s.completed && styles.setRowCompleted]}>
                <TouchableOpacity onPress={() => toggleComplete(i)} style={{ marginRight: 10 }}>
                  <Ionicons
                    name={s.completed ? "checkbox" : "square-outline"}
                    size={22}
                    color={s.completed ? c.accent2 : c.textDim}
                  />
                </TouchableOpacity>

                <Text style={styles.setNum}>#{s.set_number}</Text>

                <View style={styles.setInputGroup}>
                  <Text style={styles.setInputLabel}>kg</Text>
                  <TextInput
                    style={styles.setInput}
                    value={s.weight_kg}
                    onChangeText={(v) => updateSet(i, "weight_kg", v)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={c.border}
                  />
                </View>

                <View style={styles.setInputGroup}>
                  <Text style={styles.setInputLabel}>reps</Text>
                  <TextInput
                    style={styles.setInput}
                    value={s.reps}
                    onChangeText={(v) => updateSet(i, "reps", v)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={c.border}
                  />
                </View>

                <View style={styles.setInputGroup}>
                  <Text style={styles.setInputLabel}>RIR</Text>
                  <TextInput
                    style={[styles.setInput, { minWidth: 36 }]}
                    value={s.rir}
                    onChangeText={(v) => updateSet(i, "rir", v)}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={c.border}
                  />
                </View>

                <TouchableOpacity onPress={() => handleDeleteSet(i)}>
                  <Ionicons name="trash-outline" size={16} color={c.textDim} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Add set button */}
        <TouchableOpacity style={styles.addSetBtn} onPress={addSet}>
          <Ionicons name="add-circle-outline" size={20} color={c.accent} />
          <Text style={{ color: c.accent, fontSize: 15, fontWeight: "600", marginLeft: 6 }}>Add Set</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <View style={{ flex: 1 }}>
          <Btn label="Finish Workout" onPress={handleFinish} variant="secondary" disabled={saving} />
        </View>
      </View>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: c.text },
  notesBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  notesInput: {
    backgroundColor: c.surface2,
    color: c.text,
    fontSize: 14,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 10,
    minHeight: 60,
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  exerciseName: { color: c.text, fontSize: 16, fontWeight: "700" },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  setRowCompleted: { opacity: 0.5 },
  setNum: { color: c.textDim, fontSize: 13, fontWeight: "600", width: 30 },
  setInputGroup: { flexDirection: "row", alignItems: "center", marginRight: 10, flex: 1 },
  setInputLabel: { color: c.textDim, fontSize: 10, fontWeight: "600", marginRight: 4, width: 20 },
  setInput: {
    backgroundColor: c.surface2,
    color: c.text,
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    textAlign: "center",
    minWidth: 48,
  },
  addSetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginTop: 8,
  },
  bottomBar: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    backgroundColor: c.bg,
  },
});
