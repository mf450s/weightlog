import React from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { Colors as c } from "../lib/colors";

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[{ backgroundColor: c.surface, borderRadius: 14, padding: 16 }, style]}>{children}</View>;
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function Btn({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}) {
  const bg =
    variant === "danger" ? c.accent3 :
    variant === "secondary" ? c.surface2 :
    variant === "ghost" ? "transparent" : c.accent;
  const fg = variant === "ghost" ? c.textDim : variant === "secondary" ? c.text : "#09090B";
  const py = size === "sm" ? 8 : size === "lg" ? 16 : 12;
  const fs = size === "sm" ? 14 : size === "lg" ? 18 : 16;

  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: bg, paddingVertical: py, opacity: disabled ? 0.4 : 1 }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Text style={{ color: fg, fontSize: fs, fontWeight: "700" }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Input({
  value,
  onChange,
  placeholder,
  keyboardType = "default",
  secure,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad" | "email-address";
  secure?: boolean;
  style?: object;
}) {
  return (
    <TextInput
      style={[styles.input, style]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={c.border}
      keyboardType={keyboardType}
      secureTextEntry={secure}
      autoCapitalize="none"
    />
  );
}

export function StatRow({ items }: { items: { label: string; value: string; color?: string }[] }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
      {items.map(({ label, value, color }, i) => (
        <View key={i} style={{ alignItems: "center", flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: color ?? c.text }}>{value}</Text>
          <Text style={{ fontSize: 11, color: c.textDim, marginTop: 2 }}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

export function Badge({ label, color }: { label: string; color?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: (color ?? c.accent) + "20" }]}>
      <Text style={{ color: color ?? c.accent, fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: c.textDim,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },
  btn: { borderRadius: 12, alignItems: "center" },
  input: {
    backgroundColor: c.surface2,
    color: c.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
});
