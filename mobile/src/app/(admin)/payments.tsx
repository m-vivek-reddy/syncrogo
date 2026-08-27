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

type PaymentItem = {
  id: string;
  ride_id: string;
  passenger_name: string;
  driver_name: string;
  amount: number;
  platform_fee: number;
  driver_amount: number;
  payment_method: "UPI" | "Card" | "Cash" | string;
  status: "completed" | "pending" | "refunded";
  timestamp: string;
};

export default function AdminPaymentsScreen() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const fetchPayments = useCallback(async () => {
    try {
      const res = await apiClient.get<PaymentItem[]>("/admin/payments");
      const list = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
      setPayments(list);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchPayments();
  }, [fetchPayments]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchPayments();
  };

  const totalVolume = payments.reduce((acc, p) => acc + p.amount, 0);
  const totalCommission = payments.reduce((acc, p) => acc + p.platform_fee, 0);
  const totalDriverPayout = payments.reduce((acc, p) => acc + p.driver_amount, 0);

  const handleRefund = (item: PaymentItem) => {
    Alert.alert(
      "Issue Refund",
      `Are you sure you want to refund ₹${item.amount} to ${item.passenger_name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Refund ₹" + item.amount,
          style: "destructive",
          onPress: async () => {
            try {
              await apiClient.post(`/admin/payments/${item.id}/refund`);
            } catch {}
            setPayments((prev) =>
              prev.map((p) => (p.id === item.id ? { ...p, status: "refunded" } : p))
            );
            Alert.alert("Refund Issued", `₹${item.amount} returned to passenger.`);
          },
        },
      ]
    );
  };

  const filteredPayments = payments.filter((p) => {
    const pName = (p.passenger_name || "").toLowerCase();
    const dName = (p.driver_name || "").toLowerCase();
    const txnId = (p.id || "").toLowerCase();
    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query || pName.includes(query) || dName.includes(query) || txnId.includes(query);

    if (filter === "all") return matchesSearch;
    return matchesSearch && p.status === filter;
  });

  return (
    <View style={styles.container}>
      {/* Metrics Summary Grid */}
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { borderLeftColor: "#16A34A" }]}>
          <Text style={styles.metricLabel}>Total Volume</Text>
          <Text style={styles.metricValue}>₹{totalVolume.toLocaleString()}</Text>
        </View>

        <View style={[styles.metricCard, { borderLeftColor: "#2563EB" }]}>
          <Text style={styles.metricLabel}>Platform Fee (10%)</Text>
          <Text style={styles.metricValue}>₹{totalCommission.toLocaleString()}</Text>
        </View>

        <View style={[styles.metricCard, { borderLeftColor: "#7C3AED" }]}>
          <Text style={styles.metricLabel}>Driver Payouts</Text>
          <Text style={styles.metricValue}>₹{totalDriverPayout.toLocaleString()}</Text>
        </View>
      </View>

      {/* Search Box */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#94A3B8" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search Txn ID, passenger, or driver..."
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
        {["all", "completed", "pending", "refunded"].map((s) => (
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

      {/* Payments List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPayments}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="card-outline" size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No transactions found</Text>
              <Text style={styles.emptySubtitle}>
                No payment records match your search query.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isCompleted = item.status === "completed";
            const isRefunded = item.status === "refunded";

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.txnId}>{item.id}</Text>
                    <Text style={styles.rideId}>{item.ride_id}</Text>
                  </View>

                  <View style={styles.amountBox}>
                    <Text style={styles.amountText}>₹{item.amount}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        isCompleted
                          ? styles.badgeCompleted
                          : isRefunded
                          ? styles.badgeRefunded
                          : styles.badgePending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isCompleted
                            ? styles.badgeCompletedText
                            : isRefunded
                            ? styles.badgeRefundedText
                            : styles.badgePendingText,
                        ]}
                      >
                        {item.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Ride Breakdown */}
                <View style={styles.breakdownBox}>
                  <View style={styles.routeRow}>
                    <Text style={styles.partyLabel}>Passenger:</Text>
                    <Text style={styles.partyName}>{item.passenger_name}</Text>
                  </View>
                  <View style={styles.routeRow}>
                    <Text style={styles.partyLabel}>Driver:</Text>
                    <Text style={styles.partyName}>{item.driver_name}</Text>
                  </View>
                  <View style={styles.splitRow}>
                    <Text style={styles.splitText}>
                      Platform cut: <Text style={styles.boldText}>₹{item.platform_fee}</Text>
                    </Text>
                    <Text style={styles.splitText}>
                      Driver payout: <Text style={styles.boldText}>₹{item.driver_amount}</Text>
                    </Text>
                  </View>
                </View>

                {/* Footer info & actions */}
                <View style={styles.cardFooter}>
                  <Text style={styles.footerInfo}>
                    💳 {item.payment_method} • {item.timestamp}
                  </Text>

                  {isCompleted && (
                    <Pressable
                      onPress={() => handleRefund(item)}
                      style={styles.refundBtn}
                    >
                      <Ionicons name="refresh-outline" size={13} color="#DC2626" />
                      <Text style={styles.refundBtnText}>Refund</Text>
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
  metricsGrid: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 12,
    borderLeftWidth: 3.5,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 2,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 13,
    color: "#0F172A",
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
  },
  txnId: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  rideId: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  amountBox: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#16A34A",
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    marginTop: 3,
  },
  badgeCompleted: {
    backgroundColor: "#DCFCE7",
  },
  badgeCompletedText: {
    color: "#16A34A",
    fontSize: 9,
    fontWeight: "900",
  },
  badgePending: {
    backgroundColor: "#FEF3C7",
  },
  badgePendingText: {
    color: "#D97706",
    fontSize: 9,
    fontWeight: "900",
  },
  badgeRefunded: {
    backgroundColor: "#FEE2E2",
  },
  badgeRefundedText: {
    color: "#DC2626",
    fontSize: 9,
    fontWeight: "900",
  },
  statusBadgeText: {
    letterSpacing: 0.5,
  },
  breakdownBox: {
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    gap: 4,
  },
  routeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  partyLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  partyName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  splitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  splitText: {
    fontSize: 10,
    color: "#64748B",
  },
  boldText: {
    fontWeight: "800",
    color: "#0F172A",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  footerInfo: {
    fontSize: 11,
    color: "#64748B",
  },
  refundBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#FEE2E2",
  },
  refundBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#DC2626",
  },
});
