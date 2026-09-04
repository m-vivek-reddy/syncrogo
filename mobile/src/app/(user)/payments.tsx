import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Colors } from "../../constants/colors";
import api from "../../api/client";

type PaymentMethod = {
  id: number;
  name: string;
  detail: string;
  icon: string;
  isDefault?: boolean;
};

export default function PaymentsScreen() {
  const [balance] = useState("₹0.00");
  const [methods, setMethods] = useState<PaymentMethod[]>([]);

  const loadPaymentData = useCallback(async () => {
    try {
      const res = await api.get("/api/v1/payments/methods");
      const list = Array.isArray(res.data) ? res.data : [];
      if (list.length > 0) {
        setMethods(
          list.map((m: any, idx: number) => ({
            id: m.id || idx,
            name: m.card_brand ? `${m.card_brand} Card` : "Payment Method",
            detail: m.last_4 ? `•••• ${m.last_4}` : "Saved Account",
            icon: m.card_brand === "Visa" ? "💳" : "⚡",
            isDefault: m.is_default || false,
          }))
        );
      } else {
        setMethods([]);
      }
    } catch {
      setMethods([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPaymentData();
    }, [loadPaymentData])
  );

  const handleAddMoney = () => {
    Alert.alert("Add Money", "Choose amount to top up your SyncroGo Wallet:", [
      { text: "₹200", onPress: () => Alert.alert("Wallet Updated", "₹200 added to your wallet.") },
      { text: "₹500", onPress: () => Alert.alert("Wallet Updated", "₹500 added to your wallet.") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/(user)/profile")} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Payment Methods</Text>
      </View>

      {/* Wallet Balance Card */}
      <View style={styles.walletCard}>
        <Text style={styles.walletLabel}>SYNCROGO WALLET BALANCE</Text>
        <Text style={styles.walletAmount}>{balance}</Text>
        <Pressable onPress={handleAddMoney} style={styles.topUpBtn}>
          <Text style={styles.topUpText}>+ Top Up Wallet</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionHeader}>Saved Payment Methods</Text>
      {methods.length > 0 ? (
        methods.map((m) => (
          <View key={m.id} style={styles.methodCard}>
            <View style={styles.methodIcon}>
              <Text style={{ fontSize: 22 }}>{m.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodName}>{m.name}</Text>
              <Text style={styles.methodDetail}>{m.detail}</Text>
            </View>
            {m.isDefault && (
              <View style={styles.defaultPill}>
                <Text style={styles.defaultText}>Default</Text>
              </View>
            )}
          </View>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No saved payment methods yet</Text>
        </View>
      )}

      <Pressable
        onPress={() => Alert.alert("Add UPI", "Enter UPI ID to link.")}
        style={styles.addBtn}
      >
        <Text style={styles.addBtnText}>+ Add New UPI / Card</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16, marginTop: 4 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  backText: { fontSize: 22, fontWeight: "700", color: Colors.text, marginTop: -2 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: Colors.text },
  walletCard: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  walletLabel: { fontSize: 10, fontWeight: "800", color: "rgba(255,255,255,0.8)", letterSpacing: 0.5 },
  walletAmount: { fontSize: 32, fontWeight: "900", color: Colors.white, marginVertical: 8 },
  topUpBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  topUpText: { color: Colors.white, fontWeight: "800", fontSize: 13 },
  sectionHeader: { fontSize: 15, fontWeight: "800", color: Colors.text, marginBottom: 12 },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 10,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  methodName: { fontSize: 14, fontWeight: "800", color: Colors.text },
  methodDetail: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  defaultPill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  defaultText: { fontSize: 10, fontWeight: "800", color: Colors.greenDark },
  addBtn: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: "#DBEAFE",
    borderStyle: "dashed",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  addBtnText: { color: Colors.primary, fontWeight: "800", fontSize: 13 },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  emptyText: { color: Colors.textSecondary, fontSize: 13, fontWeight: "600" },
});
