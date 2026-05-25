import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" options={{ presentation: "modal" }} />
        <Stack.Screen name="workout" options={{ animation: "slide_from_bottom", gestureEnabled: false }} />
        <Stack.Screen name="session/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="exercises" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="templates" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="history" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="settings" options={{ animation: "slide_from_right" }} />
      </Stack>
    </>
  );
}
