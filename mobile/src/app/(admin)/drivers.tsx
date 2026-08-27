import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "../../constants/colors";
import apiClient from "../../api/client";

type DriverItem = {
  id: number;
  name: string;
  email: string;
  vehicle_type?: string;
  vehicle_number?: string;
  is_verified?: boolean;
  is_online?: boolean;
  rating?: number;
  total_rides?: number;
  status?: "verified" | "pending" | "suspended";
};

export default function AdminDriversScreen() {
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const fetchDrivers = useCallback(async () => {
    try {
      const res = await apiClient.get<DriverItem[]>("/admin/drivers");
      const list = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
      setDrivers(list);
    } catch {
      setDrivers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchDrivers();
  }, [fetchDrivers]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchDrivers();
  };

  const handleToggleVerification = (driver: DriverItem) => {
    const isCurrentlyVerified = driver.status === "verified" || driver.is_verified;
    const nextStatus = isCurrentlyVerified ? "suspended" : "verified";

    Alert.alert(
      isCurrentlyVerified ? "Suspend Driver" : "Approve Driver",
      `Are you sure you want to mark ${driver.name} as ${nextStatus.toUpperCase()}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isCurrentlyVerified ? "Suspend" : "Approve",
          style: isCurrentlyVerified ? "destructive" : "default",
          onPress: async () => {
            try {
              await apiClient.patch(`/admin/drivers/${driver.id}/status`, {
                status: nextStatus,
              });
            } catch {}
            setDrivers((prev) =>
              prev.map((d) =>
                d.id === driver.id
                  ? {
                      ...d,
                      is_verified: nextStatus === "verified",
                      status: nextStatus as any,
                    }
                  : d
              )
            );
            Alert.alert("Status Updated", `${driver.name} is now ${nextStatus}.`);
          },
        },
      ]
    );
  };

  const filteredDrivers = drivers.filter((d) => {
    const nameStr = (d.name || "").toLowerCase();
    const emailStr = (d.email || "").toLowerCase();
    const vehicleStr = (d.vehicle_number || d.vehicle_type || "").toLowerCase();
    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query ||
      nameStr.includes(query) ||
      emailStr.includes(query) ||
      vehicleStr.includes(query);

    const currentStatus = d.status || (d.is_verified ? "verified" : "pending");
    if (filterStatus === "all") return matchesSearch;
    return matchesSearch && currentStatus === filterStatus;
  });

  const getStatusBadge = (status?: string, isVerified?: boolean) => {
    const s = status || (isVerified ? "verified" : "pending");
    switch (s) {
      case "verified":
        return { bg: "#DCFCE7", text: "#16A34A", label: "VERIFIED" };
      case "suspended":
        return { bg: "#FEE2E2", text: "#DC2626", label: "SUSPENDED" };
      default:
        return { bg: "#FEF3C7", text: "#D97706", label: "PENDING REVIEW" };
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#94A3B8" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search driver name, email, or vehicle..."
          placeholderTextColor="#94A3B8"
          style={styles.searchInput}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#94A3B8" />
          </Pressable>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.chipsRow}>
        {["all", "verified", "pending", "suspended"].map((s) => (
          <Pressable
            key={s}
            onPress={() => setFilterStatus(s)}
            style={[styles.chip, filterStatus === s && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                filterStatus === s && styles.chipTextActive,
              ]}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Driver List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading registered drivers...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDrivers}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="car-outline" size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No drivers found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search criteria or filter.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const badge = getStatusBadge(item.status, item.is_verified);
            const isVerified = item.status === "verified" || item.is_verified;

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.avatarBox}>
                    <Ionicons name="car-sport" size={22} color="#16A34A" />
                    {item.is_online && <View style={styles.onlineDot} />}
                  </View>

                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{item.name}</Text>
                    <Text style={styles.driverEmail}>{item.email}</Text>
                    <Text style={styles.vehicleText}>
                      🚗 {item.vehicle_type || "Standard Vehicle"} •{" "}
                      <Text style={styles.vehicleNum}>
                        {item.vehicle_number || "TS-XX-XXXX"}
                      </Text>
                    </Text>
                  </View>

                  <View
                    style={[styles.statusBadge, { backgroundColor: badge.bg }]}
                  >
                    <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>

                {/* Rating & Stats Bar */}
                <View style={styles.statsBar}>
                  <View style={styles.statItem}>
                    <Text style={styles.statIcon}>⭐</Text>
                    <Text style={styles.statText}>
                      {item.rating ? item.rating.toFixed(1) : "N/A"}
                    </Text>
                  </View>
                  <Text style={styles.statDivider}>•</Text>
                  <View style={styles.statItem}>
                    <Text style={styles.statText}>
                      {item.total_rides ?? 0} Completed Rides
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={() => router.push("/(admin)/documents")}
                    style={styles.docBtn}
                  >
                    <Ionicons name="document-text-outline" size={14} color="#2563EB" />
                    <Text style={styles.docBtnText}>Docs</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleToggleVerification(item)}
                    style={[
                      styles.verifyActionBtn,
                      isVerified ? styles.suspendBtn : styles.approveBtn,
                    ]}
                  >
                    <Ionicons
                      name={isVerified ? "ban-outline" : "checkmark-circle-outline"}
                      size={15}
                      color="#FFFFFF"
                    />
                    <Text style={styles.verifyActionBtnText}>
                      {isVerified ? "Suspend" : "Approve"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    color: "#0F172A",
  },
  chipsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    gap: 12,
    paddingBottom: 30,
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    position: "relative",
  },
  onlineDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#16A34A",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  driverEmail: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  vehicleText: {
    fontSize: 12,
    color: "#334155",
    marginTop: 4,
    fontWeight: "500",
  },
  vehicleNum: {
    fontWeight: "800",
    color: "#0F172A",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statIcon: {
    fontSize: 12,
  },
  statText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  statDivider: {
    color: "#CBD5E1",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  docBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
  },
  docBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  verifyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  approveBtn: {
    backgroundColor: "#16A34A",
  },
  suspendBtn: {
    backgroundColor: "#DC2626",
  },
  verifyActionBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
