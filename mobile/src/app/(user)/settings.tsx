import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { Colors } from "../../constants/colors";
import { useAuth } from "../../auth/AuthContext";
import { useAuthStore } from "../../store/auth";
import apiClient from "../../api/client";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [locationTracking, setLocationTracking] = useState(true);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    const cleanEmail = confirmEmail.trim().toLowerCase();
    const userEmail = (user?.email || "").trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert("Email Required", "Please type your email address to confirm deletion.");
      return;
    }

    if (userEmail && cleanEmail !== userEmail) {
      Alert.alert("Email Mismatch", "The email address you typed does not match your account email address.");
      return;
    }

    setDeleting(true);
    try {
      await apiClient.post("/api/v1/users/delete-account", {
        email: cleanEmail,
      });

      setShowDeleteModal(false);
      await logout();
      useAuthStore.getState().logout();

      Alert.alert("Account Deleted", "Your SyncroGo account has been permanently deleted.");
      router.replace("/(auth)/login");
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.message || "Failed to delete account.";
      Alert.alert("Delete Failed", detail);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/(user)/profile")} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>App Settings</Text>
      </View>

      <Text style={styles.sectionTitle}>Notifications</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.title}>Push Notifications</Text>
            <Text style={styles.sub}>Instant alerts for ride updates</Text>
          </View>
          <Switch value={pushEnabled} onValueChange={setPushEnabled} trackColor={{ false: "#CBD5E1", true: Colors.primary }} />
        </View>
        <View style={[styles.row, styles.border]}>
          <View style={styles.info}>
            <Text style={styles.title}>Email Receipts & Invoices</Text>
            <Text style={styles.sub}>Receive trip invoices in inbox</Text>
          </View>
          <Switch value={emailAlerts} onValueChange={setEmailAlerts} trackColor={{ false: "#CBD5E1", true: Colors.primary }} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Privacy & Location</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.title}>Live Location Sharing</Text>
            <Text style={styles.sub}>Share coordinates during trips</Text>
          </View>
          <Switch value={locationTracking} onValueChange={setLocationTracking} trackColor={{ false: "#CBD5E1", true: Colors.green }} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Legal</Text>
      <View style={styles.card}>
        <Pressable
          onPress={() => Alert.alert("Terms of Service", "SyncroGo Community Carpool Agreement v2.1")}
          style={styles.menuRow}
        >
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <Pressable
          onPress={() => Alert.alert("Privacy Policy", "SyncroGo Privacy Policy compliant with DPDP 2023")}
          style={[styles.menuRow, styles.border]}
        >
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>

      <Text style={styles.dangerSectionTitle}>Danger Zone</Text>
      <View style={styles.dangerCard}>
        <Pressable
          onPress={() => setShowDeleteModal(true)}
          style={styles.deleteRow}
        >
          <View style={styles.info}>
            <Text style={styles.deleteTitle}>Delete Account</Text>
            <Text style={styles.deleteSub}>Permanently delete your profile & data</Text>
          </View>
          <Text style={styles.deleteChevron}>›</Text>
        </Pressable>
      </View>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete Your Account</Text>
            <Text style={styles.modalSub}>
              This action is permanent and cannot be undone. All your rides, bookings, and vehicle details will be erased.
            </Text>

            <Text style={styles.emailLabel}>
              Type your login email ({user?.email || "your account email"}):
            </Text>
            <TextInput
              value={confirmEmail}
              onChangeText={setConfirmEmail}
              placeholder="Enter your email address"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.emailInput}
            />

            <View style={styles.modalBtnRow}>
              <Pressable
                onPress={() => {
                  setShowDeleteModal(false);
                  setConfirmEmail("");
                }}
                disabled={deleting}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleDeleteAccount}
                disabled={deleting || !confirmEmail.trim()}
                style={[
                  styles.deleteConfirmBtn,
                  (deleting || !confirmEmail.trim()) && styles.disabledBtn,
                ]}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteConfirmBtnText}>Delete Account</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  sectionTitle: { fontSize: 13, fontWeight: "800", color: "#94A3B8", textTransform: "uppercase", marginBottom: 8, marginTop: 14 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  menuRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 },
  border: { borderTopWidth: 1, borderTopColor: "#F8FAFC" },
  info: { flex: 1, paddingRight: 10 },
  title: { fontSize: 14, fontWeight: "700", color: Colors.text },
  sub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  chevron: { fontSize: 18, color: "#94A3B8" },
  dangerSectionTitle: { fontSize: 13, fontWeight: "800", color: "#DC2626", textTransform: "uppercase", marginBottom: 8, marginTop: 18 },
  dangerCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  deleteRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  deleteTitle: { fontSize: 14, fontWeight: "800", color: "#DC2626" },
  deleteSub: { fontSize: 12, color: "#991B1B", marginTop: 2 },
  deleteChevron: { fontSize: 18, color: "#DC2626", fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 22,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: "900", color: "#991B1B" },
  modalSub: { fontSize: 12, color: "#64748B", marginTop: 6, lineHeight: 18 },
  emailLabel: { fontSize: 12, fontWeight: "800", color: "#1E293B", marginTop: 16, marginBottom: 8 },
  emailInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    paddingHorizontal: 14,
    fontSize: 13,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  modalBtnRow: { flexDirection: "row", gap: 10, marginTop: 20, justifyContent: "flex-end" },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  cancelBtnText: { fontSize: 13, fontWeight: "700", color: "#475569" },
  deleteConfirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#DC2626",
  },
  deleteConfirmBtnText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
  disabledBtn: { opacity: 0.5 },
});
