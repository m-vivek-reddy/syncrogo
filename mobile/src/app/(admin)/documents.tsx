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
import { Colors } from "../../constants/colors";
import apiClient from "../../api/client";

type DocumentItem = {
  id: number;
  driver_id: number;
  driver_name: string;
  driver_email: string;
  doc_type: "license" | "rc" | "insurance" | "aadhaar" | string;
  doc_number?: string;
  submitted_at: string;
  status: "pending" | "approved" | "rejected";
  file_url?: string;
};

export default function AdminDocumentsScreen() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [search, setSearch] = useState("");

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await apiClient.get<DocumentItem[]>("/admin/documents");
      const list = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
      setDocuments(list);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchDocuments();
  };

  const handleDecision = (doc: DocumentItem, status: "approved" | "rejected") => {
    const actionName = status === "approved" ? "Approve" : "Reject";
    Alert.alert(
      `${actionName} Document`,
      `Are you sure you want to ${status} this ${doc.doc_type.toUpperCase()} for ${doc.driver_name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: actionName,
          style: status === "rejected" ? "destructive" : "default",
          onPress: async () => {
            try {
              await apiClient.patch(`/admin/documents/${doc.id}`, { status });
            } catch {}
            setDocuments((prev) =>
              prev.map((d) => (d.id === doc.id ? { ...d, status } : d))
            );
            Alert.alert("Success", `Document marked as ${status}.`);
          },
        },
      ]
    );
  };

  const getDocTypeInfo = (type: string) => {
    switch (type.toLowerCase()) {
      case "license":
        return { label: "Driving License (DL)", icon: "id-card-outline", color: "#2563EB" };
      case "rc":
        return { label: "Vehicle RC", icon: "car-outline", color: "#16A34A" };
      case "insurance":
        return { label: "Vehicle Insurance", icon: "shield-checkmark-outline", color: "#7C3AED" };
      case "aadhaar":
        return { label: "Aadhaar Card", icon: "finger-print-outline", color: "#D97706" };
      default:
        return { label: type.toUpperCase(), icon: "document-text-outline", color: "#475569" };
    }
  };

  const filteredDocs = documents.filter((d) => {
    const nameStr = (d.driver_name || "").toLowerCase();
    const emailStr = (d.driver_email || "").toLowerCase();
    const numStr = (d.doc_number || "").toLowerCase();
    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query || nameStr.includes(query) || emailStr.includes(query) || numStr.includes(query);

    if (filterStatus === "all") return matchesSearch;
    return matchesSearch && d.status === filterStatus;
  });

  return (
    <View style={styles.container}>
      {/* Search Box */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#94A3B8" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search driver name or document number..."
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
        {["pending", "approved", "rejected", "all"].map((s) => (
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

      {/* Documents List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading submitted documents...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDocs}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="checkmark-done-circle-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No documents here</Text>
              <Text style={styles.emptySubtitle}>
                {filterStatus === "pending"
                  ? "All driver verification requests have been processed!"
                  : "No documents match the selected filter."}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const docInfo = getDocTypeInfo(item.doc_type);

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: docInfo.color + "18" },
                    ]}
                  >
                    <Ionicons
                      name={docInfo.icon as any}
                      size={24}
                      color={docInfo.color}
                    />
                  </View>

                  <View style={styles.docDetails}>
                    <Text style={styles.docType}>{docInfo.label}</Text>
                    <Text style={styles.driverName}>
                      Driver: <Text style={styles.boldText}>{item.driver_name}</Text>
                    </Text>
                    <Text style={styles.docNumber}>
                      Doc #: {item.doc_number || "Verified on file"}
                    </Text>
                    <Text style={styles.dateText}>
                      Submitted: {item.submitted_at}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      item.status === "approved"
                        ? styles.approvedBadge
                        : item.status === "rejected"
                        ? styles.rejectedBadge
                        : styles.pendingBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        item.status === "approved"
                          ? styles.approvedBadgeText
                          : item.status === "rejected"
                          ? styles.rejectedBadgeText
                          : styles.pendingBadgeText,
                      ]}
                    >
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                {item.status === "pending" && (
                  <View style={styles.actionsRow}>
                    <Pressable
                      onPress={() => handleDecision(item, "rejected")}
                      style={[styles.btn, styles.rejectBtn]}
                    >
                      <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleDecision(item, "approved")}
                      style={[styles.btn, styles.approveBtn]}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </Pressable>
                  </View>
                )}
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
    maxWidth: 240,
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
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  docDetails: {
    flex: 1,
  },
  docType: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  driverName: {
    fontSize: 12,
    color: "#475569",
    marginTop: 2,
  },
  boldText: {
    fontWeight: "800",
    color: "#0F172A",
  },
  docNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
    marginTop: 2,
  },
  dateText: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 6,
  },
  approvedBadge: {
    backgroundColor: "#DCFCE7",
  },
  approvedBadgeText: {
    color: "#16A34A",
    fontSize: 10,
    fontWeight: "900",
  },
  rejectedBadge: {
    backgroundColor: "#FEE2E2",
  },
  rejectedBadgeText: {
    color: "#DC2626",
    fontSize: 10,
    fontWeight: "900",
  },
  pendingBadge: {
    backgroundColor: "#FEF3C7",
  },
  pendingBadgeText: {
    color: "#D97706",
    fontSize: 10,
    fontWeight: "900",
  },
  statusBadgeText: {
    letterSpacing: 0.5,
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
  btn: {
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
  approveBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  rejectBtn: {
    backgroundColor: "#FEE2E2",
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#DC2626",
  },
});
