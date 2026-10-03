import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import api from "../../api/client";
import { Colors } from "../../constants/colors";
import { CONSENT_PURPOSES, POLICY_VERSION, type ConsentPurposeKey } from "../../legal/legalContent";

type ConsentValues = Record<ConsentPurposeKey, boolean>;

export default function ConsentSettingsScreen() {
  const [consent, setConsent] = useState<ConsentValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ConsentPurposeKey | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/v1/users/me/consent");
      setConsent(response.data.consent);
    } catch (error: any) {
      Alert.alert("Consent unavailable", error?.response?.data?.detail || "Could not load your saved choices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const update = async (purpose: ConsentPurposeKey, granted: boolean) => {
    if (!consent) return;
    setSaving(purpose);
    try {
      const response = await api.put("/api/v1/users/me/consent", {
        purposes: [purpose],
        granted,
        source: "mobile_consent_settings",
      });
      setConsent(response.data.consent);
    } catch (error: any) {
      Alert.alert("Could not save choice", error?.response?.data?.detail || "Please try again.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/(user)/settings")} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Privacy & Consent</Text>
      </View>
      <Text style={styles.version}>Current policy version {POLICY_VERSION}</Text>
      {loading ? <Text style={styles.body}>Loading saved choices…</Text> : CONSENT_PURPOSES.map((purpose) => {
        const key = purpose.key as ConsentPurposeKey;
        return (
          <View key={key} style={styles.row}>
            <View style={styles.copy}>
              <Text style={styles.label}>{purpose.label}{purpose.required ? " · Required" : ""}</Text>
              <Text style={styles.body}>{purpose.description}</Text>
            </View>
            <Switch
              value={consent?.[key] ?? false}
              onValueChange={(value) => void update(key, value)}
              disabled={saving === key || !consent}
              trackColor={{ false: "#CBD5E1", true: Colors.primary }}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 36 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  backButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: Colors.white, borderWidth: 1, borderColor: "#E2E8F0", marginRight: 12 },
  backText: { color: Colors.text, fontWeight: "700" },
  title: { color: Colors.text, fontSize: 20, fontWeight: "800" },
  version: { color: Colors.textSecondary, fontSize: 12, marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, marginBottom: 10, backgroundColor: Colors.white, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12 },
  copy: { flex: 1 },
  label: { color: Colors.text, fontSize: 13, fontWeight: "800" },
  body: { color: Colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 4 },
});
