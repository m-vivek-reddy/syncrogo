import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { WebView } from "react-native-webview";
import { API_BASE_URL } from "../api/client";
import { Colors } from "../constants/colors";
import { useAuthStore } from "../store/auth";

export default function DocumentViewerScreen() {
  const { document_id: documentIdParam } = useLocalSearchParams<{ document_id?: string }>();
  const token = useAuthStore((state) => state.token);
  const [loadError, setLoadError] = useState<string | null>(null);
  const documentId = Number(documentIdParam);

  if (!Number.isSafeInteger(documentId) || documentId <= 0 || !token) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Document or signed-in session is unavailable.</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const uri = `${API_BASE_URL}/api/v1/documents/${documentId}/file`;
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Driver document</Text>
      </View>
      {loadError ? (
        <View style={styles.center}>
          <Text style={styles.error}>{loadError}</Text>
        </View>
      ) : (
        <WebView
          source={{ uri, headers: { Authorization: `Bearer ${token}` } }}
          originWhitelist={["http://*", "https://*"]}
          startInLoadingState
          renderLoading={() => <ActivityIndicator style={styles.loader} color={Colors.primary} />}
          onError={() => setLoadError("The protected document could not be loaded.")}
          onHttpError={(event) => {
            if (event.nativeEvent.statusCode === 401 || event.nativeEvent.statusCode === 403) {
              setLoadError("You are not authorized to view this document.");
            } else if (event.nativeEvent.statusCode >= 400) {
              setLoadError("The protected document could not be loaded.");
            }
          }}
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  error: { color: "#B91C1C", fontWeight: "700", textAlign: "center" },
});
