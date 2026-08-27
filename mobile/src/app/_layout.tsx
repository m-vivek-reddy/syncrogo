import React, { useEffect } from "react";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../auth/AuthContext";
import { useAuthStore } from "../store/auth";

function NavigationGuard() {
  const { loading, isAuthenticated, user: authUser } = useAuth();
  const segments = useSegments();
  const { token, hydrated, user: storeUser } = useAuthStore();

  useEffect(() => {
    if (loading || !hydrated) return;

    const firstSegment = segments[0];
    const insideAuth = firstSegment === "(auth)";
    const insideUser = firstSegment === "(user)";
    const insideAdmin = firstSegment === "(admin)";

    const currentUser = storeUser || authUser;
    const hasToken = !!token || isAuthenticated;

    const isAdmin = ["admin", "administrator"].includes(
      currentUser?.role?.toLowerCase() ?? ""
    );

    if (!hasToken && (insideUser || insideAdmin)) {
      router.replace("/(auth)/login");
      return;
    }

    if (hasToken) {
      if (insideAuth) {
        if (isAdmin) {
          router.replace("/(admin)");
        } else {
          router.replace("/(user)/home");
        }
      } else if (insideAdmin && !isAdmin) {
        router.replace("/(user)/home");
      }
    }
  }, [loading, hydrated, isAuthenticated, token, storeUser, authUser, segments]);

  return null;
}

export default function RootLayout() {
  const hydrate = useAuthStore((state) => state.hydrate);
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#F8FAFC" },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(user)" />
        <Stack.Screen name="(admin)" />
      </Stack>
      <NavigationGuard />
    </AuthProvider>
  );
}
