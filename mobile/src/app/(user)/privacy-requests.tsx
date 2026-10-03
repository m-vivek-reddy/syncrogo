import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import api from "../../api/client";
import { Colors } from "../../constants/colors";

type PrivacyRequestItem = {
  id: number;
  request_type: string;
  status: string;
  reason?: string | null;
  created_at?: string | null;
};

const REQUEST_TYPES = ["access", "correction", "erasure", "deletion"] as const;

export default function PrivacyRequestsScreen() {
  const [requests, setRequests] = useState<PrivacyRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [exportText, setExportText] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await api.get("/api/v1/privacy/requests");
      setRequests(response.data.requests || []);
    } catch (error: any) {
      Alert.alert("Requests unavailable", error?.response?.data?.detail || "Could not load your privacy requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const createRequest = async (requestType: string) => {
    setBusy(true);
    try {
      await api.post("/api/v1/privacy/requests", {
        request_type: requestType,
        reason: "Submitted from mobile privacy settings",
        source: "mobile",
      });
      await load();
      Alert.alert("Request submitted", "Submission is not the same as fulfilment. Track its status here.");
    } catch (error: any) {
      Alert.alert("Request failed", error?.response?.data?.detail || "Could not submit the request.");
    } finally {
      setBusy(false);
    }
  };

  const exportData = async () => {
    setBusy(true);
    try {
      const response = await api.post("/api/v1/privacy/export");
      setExportText(JSON.stringify(response.data.export, null, 2));
      Alert.alert("Export prepared", response.data.message || "Your export is ready to share.");
      await load();
    } catch (error: any) {
      Alert.alert("Export failed", error?.response?.data?.detail || "Could not prepare your export.");
    } finally {
      setBusy(false);
    }
  };

  const shareExport = async () => {
    if (!exportText) return;
    await Share.share({ message: exportText, title: "SyncroGo data export" });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/(user)/settings")} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Privacy Requests</Text>
      </View>
      <Text style={styles.note}>A submitted request remains open until it is reviewed and fulfilled.</Text>
      <View style={styles.actions}>
        {REQUEST_TYPES.map((requestType) => (
          <Pressable key={requestType} disabled={busy} onPress={() => void createRequest(requestType)} style={styles.actionButton}>
            <Text style={styles.actionText}>{requestType.charAt(0).toUpperCase() + requestType.slice(1)} request</Text>
          </Pressable>
        ))}
        <Pressable disabled={busy} onPress={() => void exportData()} style={[styles.actionButton, styles.exportButton]}>
          <Text style={styles.actionText}>Prepare data export</Text>
        </Pressable>
        {exportText && (
          <Pressable onPress={() => void shareExport()} style={styles.actionButton}>
            <Text style={styles.actionText}>Share prepared export</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.sectionTitle}>Request history</Text>
      {loading ? <ActivityIndicator color={Colors.primary} /> : requests.length === 0 ? (
        <Text style={styles.note}>No requests yet.</Text>
      ) : requests.map((item) => (
        <View key={item.id} style={styles.requestRow}>
          <Text style={styles.requestTitle}>{item.request_type.toUpperCase()} · {item.status.toUpperCase()}</Text>
          <Text style={styles.note}>{item.reason || "No details"}</Text>
          <Text style={styles.date}>{item.created_at ? new Date(item.created_at).toLocaleString() : ""}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 36 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  backButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: Colors.white, borderWidth: 1, borderColor: "#E2E8F0", marginRight: 12 },
  backText: { color: Colors.text, fontWeight: "700" },
  title: { color: Colors.text, fontSize: 20, fontWeight: "800" },
  note: { color: Colors.textSecondary, fontSize: 12, lineHeight: 18 },
  actions: { gap: 8, marginTop: 14, marginBottom: 24 },
  actionButton: { padding: 12, borderRadius: 10, backgroundColor: Colors.white, borderWidth: 1, borderColor: "#CBD5E1" },
  exportButton: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  actionText: { color: Colors.text, fontSize: 13, fontWeight: "800" },
  sectionTitle: { color: Colors.text, fontSize: 14, fontWeight: "800", marginBottom: 8 },
  requestRow: { padding: 13, marginBottom: 8, borderRadius: 10, backgroundColor: Colors.white, borderWidth: 1, borderColor: "#E2E8F0" },
  requestTitle: { color: Colors.text, fontSize: 12, fontWeight: "800" },
  date: { color: "#94A3B8", fontSize: 10, marginTop: 6 },
});
