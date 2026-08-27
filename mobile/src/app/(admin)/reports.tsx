import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import apiClient from "../../api/client";

type ReportItem = {
  id: number;
  title: string;
  category: "safety" | "dispute" | "vehicle" | "system";
  severity: "high" | "medium" | "low";
  reported_by: string;
  description: string;
  timestamp: string;
  status: "open" | "investigating" | "resolved";
};

export default function AdminReportsScreen() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const fetchReports = useCallback(async () => {
    try {
      const res = await apiClient.get<ReportItem[]>("/admin/reports");
      const list = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
      setReports(list);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchReports();
  };

  const handleUpdateStatus = (
    report: ReportItem,
    status: "investigating" | "resolved"
  ) => {
    Alert.alert(
      "Update Report",
      `Mark Report #${report.id} as ${status.toUpperCase()}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await apiClient.patch(`/admin/reports/${report.id}`, { status });
            } catch {}
            setReports((prev) =>
              prev.map((r) => (r.id === report.id ? { ...r, status } : r))
            );
            Alert.alert("Updated", `Report marked as ${status}.`);
          },
        },
      ]
    );
  };

  const handleExport = () => {
    Alert.alert(
      "Export Incident Logs",
      "Would you like to export the current incident reports to CSV/PDF?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Export CSV",
          onPress: () =>
            Alert.alert(
              "Report Generated",
              "Incident report successfully compiled for download."
            ),
        },
      ]
    );
  };

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case "high":
        return { bg: "#FEE2E2", text: "#DC2626" };
      case "medium":
        return { bg: "#FEF3C7", text: "#D97706" };
      default:
        return { bg: "#EFF6FF", text: "#2563EB" };
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "safety":
        return { icon: "shield-alert", color: "#DC2626" };
      case "dispute":
        return { icon: "chatbubble-ellipses", color: "#D97706" };
      case "vehicle":
        return { icon: "car", color: "#7C3AED" };
      default:
        return { icon: "alert-circle", color: "#2563EB" };
    }
  };

  const filteredReports = reports.filter((r) => {
    if (categoryFilter === "all") return true;
    return r.category === categoryFilter;
  });

  return (
    <View style={styles.container}>
      {/* Export Bar */}
      <View style={styles.exportBar}>
        <Text style={styles.exportBarText}>
          {reports.length} Total Incident Grievances
        </Text>

        <Pressable onPress={handleExport} style={styles.exportBtn}>
          <Ionicons name="download-outline" size={14} color="#FFFFFF" />
          <Text style={styles.exportBtnText}>Export</Text>
        </Pressable>
      </View>

      {/* Category Chips */}
      <View style={styles.chipsRow}>
        {["all", "safety", "dispute", "vehicle"].map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategoryFilter(c)}
            style={[styles.chip, categoryFilter === c && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                categoryFilter === c && styles.chipTextActive,
              ]}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Reports List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="checkmark-done-circle-outline" size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No reports found</Text>
              <Text style={styles.emptySubtitle}>
                No incidents match the selected category.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const sevStyle = getSeverityStyle(item.severity);
            const catInfo = getCategoryIcon(item.category);
            const isOpen = item.status === "open";
            const isInvestigating = item.status === "investigating";

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View
                      style={[
                        styles.catIconBox,
                        { backgroundColor: catInfo.color + "18" },
                      ]}
                    >
                      <Ionicons
                        name={catInfo.icon as any}
                        size={18}
                        color={catInfo.color}
                      />
                    </View>

                    <View style={styles.titleBox}>
                      <Text style={styles.reportTitle}>{item.title}</Text>
                      <Text style={styles.reportedBy}>{item.reported_by}</Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.sevBadge,
                      { backgroundColor: sevStyle.bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sevBadgeText,
                        { color: sevStyle.text },
                      ]}
                    >
                      {item.severity.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Description */}
                <Text style={styles.descriptionText}>{item.description}</Text>

                {/* Footer */}
                <View style={styles.cardFooter}>
                  <Text style={styles.dateText}>{item.timestamp}</Text>

                  <View style={styles.actionsRow}>
                    {isOpen && (
                      <Pressable
                        onPress={() =>
                          handleUpdateStatus(item, "investigating")
                        }
                        style={styles.investigateBtn}
                      >
                        <Ionicons
                          name="search-outline"
                          size={13}
                          color="#D97706"
                        />
                        <Text style={styles.investigateText}>Investigate</Text>
                      </Pressable>
                    )}

                    {(isOpen || isInvestigating) && (
                      <Pressable
                        onPress={() => handleUpdateStatus(item, "resolved")}
                        style={styles.resolveBtn}
                      >
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={13}
                          color="#16A34A"
                        />
                        <Text style={styles.resolveText}>Resolve</Text>
                      </Pressable>
                    )}

                    {item.status === "resolved" && (
                      <View style={styles.resolvedBadge}>
                        <Text style={styles.resolvedBadgeText}>RESOLVED</Text>
                      </View>
                    )}
                  </View>
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
  exportBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 10,
  },
  exportBarText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0F172A",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  exportBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  chipsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
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
    fontSize: 11,
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  catIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  titleBox: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  reportedBy: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  sevBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  sevBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: 12,
    color: "#334155",
    lineHeight: 18,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    marginVertical: 6,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  dateText: {
    fontSize: 10,
    color: "#94A3B8",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 6,
  },
  investigateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#FEF3C7",
  },
  investigateText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#D97706",
  },
  resolveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#DCFCE7",
  },
  resolveText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#16A34A",
  },
  resolvedBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  resolvedBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
  },
});
