import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Colors } from "../lib/colors";

// Lightweight themed card
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  const c = Colors.dark;
  return (
    <View
      style={[
        { backgroundColor: c.surface, borderRadius: 16, padding: 16 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// Big number display (current weight)
export function BigNumber({
  value,
  unit = "kg",
  subtitle,
}: {
  value: number;
  unit?: string;
  subtitle?: string;
}) {
  const c = Colors.dark;
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "baseline" }}>
        <Text style={{ fontSize: 56, fontWeight: "800", color: c.text }}>
          {value.toFixed(1)}
        </Text>
        <Text style={{ fontSize: 24, color: c.textDim, marginLeft: 6 }}>
          {unit}
        </Text>
      </View>
      {subtitle && (
        <Text style={{ color: c.textDim, fontSize: 14, marginTop: 4 }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

// Pill-shaped stat
export function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  const c = Colors.dark;
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          color: color || c.text,
        }}
      >
        {value}
      </Text>
      <Text style={{ fontSize: 11, color: c.textDim, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

// Weight input field
export function WeightInput({
  value,
  onChange,
  placeholder = "0.0",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const c = Colors.dark;
  return (
    <TextInput
      style={{
        fontSize: 48,
        fontWeight: "700",
        color: c.text,
        textAlign: "center",
        paddingVertical: 12,
      }}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={c.border}
      keyboardType="decimal-pad"
      maxLength={5}
      autoFocus
      selectTextOnFocus
    />
  );
}

// Bottom action button
export function ActionButton({
  label,
  onPress,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
}) {
  const c = Colors.dark;
  const bg =
    variant === "danger"
      ? c.accent2
      : variant === "secondary"
        ? c.surface2
        : c.accent;
  const fg = variant === "secondary" ? c.text : "#0A0A0A";

  return (
    <TouchableOpacity
      style={{
        backgroundColor: bg,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: "center",
        marginTop: 8,
      }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={{ color: fg, fontSize: 17, fontWeight: "700" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
