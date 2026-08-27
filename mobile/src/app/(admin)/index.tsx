import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";
import { Colors } from "../../constants/colors";
import apiClient from "../../api/client";

type AnalyticsData = {
  total_users?: number;
  total_drivers?: number;
  total_rides?: number;
  completed_rides?: number;
  pending_documents?: number;
  active_emergencies?: number;
  revenue?: number;
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await apiClient.get<any>("/admin/analytics");
      setAnalytics(res.data || res);
    } catch {
      setAnalytics({
        total_users: 0,
        total_drivers: 0,
        total_rides: 0,
        completed_rides: 0,
        pending_documents: 0,
        active_emergencies: 0,
        revenue: 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchAnalytics();
  };

  const handleLogout = () => {
    Alert.alert("Admin Logout", "Are you sure you want to log out of the Admin Portal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const adminTiles = [
    {
      title: "Users Management",
      subtitle: `${analytics?.total_users ?? 0} registered accounts`,
      icon: "people",
      color: "#2563EB",
      route: "/(admin)/users" as const,
    },
    {
      title: "Drivers & Verification",
      subtitle: `${analytics?.total_drivers ?? 0} active drivers`,
      icon: "car-sport",
      color: "#16A34A",
      route: "/(admin)/drivers" as const,
    },
    {
      title: "Document Approvals",
      subtitle: `${analytics?.pending_documents ?? 0} pending review`,
      icon: "document-text",
      color: "#D97706",
      badge: analytics?.pending_documents ? `${analytics.pending_documents}` : undefined,
      route: "/(admin)/documents" as const,
    },
    {
      title: "SOS & Emergencies",
      subtitle: `${analytics?.active_emergencies ?? 0} active alerts`,
      icon: "alert-circle",
      color: "#DC2626",
      route: "/(admin)/sos" as const,
    },
    {
      title: "Payments & Revenue",
      subtitle: `₹${(analytics?.revenue ?? 0).toLocaleString()} platform total`,
      icon: "card",
      color: "#059669",
      route: "/(admin)/payments" as const,
    },
    {
      title: "Platform Reports",
      subtitle: "Incident logs & grievances",
      icon: "bar-chart",
      color: "#6366F1",
      route: "/(admin)/reports" as const,
    },
    {
      title: "System Settings",
      subtitle: "App config & policies",
      icon: "settings-sharp",
      color: "#475569",
      route: "/(admin)/settings" as const,
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.badgeRow}>
            <Text style={styles.adminBadge}>ADMIN PORTAL</Text>
            <View style={styles.liveDot} />
          </View>
          <Text style={styles.greeting}>Control Center</Text>
          <Text style={styles.email}>{user?.email || "Super Administrator"}</Text>
        </View>

        <Pressable onPress={handleLogout} style={styles.logoutBtn} accessibilityLabel="Log out">
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
        </Pressable>
      </View>

      {/* KPI Overview Cards */}
      <Text style={styles.sectionTitle}>Platform Overview</Text>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading metrics...</Text>
        </View>
      ) : (
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { borderLeftColor: "#2563EB" }]}>
            <Text style={styles.kpiLabel}>Total Users</Text>
            <Text style={styles.kpiValue}>{analytics?.total_users ?? 0}</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: "#16A34A" }]}>
            <Text style={styles.kpiLabel}>Active Drivers</Text>
            <Text style={styles.kpiValue}>{analytics?.total_drivers ?? 0}</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: "#D97706" }]}>
            <Text style={styles.kpiLabel}>Total Rides</Text>
            <Text style={styles.kpiValue}>{analytics?.total_rides ?? 0}</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: "#059669" }]}>
            <Text style={styles.kpiLabel}>Revenue</Text>
            <Text style={styles.kpiValue}>₹{(analytics?.revenue ?? 0).toLocaleString()}</Text>
          </View>
        </View>
      )}

      {/* Admin Operations Section */}
      <Text style={styles.sectionTitle}>Management & Controls</Text>

      <View style={styles.tileList}>
        {adminTiles.map((tile, idx) => (
          <Pressable
            key={idx}
            onPress={() => router.push(tile.route)}
            style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
          >
            <View style={[styles.tileIconBox, { backgroundColor: tile.color + "18" }]}>
              <Ionicons name={tile.icon as any} size={22} color={tile.color} />
            </View>

            <View style={styles.tileText}>
              <Text style={styles.tileTitle}>{tile.title}</Text>
              <Text style={styles.tileSubtitle}>{tile.subtitle}</Text>
            </View>

            {tile.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{tile.badge}</Text>
              </View>
            )}

            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  adminBadge: {
    fontSize: 10,
    fontWeight: "900",
    color: "#0F172A",
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    letterSpacing: 0.5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#16A34A",
  },
  greeting: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0F172A",
  },
  email: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 12,
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
  },
  tileList: {
    gap: 10,
  },
  tile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  tilePressed: {
    backgroundColor: "#F1F5F9",
    transform: [{ scale: 0.99 }],
  },
  tileIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  tileText: {
    flex: 1,
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  tileSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  badge: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
});
