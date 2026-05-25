import React from "react";
import { View, Text, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Colors } from "../lib/colors";
import { WeightEntry } from "../lib/types";

interface Props {
  entries: WeightEntry[];
  days?: number;
}

export function WeightChart({ entries, days = 30 }: Props) {
  const c = Colors.dark;
  const width = Dimensions.get("window").width - 32;

  if (entries.length < 2) {
    return (
      <View
        style={{
          height: 200,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: c.textDim, fontSize: 15 }}>
          Not enough data — add 2+ entries to see the chart
        </Text>
      </View>
    );
  }

  // Filter to last N days, sort ascending
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const filtered = entries
    .filter((e) => e.date >= cutoffStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (filtered.length < 2) {
    return (
      <View style={{ height: 200, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: c.textDim, fontSize: 15 }}>
          Not enough data in the last {days} days
        </Text>
      </View>
    );
  }

  const weights = filtered.map((e) => e.weight);
  const labels = filtered.map((e) => {
    const d = new Date(e.date);
    return `${d.getDate()}.${d.getMonth() + 1}`;
  });

  // Show only ~5 labels to avoid crowding
  const step = Math.max(1, Math.floor(labels.length / 5));
  const sparseLabels = labels.map((l, i) => (i % step === 0 ? l : ""));

  return (
    <LineChart
      data={{
        labels: sparseLabels,
        datasets: [{ data: weights, color: () => c.accent, strokeWidth: 2 }],
      }}
      width={width}
      height={200}
      withDots={filtered.length <= 60}
      withInnerLines={false}
      withOuterLines={false}
      withVerticalLines={false}
      withHorizontalLines={true}
      withShadow={false}
      chartConfig={{
        backgroundColor: c.surface,
        backgroundGradientFrom: c.surface,
        backgroundGradientTo: c.surface,
        decimalCount: 1,
        color: (opacity = 1) => `rgba(74, 222, 128, ${opacity})`,
        labelColor: () => c.textDim,
        propsForDots: { r: "3", strokeWidth: "1", stroke: c.accent },
        propsForLabels: { fontSize: 11 },
        propsForBackgroundLines: { strokeDasharray: "", stroke: c.border, strokeWidth: 0.5 },
      }}
      bezier
      style={{ borderRadius: 12, marginLeft: -8 }}
    />
  );
}
