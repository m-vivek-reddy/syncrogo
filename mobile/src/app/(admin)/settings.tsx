import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../auth/AuthContext";
import apiClient from "../../api/client";

export default function AdminSettingsScreen() {
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiOnline, setApiOnline] = useState(false);
  const [dbStatus, setDbStatus] = useState("Unknown");
  const [autoVerifyDocs, setAutoVerifyDocs] = useState(false);
  const [allowCashRides, setAllowCashRides] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await apiClient.get<any>("/admin/settings");
      const data = res.data || res;
      setApiOnline(true);
      setDbStatus(data.services?.database?.status || "Connected");
      setAllowCashRides(!!data.allow_cash_rides);
      setMaintenanceMode(!!data.maintenance_mode);
      setAutoVerifyDocs(!!data.auto_verify_documents);
    } catch {
      // Settings unreachable means the API itself is not reachable.
      setApiOnline(false);
      setDbStatus("Not reachable");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchSettings();
  };

  const saveSetting = async (
    key: "allow_cash_rides" | "maintenance_mode" | "auto_verify_documents",
    value: boolean
  ) => {
    try {
      await apiClient.patch("/admin/settings", { [key]: value });
      return true;
    } catch {
      Alert.alert("Error", "Could not save the setting. Check your connection and try again.");
      return false;
    }
  };

  const handleToggleMaintenance = (val: boolean) => {
    if (val) {
      Alert.alert(
        "Enable Maintenance Mode",
        "Enabling maintenance mode will temporarily pause all user ride bookings across Android, iOS, and Web. Proceed?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Enable",
            style: "destructive",
            onPress: async () => {
              if (await saveSetting("maintenance_mode", true)) setMaintenanceMode(true);
            },
          },
        ]
      );
    } else {
      void (async () => {
        if (await saveSetting("maintenance_mode", false)) setMaintenanceMode(false);
      })();
    }
  };

  const handleToggleCash = async (val: boolean) => {
    if (await saveSetting("allow_cash_rides", val)) setAllowCashRides(val);
  };

  const handleToggleAutoVerify = async (val: boolean) => {
    if (await saveSetting("auto_verify_documents", val)) setAutoVerifyDocs(val);
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

  const adminInitials = (
    user?.full_name ||
    (user as any)?.name ||
    user?.email ||
    "AD"
  )
    .slice(0, 2)
    .toUpperCase();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Platform Status — real, derived from whether /admin/settings is reachable */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>Backend Infrastructure</Text>
          <View style={[styles.livePill, !apiOnline && styles.livePillDown]}>
            <View style={[styles.greenDot, !apiOnline && styles.redDot]} />
            <Text style={[styles.livePillText, !apiOnline && styles.livePillTextDown]}>
              {apiOnline ? "ALL SYSTEMS OPERATIONAL" : "API UNREACHABLE"}
            </Text>
          </View>
        </View>

        <View style={styles.servicesGrid}>
          <View style={styles.serviceItem}>
            <Ionicons name="server-outline" size={16} color={apiOnline ? "#16A34A" : "#DC2626"} />
            <Text style={styles.serviceName}>FastAPI API</Text>
            <Text style={styles.serviceStatus}>{apiOnline ? "Online" : "Unreachable"}</Text>
          </View>

          <View style={styles.serviceItem}>
            <Ionicons name="file-tray-stacked-outline" size={16} color={apiOnline ? "#16A34A" : "#DC2626"} />
            <Text style={styles.serviceName}>PostgreSQL DB</Text>
            <Text style={styles.serviceStatus}>{dbStatus}</Text>
          </View>

          <View style={styles.serviceItem}>
            <Ionicons name="card-outline" size={16} color={apiOnline ? "#16A34A" : "#DC2626"} />
            <Text style={styles.serviceName}>Payments (Razorpay)</Text>
            <Text style={styles.serviceStatus}>{apiOnline ? "Active" : "Unknown"}</Text>
          </View>

          <View style={styles.serviceItem}>
            <Ionicons name="chatbox-ellipses-outline" size={16} color={apiOnline ? "#16A34A" : "#DC2626"} />
            <Text style={styles.serviceName}>Email OTP</Text>
            <Text style={styles.serviceStatus}>{apiOnline ? "Active" : "Unknown"}</Text>
          </View>
        </View>
      </View>

      {/* Fare & Commission Settings */}
      <Text style={styles.sectionHeading}>Fare & Commission Policies</Text>

      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Platform Commission Rate</Text>
            <Text style={styles.settingSub}>Deducted per completed ride</Text>
          </View>
          <View style={styles.valueBadge}>
            <Text style={styles.valueBadgeText}>10.0%</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Cash Ride Fee</Text>
            <Text style={styles.settingSub}>Per completed cash ride, settled daily</Text>
          </View>
          <View style={styles.valueBadge}>
            <Text style={styles.valueBadgeText}>₹10.00</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Allow Cash Settlements</Text>
            <Text style={styles.settingSub}>Direct cash payment from rider</Text>
          </View>
          <Switch
            value={allowCashRides}
            onValueChange={handleToggleCash}
            trackColor={{ false: "#CBD5E1", true: "#DCFCE7" }}
            thumbColor={allowCashRides ? "#16A34A" : "#94A3B8"}
          />
        </View>
      </View>

      {/* Safety & Verification Rules */}
      <Text style={styles.sectionHeading}>Verification & Safety</Text>

      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Auto-Verify Clear Documents</Text>
            <Text style={styles.settingSub}>Approve documents passing provider checks</Text>
          </View>
          <Switch
            value={autoVerifyDocs}
            onValueChange={handleToggleAutoVerify}
            trackColor={{ false: "#CBD5E1", true: "#DCFCE7" }}
            thumbColor={autoVerifyDocs ? "#16A34A" : "#94A3B8"}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>SOS Emergency Protocol</Text>
            <Text style={styles.settingSub}>Admin escalates manually to 112</Text>
          </View>
          <Ionicons name="information-circle-outline" size={20} color="#2563EB" />
        </View>
      </View>

      {/* Maintenance & Cache Controls */}
      <Text style={styles.sectionHeading}>Platform Operations</Text>

      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Maintenance Mode</Text>
            <Text style={styles.settingSub}>Pause ride bookings platform-wide</Text>
          </View>
          <Switch
            value={maintenanceMode}
            onValueChange={handleToggleMaintenance}
            trackColor={{ false: "#CBD5E1", true: "#FEE2E2" }}
            thumbColor={maintenanceMode ? "#DC2626" : "#94A3B8"}
          />
        </View>
      </View>

      {/* Current Admin Session */}
      <Text style={styles.sectionHeading}>Administrator Session</Text>

      <View style={styles.card}>
        <View style={styles.adminUserRow}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>{adminInitials}</Text>
          </View>

          <View style={styles.adminDetails}>
            <Text style={styles.adminName}>
              {user?.full_name || (user as any)?.name || "Super Admin"}
            </Text>
            <Text style={styles.adminEmail}>
              {user?.email || "admin@syncrogo.in"}
            </Text>
            <Text style={styles.adminRole}>Role: Administrator</Text>
          </View>
        </View>

        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.logoutButtonText}>Log Out from Admin Portal</Text>
        </Pressable>
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
    padding: 16,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(22, 163, 74, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  livePillDown: {
    backgroundColor: "rgba(220, 38, 38, 0.2)",
  },
  redDot: {
    backgroundColor: "#DC2626",
  },
  livePillTextDown: {
    color: "#FCA5A5",
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  livePillText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#4ADE80",
    letterSpacing: 0.5,
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  serviceItem: {
    flex: 1,
    minWidth: "46%",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 10,
    borderRadius: 10,
    gap: 2,
  },
  serviceName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 4,
  },
  serviceStatus: {
    fontSize: 10,
    color: "#94A3B8",
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  settingInfo: {
    flex: 1,
    marginRight: 10,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  settingSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  valueBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  valueBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 10,
  },
  adminUserRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  avatarBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#2563EB",
  },
  adminDetails: {
    flex: 1,
  },
  adminName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  adminEmail: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  adminRole: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEE2E2",
    paddingVertical: 12,
    borderRadius: 12,
  },
  logoutButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#DC2626",
  },
});
