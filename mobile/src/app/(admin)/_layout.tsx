import React from "react";
import { Stack } from "expo-router";
import LoadingScreen from "../../components/LoadingScreen";
import { useAuthStore } from "../../store/auth";

export default function AdminLayout() {
  const { token, user, hydrated } = useAuthStore();

  const isAdminOrEmployer = ["admin", "administrator", "employer"].includes(
    user?.role?.toLowerCase() ?? ""
  );

  if (!hydrated || !token || !isAdminOrEmployer) return <LoadingScreen />;

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: "#FFFFFF" },
        headerTintColor: "#0F172A",
        headerTitleStyle: { fontWeight: "800", fontSize: 17 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: "#F8FAFC" },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="users" options={{ title: "User Management" }} />
      <Stack.Screen name="drivers" options={{ title: "Driver Verification" }} />
      <Stack.Screen name="documents" options={{ title: "Document Approvals" }} />
      <Stack.Screen name="sos" options={{ title: "Emergency & SOS" }} />
      <Stack.Screen name="payments" options={{ title: "Payments & Revenue" }} />
      <Stack.Screen name="reports" options={{ title: "Platform Reports" }} />
      <Stack.Screen name="settings" options={{ title: "System Settings" }} />
    </Stack>
  );
}
