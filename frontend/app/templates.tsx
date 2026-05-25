import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors as c } from "../lib/colors";
import type { WorkoutTemplate, TrainingSplit, TemplateExercise, ExerciseRead } from "../lib/types";
import { listTemplates, createTemplate, deleteTemplate, listSplits, listExercises, listTemplateExercises } from "../lib/api";
import { Card, Section, Btn, Input, Badge } from "../components/ui";

export default function TemplatesScreen() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [splits, setSplits] = useState<TrainingSplit[]>([]);
  const [exercises, setExercises] = useState<ExerciseRead[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    (async () => {
      const [t, s, e] = await Promise.all([listTemplates(), listSplits(), listExercises()]);
      setTemplates(t);
      setSplits(s);
      setExercises(e);
    })();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createTemplate(newName.trim());
    setNewName("");
    setShowCreate(false);
    const t = await listTemplates();
    setTemplates(t);
  };

  const handleDelete = (tpl: WorkoutTemplate) => {
    Alert.alert("Delete Template?", tpl.name, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await deleteTemplate(tpl.id);
        setTemplates((prev) => prev.filter((t) => t.id !== tpl.id));
      }},
    ]);
  };

  const getExName = (id: number | null) => exercises.find((e) => e.id === id)?.name ?? "?";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Templates</Text>
        <TouchableOpacity onPress={() => setShowCreate(!showCreate)}>
          <Ionicons name={showCreate ? "close" : "add"} size={24} color={c.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {showCreate && (
          <Card style={{ marginBottom: 16 }}>
            <Input value={newName} onChange={setNewName} placeholder="Template name (e.g. Push Day)" style={{ marginBottom: 8 }} />
            <Btn label="Create" onPress={handleCreate} disabled={!newName.trim()} />
          </Card>
        )}

        {templates.length === 0 ? (
          <Text style={{ color: c.textDim, textAlign: "center", marginTop: 40 }}>No templates yet. Create one to plan your workouts.</Text>
        ) : (
          templates.map((tpl) => (
            <Card key={tpl.id} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontSize: 16, fontWeight: "700" }}>{tpl.name}</Text>
                  {tpl.split_id && (
                    <Badge label={splits.find((s) => s.id === tpl.split_id)?.name ?? "Split"} color={c.accent4} />
                  )}
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Btn
                    label="Start"
                    onPress={() => router.push(`/workout?templateId=${tpl.id}`)}
                    size="sm"
                  />
                  <TouchableOpacity onPress={() => handleDelete(tpl)}>
                    <Ionicons name="trash-outline" size={18} color={c.textDim} />
                  </TouchableOpacity>
                </View>
              </View>
              <TemplateExercises templateId={tpl.id} getExName={getExName} />
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TemplateExercises({ templateId, getExName }: { templateId: number; getExName: (id: number | null) => string }) {
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  useEffect(() => {
    listTemplateExercises(templateId).then(setExercises).catch(() => {});
  }, [templateId]);

  if (exercises.length === 0) {
    return <Text style={{ color: c.textDim, fontSize: 12, marginTop: 8 }}>No exercises yet</Text>;
  }

  return (
    <View style={{ marginTop: 10 }}>
      {exercises.sort((a, b) => (a.order_in_template ?? 99) - (b.order_in_template ?? 99)).map((te) => (
        <View key={te.id} style={styles.teRow}>
          <Text style={{ color: c.text, fontSize: 14, flex: 1 }}>{getExName(te.exercise_id)}</Text>
          <Text style={{ color: c.textDim, fontSize: 12 }}>
            {te.sets ?? "?"}×{te.reps ?? "?"}
            {te.weight_kg ? ` @ ${te.weight_kg}kg` : ""}
            {te.rir != null ? ` RIR ${te.rir}` : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 20, fontWeight: "700", color: c.text },
  teRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
});
