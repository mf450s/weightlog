import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors as c } from "../lib/colors";
import type { WorkoutSession, WorkoutTemplate, ExerciseRead } from "../lib/types";
import { loadAuth, getCurrentUser, clearAuth, listSessions, listTemplates } from "../lib/api";
import { Card, Section, StatRow, Btn } from "../components/ui";

export default function Dashboard() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [user, setUser] = useState(getCurrentUser());
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await loadAuth();
      setAuthed(!!t);
      setUser(t?.user ?? null);
    })();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [s, tpl] = await Promise.all([listSessions(30), listTemplates()]);
      setSessions(s);
      setTemplates(tpl);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { if (authed) loadData(); }, [authed, loadData]));

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const activeSession = sessions.find((s) => s.active_session);
  const recentSessions = sessions.filter((s) => !s.active_session).slice(0, 5);

  // Not authed
  if (authed === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🏋️</Text>
          <Text style={{ fontSize: 28, fontWeight: "800", color: c.text, marginBottom: 8 }}>
            OpenWeights
          </Text>
          <Text style={{ color: c.textDim, fontSize: 15, textAlign: "center", marginBottom: 32 }}>
            Track your workouts. Log sets, reps, and weights. See your progress over time.
          </Text>
          <Btn label="Get Started" onPress={() => router.push("/auth")} size="lg" />
        </View>
      </SafeAreaView>
    );
  }

  if (authed === null) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>OpenWeights</Text>
            <Text style={styles.subtitle}>{user?.name}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 14 }}>
            <Ionicons name="barbell-outline" size={22} color={c.textDim} onPress={() => router.push("/exercises")} />
            <Ionicons name="settings-outline" size={22} color={c.textDim} onPress={() => router.push("/settings")} />
          </View>
        </View>

        {/* Active session */}
        {activeSession ? (
          <Card style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ color: c.accent, fontSize: 12, fontWeight: "700", textTransform: "uppercase" }}>
                  Active Workout
                </Text>
                <Text style={{ color: c.text, fontSize: 18, fontWeight: "700", marginTop: 4 }}>
                  {new Date(activeSession.performed_at).toLocaleDateString()}
                </Text>
                {activeSession.notes && (
                  <Text style={{ color: c.textDim, fontSize: 13, marginTop: 2 }}>{activeSession.notes}</Text>
                )}
              </View>
              <Btn
                label="Resume"
                onPress={() => router.push(`/workout?id=${activeSession.id}`)}
                size="sm"
              />
            </View>
          </Card>
        ) : (
          <Card style={{ marginBottom: 16 }}>
            <Text style={{ color: c.textDim, fontSize: 14, textAlign: "center", marginBottom: 12 }}>
              No active workout. Start a new session.
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}><Btn label="Quick Start" onPress={() => router.push("/workout")} /></View>
              <View style={{ flex: 1 }}>
                <Btn
                  label="From Template"
                  variant="secondary"
                  onPress={() => router.push("/templates")}
                />
              </View>
            </View>
          </Card>
        )}

        {/* Stats */}
        <Card style={{ marginBottom: 16 }}>
          <Section title="This Week">
            <StatRow
              items={[
                { label: "Sessions", value: String(sessions.filter((s) => {
                  const d = new Date(s.performed_at);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return d >= weekAgo;
                }).length) },
                { label: "Templates", value: String(templates.length) },
                { label: "Active", value: activeSession ? "Yes" : "No", color: activeSession ? c.accent2 : c.textDim },
              ]}
            />
          </Section>
        </Card>

        {/* Recent sessions */}
        <Section title="Recent Sessions">
          {recentSessions.length === 0 ? (
            <Text style={{ color: c.textDim, fontSize: 14 }}>No sessions yet. Start your first workout.</Text>
          ) : (
            recentSessions.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={styles.sessionRow}
                onPress={() => router.push(`/session/${s.id}`)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontSize: 15, fontWeight: "600" }}>
                    {new Date(s.performed_at).toLocaleDateString("de-DE", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </Text>
                  {s.notes && <Text style={{ color: c.textDim, fontSize: 12 }}>{s.notes}</Text>}
                </View>
                {s.template_id && templates.find((t) => t.id === s.template_id) && (
                  <Text style={{ color: c.accent, fontSize: 12, fontWeight: "600" }}>
                    {templates.find((t) => t.id === s.template_id)!.name}
                  </Text>
                )}
                <Ionicons name="chevron-forward" size={16} color={c.textDim} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            ))
          )}
        </Section>

        {/* Nav bar */}
        <View style={styles.nav}>
          <TouchableOpacity style={styles.navItem} onPress={() => {}}>
            <Ionicons name="home" size={22} color={c.accent} />
            <Text style={[styles.navLabel, { color: c.accent }]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push("/history")}>
            <Ionicons name="time-outline" size={22} color={c.textDim} />
            <Text style={styles.navLabel}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push("/workout")}>
            <View style={styles.navCenter}>
              <Ionicons name="add" size={28} color="#09090B" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push("/templates")}>
            <Ionicons name="layers-outline" size={22} color={c.textDim} />
            <Text style={styles.navLabel}>Plans</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push("/exercises")}>
            <Ionicons name="search-outline" size={22} color={c.textDim} />
            <Text style={styles.navLabel}>Exercises</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  scroll: { padding: 16, paddingBottom: 100 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "800", color: c.text },
  subtitle: { color: c.textDim, fontSize: 14, marginTop: 2 },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  nav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: c.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    paddingTop: 10,
    paddingBottom: 30,
    paddingHorizontal: 8,
  },
  navItem: { flex: 1, alignItems: "center", gap: 3 },
  navLabel: { fontSize: 10, color: c.textDim, fontWeight: "600" },
  navCenter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
  },
});
