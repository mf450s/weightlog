import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors as c } from "../lib/colors";
import { login, register } from "../lib/api";
import { Input, Btn } from "../components/ui";

export default function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Email and password required.");
      return;
    }
    if (mode === "register" && !name.trim()) {
      Alert.alert("Error", "Name required.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await login({ email: email.trim(), password });
      } else {
        await register({ name: name.trim(), email: email.trim(), password });
        // Auto-login after register
        await login({ email: email.trim(), password });
      }
      router.replace("/");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, alignItems: "flex-end" }}>
        <Ionicons name="close" size={24} color={c.textDim} onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>OpenWeights</Text>
        <Text style={styles.subtitle}>{mode === "login" ? "Welcome back" : "Create account"}</Text>

        {mode === "register" && (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.label}>Name</Text>
            <Input value={name} onChange={setName} placeholder="Your name" />
          </View>
        )}

        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Email</Text>
          <Input
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
          />
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={styles.label}>Password</Text>
          <Input value={password} onChange={setPassword} placeholder="••••••••" secure />
        </View>

        <Btn
          label={loading ? "..." : mode === "login" ? "Log In" : "Create Account"}
          onPress={handleSubmit}
          size="lg"
        />

        <View style={{ marginTop: 20, alignItems: "center" }}>
          <Text style={{ color: c.textDim, fontSize: 14 }}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          </Text>
          <Text
            style={{ color: c.accent, fontSize: 14, fontWeight: "600", marginTop: 4 }}
            onPress={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Sign up" : "Log in"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  scroll: { padding: 32, paddingTop: 40 },
  title: { fontSize: 32, fontWeight: "800", color: c.text, textAlign: "center", marginBottom: 4 },
  subtitle: { color: c.textDim, fontSize: 15, textAlign: "center", marginBottom: 32 },
  label: { color: c.textDim, fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase" },
});
