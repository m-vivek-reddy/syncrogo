import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";
import { Colors } from "../../constants/colors";

const DOCUMENTS = {
  terms: { title: "Terms & Conditions", path: "/terms" },
  privacy: { title: "Privacy Policy", path: "/privacy" },
  cookies: { title: "Cookie Policy", path: "/cookies" },
} as const;

type LegalDocumentKey = keyof typeof DOCUMENTS;

export default function LegalDocumentScreen() {
  const { document } = useLocalSearchParams<{ document?: string }>();
  const [failed, setFailed] = useState(false);
  const key = (document || "terms") as LegalDocumentKey;
  const baseUrl = process.env.EXPO_PUBLIC_LEGAL_BASE_URL?.replace(/\/+$/, "");
  const page = DOCUMENTS[key];
  const uri = useMemo(() => (page && baseUrl ? `${baseUrl}${page.path}` : null), [baseUrl, page]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>{page?.title || "Legal information"}</Text>
      </View>
      {!uri ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Legal pages unavailable</Text>
          <Text style={styles.noticeBody}>
            Configure EXPO_PUBLIC_LEGAL_BASE_URL to the canonical SyncroGo legal website.
          </Text>
        </View>
      ) : failed ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Could not load this policy</Text>
          <Text style={styles.noticeBody}>Check your connection and try again.</Text>
        </View>
      ) : (
        <WebView
          source={{ uri }}
          originWhitelist={["http://*", "https://*"]}
          startInLoadingState
          renderLoading={() => <ActivityIndicator style={styles.loader} color={Colors.primary} />}
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { height: 56, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  backButton: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#F1F5F9", borderRadius: 8 },
  backText: { color: Colors.text, fontWeight: "700" },
  title: { marginLeft: 12, color: Colors.text, fontSize: 16, fontWeight: "800" },
  loader: { flex: 1 },
  notice: { padding: 22 },
  noticeTitle: { color: Colors.text, fontSize: 16, fontWeight: "800" },
  noticeBody: { marginTop: 8, color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },
});
