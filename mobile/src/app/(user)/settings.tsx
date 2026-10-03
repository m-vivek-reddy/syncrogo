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
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Colors } from "../../constants/colors";
import { useAuth } from "../../auth/AuthContext";
import { useAuthStore } from "../../store/auth";
import apiClient from "../../api/client";
import { fetchConsent, updateConsent, type ConsentState } from "../../api/consent";
import { CONSENT_PURPOSES, POLICY_VERSION, EFFECTIVE_DATE, ENTITY } from "../../legal/legalContent";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void fetchConsent().then((res) => {
      if (res.ok && res.data) setConsent(res.data);
    });
  }, []);

  const toggle = async (key: string) => {
    if (!consent) return;
    const currently = consent.consent[key as keyof typeof consent.consent];
    setSavingKey(key);
    setFlash(null);
    const res = await updateConsent([key as any], !currently, "settings_toggle");
    setSavingKey(null);
    if (res.ok && res.data) {
      setConsent(res.data);
      setFlash(
        !currently
          ? "Consent granted. Your choice has been saved."
          : "Consent withdrawn. This takes effect immediately."
      );
      setTimeout(() => setFlash(null), 4000);
    } else {
      Alert.alert("Settings", res.message ?? "Could not save your choice.");
    }
  };

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

      {flash && (
        <View style={styles.flashCard}>
          <Text style={styles.flashText}>{flash}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Privacy & Consent</Text>
      <View style={styles.card}>
        {consent ? (
          CONSENT_PURPOSES.map((purpose, index) => {
            const key = purpose.key as keyof typeof consent.consent;
            const on = consent.consent[key];
            const isSaving = savingKey === purpose.key;
            return (
              <View key={purpose.key} style={index > 0 ? styles.rowBorder : styles.row}>
                <View style={styles.info}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title}>{purpose.label}</Text>
                    {purpose.required && <Text style={styles.requiredBadge}>REQUIRED</Text>}
                  </View>
                  <Text style={styles.sub}>{purpose.description}</Text>
                </View>
                <Switch
                  value={on}
                  onValueChange={() => toggle(purpose.key)}
                  disabled={isSaving}
                  trackColor={{ false: "#CBD5E1", true: purpose.required ? Colors.green : Colors.primary }}
                />
              </View>
            );
          })
        ) : (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading your consent settings…</Text>
          </View>
        )}
      </View>

      {consent?.policy_version && (
        <Text style={styles.policyNote}>
          You last agreed to policy version {consent.policy_version}
          {consent.recorded_at
            ? ` on ${new Date(consent.recorded_at).toLocaleDateString()}`
            : ""}
          . Current published version is {POLICY_VERSION} ({EFFECTIVE_DATE}).
        </Text>
      )}

      <Text style={styles.sectionTitle}>Legal</Text>
      <View style={styles.card}>
        <Pressable
          onPress={() => router.push({ pathname: "/(user)/legal", params: { doc: "terms" } })}
          style={styles.menuRow}
        >
          <Text style={styles.title}>Terms & Conditions</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push({ pathname: "/(user)/legal", params: { doc: "privacy" } })}
          style={[styles.menuRow, styles.border]}
        >
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push({ pathname: "/(user)/legal", params: { doc: "cookies" } })}
          style={[styles.menuRow, styles.border]}
        >
          <Text style={styles.title}>Cookie Policy</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            Alert.alert(
              "Grievance",
              `Write to ${ENTITY.grievanceEmail} with your name, registered email/mobile, description of the issue and requested resolution.`
            )
          }
          style={[styles.menuRow, styles.border]}
        >
          <Text style={styles.title}>Grievance & Contact</Text>
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
  rowBorder: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  menuRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 },
  border: { borderTopWidth: 1, borderTopColor: "#F8FAFC" },
  info: { flex: 1, paddingRight: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontSize: 14, fontWeight: "700", color: Colors.text },
  requiredBadge: {
    fontSize: 8,
    fontWeight: "800",
    color: "#B45309",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
    letterSpacing: 0.5,
  },
  sub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  chevron: { fontSize: 18, color: "#94A3B8" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14 },
  loadingText: { fontSize: 13, color: Colors.textSecondary },
  flashCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginTop: 8,
  },
  flashText: { fontSize: 12, color: "#065F46", fontWeight: "600" },
  policyNote: { fontSize: 11, color: "#94A3B8", marginTop: 10, paddingHorizontal: 4 },
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
