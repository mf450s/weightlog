import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../lib/colors";
import { Settings } from "../lib/types";
import { getLocalSettings, saveLocalSettings } from "../lib/storage";
import { fetchSettings, updateSettings } from "../lib/api";
import { Card, ActionButton } from "../components/ui";

const c = Colors.dark;

export default function SettingsScreen() {
  const [settings, setSettings] = useState<Settings>({
    height_cm: null,
    target_weight: null,
    unit: "kg",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const local = await getLocalSettings();
      setSettings(local);
      try {
        const api = await fetchSettings();
        setSettings(api);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    await saveLocalSettings(settings);
    try {
      await updateSettings(settings);
    } catch {}
    router.back();
  };

  const toggleUnit = () => {
    setSettings((s) => ({ ...s, unit: s.unit === "kg" ? "lbs" : "kg" }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Unit */}
        <Card style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Weight Unit</Text>
          <TouchableOpacity style={styles.unitToggle} onPress={toggleUnit}>
            <Text
              style={[
                styles.unitOption,
                settings.unit === "kg" && styles.unitActive,
              ]}
            >
              kg
            </Text>
            <Text
              style={[
                styles.unitOption,
                settings.unit === "lbs" && styles.unitActive,
              ]}
            >
              lbs
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Height */}
        <Card style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Height (cm)</Text>
          <Text style={styles.hint}>Used for BMI calculation</Text>
          <TextInput
            style={styles.input}
            value={settings.height_cm ? String(settings.height_cm) : ""}
            onChangeText={(v) =>
              setSettings((s) => ({
                ...s,
                height_cm: v ? parseFloat(v) || null : null,
              }))
            }
            placeholder="e.g. 178"
            placeholderTextColor={c.border}
            keyboardType="numeric"
            maxLength={3}
          />
        </Card>

        {/* Target weight */}
        <Card style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Target Weight ({settings.unit})</Text>
          <Text style={styles.hint}>Track progress toward your goal</Text>
          <TextInput
            style={styles.input}
            value={settings.target_weight ? String(settings.target_weight) : ""}
            onChangeText={(v) =>
              setSettings((s) => ({
                ...s,
                target_weight: v ? parseFloat(v) || null : null,
              }))
            }
            placeholder={settings.unit === "kg" ? "e.g. 75" : "e.g. 165"}
            placeholderTextColor={c.border}
            keyboardType="numeric"
            maxLength={5}
          />
        </Card>

        <ActionButton label="Save Settings" onPress={handleSave} />
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
  label: {
    color: c.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  hint: {
    color: c.textDim,
    fontSize: 12,
    marginBottom: 12,
  },
  input: {
    backgroundColor: c.surface2,
    color: c.text,
    fontSize: 18,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  unitToggle: {
    flexDirection: "row",
    backgroundColor: c.surface2,
    borderRadius: 10,
    padding: 3,
  },
  unitOption: {
    flex: 1,
    textAlign: "center",
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "600",
    color: c.textDim,
    borderRadius: 8,
  },
  unitActive: {
    backgroundColor: c.accent,
    color: "#0A0A0A",
  },
});
