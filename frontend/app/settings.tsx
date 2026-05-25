import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors as c } from "../lib/colors";
import type { UserRead } from "../lib/types";
import { getMe, updateMe, updatePassword, deleteAccount, logout, getCurrentUser } from "../lib/api";
import { Card, Section, Btn, Input } from "../components/ui";

export default function SettingsScreen() {
  const [user, setUser] = useState<UserRead | null>(getCurrentUser());
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");

  // Password change
  const [showPw, setShowPw] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");

  const handleUpdateProfile = async () => {
    try {
      const u = await updateMe({ name: name.trim(), email: email.trim() });
      setUser(u);
      Alert.alert("Saved", "Profile updated.");
    } catch (e: any) { Alert.alert("Error", e.message); }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) { Alert.alert("Error", "Fill both fields."); return; }
    try {
      await updatePassword({ current_password: currentPw, new_password: newPw });
      Alert.alert("Done", "Password changed.");
      setCurrentPw(""); setNewPw(""); setShowPw(false);
    } catch (e: any) { Alert.alert("Error", e.message); }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  const handleDelete = () => {
    Alert.alert("Delete Account", "This permanently deletes all your data. Enter your password to confirm.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Alert.prompt
            ? Alert.prompt("Password", "Enter your password", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: async (pw: string) => {
                  try { await deleteAccount(pw); router.replace("/"); } catch (e: any) { Alert.alert("Error", e.message); }
                }},
              ], "secure-text")
            : Alert.alert("Error", "Prompt not supported.");
        },
      },
    ]);
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

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Profile */}
        <Card style={{ marginBottom: 16 }}>
          <Section title="Profile">
            <Text style={styles.label}>Name</Text>
            <Input value={name} onChange={setName} style={{ marginBottom: 12 }} />
            <Text style={styles.label}>Email</Text>
            <Input value={email} onChange={setEmail} keyboardType="email-address" style={{ marginBottom: 12 }} />
            <Btn label="Save" onPress={handleUpdateProfile} />
          </Section>
        </Card>

        {/* Password */}
        <Card style={{ marginBottom: 16 }}>
          <Section title="Password">
            {!showPw ? (
              <Btn label="Change Password" variant="ghost" onPress={() => setShowPw(true)} />
            ) : (
              <View>
                <Input value={currentPw} onChange={setCurrentPw} placeholder="Current password" secure style={{ marginBottom: 8 }} />
                <Input value={newPw} onChange={setNewPw} placeholder="New password (min 8 chars)" secure style={{ marginBottom: 12 }} />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}><Btn label="Update" onPress={handleChangePassword} /></View>
                  <View style={{ flex: 1 }}><Btn label="Cancel" variant="ghost" onPress={() => { setShowPw(false); setCurrentPw(""); setNewPw(""); }} /></View>
                </View>
              </View>
            )}
          </Section>
        </Card>

        {/* Actions */}
        <Card style={{ marginBottom: 16 }}>
          <Section title="Account">
            <Btn label="Log Out" variant="secondary" onPress={handleLogout} />
            <View style={{ marginTop: 12 }}>
              <Btn label="Delete Account" variant="danger" onPress={handleDelete} />
            </View>
          </Section>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 20, fontWeight: "700", color: c.text },
  label: { color: c.textDim, fontSize: 12, fontWeight: "600", marginBottom: 4, textTransform: "uppercase" },
});
