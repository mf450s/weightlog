import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors as c } from "../lib/colors";
import type { WorkoutSession, WorkoutTemplate } from "../lib/types";
import { listSessions, listTemplates } from "../lib/api";
import { Card, Section, StatRow } from "../components/ui";

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [s, t] = await Promise.all([listSessions(200), listTemplates()]);
    setSessions(s.filter((x) => !x.active_session));
    setTemplates(t);
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Group by month
  const grouped = new Map<string, WorkoutSession[]>();
  for (const s of sessions) {
    const month = s.performed_at.slice(0, 7);
    if (!grouped.has(month)) grouped.set(month, []);
    grouped.get(month)!.push(s);
  }

  const totalVolume = sessions.length; // simplified — real volume needs sets

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={styles.title}>History</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
      >
        <Card style={{ marginBottom: 16 }}>
          <StatRow
            items={[
              { label: "Total Sessions", value: String(sessions.length) },
              { label: "This Month", value: String(sessions.filter((s) => s.performed_at.slice(0, 7) === new Date().toISOString().slice(0, 7)).length) },
              { label: "Templates", value: String(templates.length) },
            ]}
          />
        </Card>

        {[...grouped.entries()].map(([month, monthSessions]) => (
          <Section key={month} title={new Date(month + "-01").toLocaleDateString("de-DE", { month: "long", year: "numeric" })}>
            {monthSessions.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={styles.row}
                onPress={() => router.push(`/session/${s.id}`)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontSize: 15, fontWeight: "600" }}>
                    {new Date(s.performed_at).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" })}
                  </Text>
                  {s.template_id && (
                    <Text style={{ color: c.accent, fontSize: 12 }}>
                      {templates.find((t) => t.id === s.template_id)?.name ?? "Template"}
                    </Text>
                  )}
                </View>
                <Text style={{ color: c.textDim, fontSize: 13 }}>
                  {s.started_at && s.ended_at
                    ? `${Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000)}m`
                    : ""}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={c.textDim} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            ))}
          </Section>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 20, fontWeight: "700", color: c.text },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
});
