import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import apiClient from "../../api/client";

type SosAlert = {
  id: number;
  ride_id: string;
  user_name: string;
  user_phone: string;
  user_role: "passenger" | "driver";
  location_name: string;
  coordinates: { latitude: number; longitude: number };
  timestamp: string;
  status: "active" | "investigating" | "resolved";
};

export default function AdminSosScreen() {
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await apiClient.get<SosAlert[]>("/admin/sos");
      const list = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
      setAlerts(list);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchAlerts();
  }, [fetchAlerts]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchAlerts();
  };

  const activeCount = alerts.filter((a) => a.status === "active").length;

  const handleCall = (phone: string) => {
    void Linking.openURL(`tel:${phone}`);
  };

  const handleDispatchEmergency = (alertItem: SosAlert) => {
    Alert.alert(
      "Dispatch Emergency Services",
      `Call National Emergency Police (112) for ${alertItem.user_name} at ${alertItem.location_name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Call 112",
          style: "destructive",
          onPress: () => {
            void Linking.openURL("tel:112");
          },
        },
      ]
    );
  };

  const handleUpdateStatus = (
    alertItem: SosAlert,
    status: "investigating" | "resolved"
  ) => {
    Alert.alert(
      "Update Emergency Status",
      `Mark emergency #${alertItem.id} as ${status.toUpperCase()}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          onPress: async () => {
            try {
              await apiClient.patch(`/admin/sos/${alertItem.id}`, { status });
            } catch {}
            setAlerts((prev) =>
              prev.map((a) => (a.id === alertItem.id ? { ...a, status } : a))
            );
            Alert.alert("Status Updated", `Alert marked as ${status}.`);
          },
        },
      ]
    );
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filter === "all") return true;
    return a.status === filter;
  });

  return (
    <View style={styles.container}>
      {/* Alert Banner */}
      <View
        style={[
          styles.banner,
          activeCount > 0 ? styles.bannerActive : styles.bannerClear,
        ]}
      >
        <View style={styles.bannerIconBox}>
          <Ionicons
            name={activeCount > 0 ? "warning" : "shield-checkmark"}
            size={28}
            color={activeCount > 0 ? "#DC2626" : "#16A34A"}
          />
        </View>

        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>
            {activeCount > 0
              ? `${activeCount} ACTIVE EMERGENCY ALERTS`
              : "ALL SOS ALERTS CLEAR"}
          </Text>
          <Text style={styles.bannerSubtitle}>
            {activeCount > 0
              ? "Immediate action and dispatch required."
              : "No ongoing SOS triggers reported."}
          </Text>
        </View>

        <Pressable
          onPress={() => void Linking.openURL("tel:112")}
          style={styles.call112Btn}
        >
          <Ionicons name="call" size={14} color="#FFFFFF" />
          <Text style={styles.call112Text}>112</Text>
        </Pressable>
      </View>

      {/* Filter Chips */}
      <View style={styles.chipsRow}>
        {["all", "active", "investigating", "resolved"].map((s) => (
          <Pressable
            key={s}
            onPress={() => setFilter(s)}
            style={[styles.chip, filter === s && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                filter === s && styles.chipTextActive,
              ]}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Alerts List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Connecting to SOS emergency feed...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAlerts}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="shield-checkmark-outline" size={48} color="#16A34A" />
              <Text style={styles.emptyTitle}>No emergencies</Text>
              <Text style={styles.emptySubtitle}>
                No SOS alerts match the selected filter.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isActive = item.status === "active";
            const isInvestigating = item.status === "investigating";

            return (
              <View
                style={[
                  styles.card,
                  isActive && styles.cardActive,
                  isInvestigating && styles.cardInvestigating,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View
                      style={[
                        styles.statusTag,
                        isActive
                          ? styles.statusTagActive
                          : isInvestigating
                          ? styles.statusTagInvestigating
                          : styles.statusTagResolved,
                      ]}
                    >
                      <Text style={styles.statusTagText}>
                        {item.status.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.rideId}>{item.ride_id}</Text>
                  </View>

                  <Text style={styles.timestamp}>{item.timestamp}</Text>
                </View>

                {/* Person details */}
                <View style={styles.personRow}>
                  <Ionicons name="person-circle" size={32} color="#475569" />
                  <View style={styles.personInfo}>
                    <Text style={styles.personName}>
                      {item.user_name} (
                      <Text style={styles.roleText}>{item.user_role}</Text>)
                    </Text>
                    <Text style={styles.personPhone}>{item.user_phone}</Text>
                  </View>
                </View>

                {/* Location */}
                <View style={styles.locationBox}>
                  <Ionicons name="location" size={16} color="#DC2626" />
                  <Text style={styles.locationText}>{item.location_name}</Text>
                </View>

                {/* Coordinates */}
                <Text style={styles.coordsText}>
                  GPS: {item.coordinates.latitude.toFixed(4)},{" "}
                  {item.coordinates.longitude.toFixed(4)}
                </Text>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={() => handleCall(item.user_phone)}
                    style={styles.callUserBtn}
                  >
                    <Ionicons name="call-outline" size={14} color="#2563EB" />
                    <Text style={styles.callUserText}>Call User</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleDispatchEmergency(item)}
                    style={styles.dispatchBtn}
                  >
                    <Ionicons name="shield-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.dispatchText}>Dispatch 112</Text>
                  </Pressable>

                  {item.status !== "resolved" && (
                    <Pressable
                      onPress={() =>
                        handleUpdateStatus(
                          item,
                          isActive ? "investigating" : "resolved"
                        )
                      }
                      style={styles.resolveBtn}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={14}
                        color="#16A34A"
                      />
                      <Text style={styles.resolveText}>
                        {isActive ? "Investigate" : "Resolve"}
                      </Text>
                    </Pressable>
                  )}
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
  banner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  bannerActive: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  bannerClear: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  bannerIconBox: {
    marginRight: 10,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 0.3,
  },
  bannerSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  call112Btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DC2626",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  call112Text: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 13,
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
  cardActive: {
    borderColor: "#FECACA",
    borderWidth: 2,
    backgroundColor: "#FFF5F5",
  },
  cardInvestigating: {
    borderColor: "#FED7AA",
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTagActive: {
    backgroundColor: "#DC2626",
  },
  statusTagInvestigating: {
    backgroundColor: "#D97706",
  },
  statusTagResolved: {
    backgroundColor: "#16A34A",
  },
  statusTagText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  rideId: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  timestamp: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  roleText: {
    textTransform: "capitalize",
    fontWeight: "600",
  },
  personPhone: {
    fontSize: 11,
    color: "#2563EB",
    fontWeight: "700",
  },
  locationBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 8,
  },
  locationText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
    flex: 1,
  },
  coordsText: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 4,
    marginLeft: 2,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  callUserBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  callUserText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  dispatchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DC2626",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  dispatchText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  resolveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  resolveText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#16A34A",
  },
});
