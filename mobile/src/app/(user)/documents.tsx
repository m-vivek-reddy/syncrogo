import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import api from "../../api/client";
import { Colors } from "../../constants/colors";

type UploadedDocument = { id: number; document_type: string; status: "verified" | "pending" | "rejected"; file_url: string };
const sections = [
  { title: "Identity documents", items: [
    { id: "aadhaar", title: "Aadhaar Card", subtitle: "Government identity document", icon: "ID" },
    { id: "pan", title: "PAN Card", subtitle: "Required for payouts", icon: "PAN" },
    { id: "license", title: "Driving License", subtitle: "Required to offer rides", icon: "DL" },
  ] },
  { title: "Vehicle documents", items: [
    { id: "rc_book", title: "RC Book", subtitle: "Vehicle registration certificate", icon: "RC" },
    { id: "vehicle_insurance", title: "Vehicle Insurance", subtitle: "Current insurance policy", icon: "INS" },
    { id: "pollution_certificate", title: "Pollution Certificate", subtitle: "Valid PUC certificate", icon: "PUC" },
  ] },
];

export default function DocumentsScreen() {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const loadDocuments = useCallback(async () => {
    try { const { data } = await api.get("/api/v1/documents/"); setDocuments(data.documents || []); }
    catch { Alert.alert("Could not load documents", "Please try again when you are online."); }
  }, []);
  useFocusEffect(useCallback(() => { void loadDocuments(); }, [loadDocuments]));

  const uploadDocument = async (type: string, title: string) => {
    const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png"], copyToCacheDirectory: true });
    if (result.canceled) return;
    const file = result.assets[0];
    const form = new FormData();
    form.append("document_type", type);
    form.append("file", { uri: file.uri, name: file.name, type: file.mimeType || "application/octet-stream" } as any);
    setUploadingType(type);
    try {
      await api.post("/api/v1/documents/", form, { headers: { "Content-Type": "multipart/form-data" } });
      await loadDocuments();
      Alert.alert("Uploaded", `${title} was uploaded for review.`);
    } catch (error: any) {
      Alert.alert("Upload failed", error.response?.data?.detail || "Please try again.");
    } finally { setUploadingType(null); }
  };

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <View style={styles.header}><Pressable onPress={() => router.replace("/(user)/profile")} style={styles.backBtn}><Text style={styles.backText}>Back</Text></Pressable><Text style={styles.headerTitle}>Identity and Documents</Text></View>
    <View style={styles.banner}><Text style={styles.bannerTitle}>Verified Community</Text><Text style={styles.bannerText}>Your documents are reviewed to keep rides safe and trusted.</Text></View>
    {sections.map((section) => <View key={section.title} style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.items.map((item) => {
        const document = documents.find((value) => value.document_type === item.id);
        const status = document?.status || "required";
        const canReplace = status === "rejected" || status === "required";
        return <View key={item.id} style={styles.card}>
          <View style={styles.iconBox}><Text style={styles.icon}>{item.icon}</Text></View>
          <View style={styles.textBox}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.cardSubtitle}>{item.subtitle}</Text></View>
          <View style={styles.actions}>
            {status === "verified" && <Text style={[styles.status, styles.verified]}>Verified</Text>}
            {status === "pending" && <Text style={[styles.status, styles.pending]}>Under review</Text>}
            {status === "rejected" && <Text style={[styles.status, styles.rejected]}>Rejected</Text>}
            {canReplace && <Pressable onPress={() => uploadDocument(item.id, item.title)} style={styles.uploadBtn}><Text style={styles.uploadText}>{uploadingType === item.id ? "Uploading" : document ? "Replace" : "Upload"}</Text></Pressable>}
            {document && <Pressable onPress={() => Linking.openURL(document.file_url)}><Text style={styles.viewText}>View</Text></Pressable>}
          </View>
        </View>;
      })}
    </View>)}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" }, content: { padding: 16, paddingBottom: 40 }, header: { flexDirection: "row", alignItems: "center", marginBottom: 16, marginTop: 4 },
  backBtn: { backgroundColor: Colors.white, padding: 9, borderRadius: 10, marginRight: 12, borderWidth: 1, borderColor: "#E2E8F0" }, backText: { color: Colors.text, fontWeight: "700" }, headerTitle: { fontSize: 22, fontWeight: "800", color: Colors.text },
  banner: { backgroundColor: "#EFF6FF", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#DBEAFE", marginBottom: 16 }, bannerTitle: { fontSize: 14, fontWeight: "800", color: Colors.primaryDark }, bannerText: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 }, section: { marginBottom: 10 }, sectionTitle: { fontSize: 14, fontWeight: "800", color: Colors.text, marginBottom: 8 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#F1F5F9", marginBottom: 10, elevation: 1 }, iconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#F8FAFC", justifyContent: "center", alignItems: "center", marginRight: 12 }, icon: { color: Colors.primary, fontSize: 12, fontWeight: "900" }, textBox: { flex: 1 }, cardTitle: { fontSize: 14, fontWeight: "800", color: Colors.text }, cardSubtitle: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  actions: { alignItems: "flex-end", gap: 5 }, status: { fontSize: 11, fontWeight: "800" }, verified: { color: Colors.greenDark }, pending: { color: "#B45309" }, rejected: { color: "#DC2626" }, uploadBtn: { backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }, uploadText: { color: Colors.white, fontSize: 12, fontWeight: "800" }, viewText: { color: Colors.primary, fontSize: 12, fontWeight: "800" },
});
