import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../auth/AuthContext";

export default function AdminSettingsScreen() {
  const { user, logout } = useAuth();

  const [autoVerifyDocs, setAutoVerifyDocs] = useState(false);
  const [instantSosAlerts, setInstantSosAlerts] = useState(true);
  const [allowCashRides, setAllowCashRides] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [smsOtpGateway, setSmsOtpGateway] = useState(true);

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
            onPress: () => setMaintenanceMode(true),
          },
        ]
      );
    } else {
      setMaintenanceMode(false);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Server Cache",
      "Redis routing cache and geocoding buffers will be flushed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Flush Cache",
          onPress: () =>
            Alert.alert("Cache Cleared", "Platform cache successfully flushed."),
        },
      ]
    );
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Platform Status */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>Backend Infrastructure</Text>
          <View style={styles.livePill}>
            <View style={styles.greenDot} />
            <Text style={styles.livePillText}>ALL SYSTEMS OPERATIONAL</Text>
          </View>
        </View>

        <View style={styles.servicesGrid}>
          <View style={styles.serviceItem}>
            <Ionicons name="server-outline" size={16} color="#16A34A" />
            <Text style={styles.serviceName}>FastAPI API</Text>
            <Text style={styles.serviceStatus}>Online (10.0.2.2)</Text>
          </View>

          <View style={styles.serviceItem}>
            <Ionicons name="file-tray-stacked-outline" size={16} color="#16A34A" />
            <Text style={styles.serviceName}>PostgreSQL DB</Text>
            <Text style={styles.serviceStatus}>Connected</Text>
          </View>

          <View style={styles.serviceItem}>
            <Ionicons name="navigate-outline" size={16} color="#16A34A" />
            <Text style={styles.serviceName}>OSRM Router</Text>
            <Text style={styles.serviceStatus}>Ready</Text>
          </View>

          <View style={styles.serviceItem}>
            <Ionicons name="chatbox-ellipses-outline" size={16} color="#16A34A" />
            <Text style={styles.serviceName}>SMS/Email OTP</Text>
            <Text style={styles.serviceStatus}>Active</Text>
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
            <Text style={styles.settingLabel}>Base City Rate</Text>
            <Text style={styles.settingSub}>Hyderabad Standard Fare</Text>
          </View>
          <View style={styles.valueBadge}>
            <Text style={styles.valueBadgeText}>₹8.50 / km</Text>
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
            onValueChange={setAllowCashRides}
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
            <Text style={styles.settingLabel}>Instant SOS Police Escalation</Text>
            <Text style={styles.settingSub}>Auto-dispatch notification to 112</Text>
          </View>
          <Switch
            value={instantSosAlerts}
            onValueChange={setInstantSosAlerts}
            trackColor={{ false: "#CBD5E1", true: "#DCFCE7" }}
            thumbColor={instantSosAlerts ? "#16A34A" : "#94A3B8"}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Auto-Verify Clear Documents</Text>
            <Text style={styles.settingSub}>AI validation on driving licenses</Text>
          </View>
          <Switch
            value={autoVerifyDocs}
            onValueChange={setAutoVerifyDocs}
            trackColor={{ false: "#CBD5E1", true: "#DCFCE7" }}
            thumbColor={autoVerifyDocs ? "#16A34A" : "#94A3B8"}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>SMS OTP Delivery</Text>
            <Text style={styles.settingSub}>Two-step login security delivery</Text>
          </View>
          <Switch
            value={smsOtpGateway}
            onValueChange={setSmsOtpGateway}
            trackColor={{ false: "#CBD5E1", true: "#DCFCE7" }}
            thumbColor={smsOtpGateway ? "#16A34A" : "#94A3B8"}
          />
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

        <View style={styles.divider} />

        <Pressable onPress={handleClearCache} style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Flush Server & Router Cache</Text>
            <Text style={styles.settingSub}>Purge Redis & map buffers</Text>
          </View>
          <Ionicons name="trash-bin-outline" size={20} color="#D97706" />
        </Pressable>
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
              {user?.email || "admin@syncrogo.com"}
            </Text>
            <Text style={styles.adminRole}>Role: Super Administrator</Text>
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
