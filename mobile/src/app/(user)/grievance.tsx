import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Colors } from "../../constants/colors";
import { ENTITY } from "../../legal/legalContent";

export default function GrievanceScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/(user)/settings")} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Privacy Grievance</Text>
      </View>
      <Text style={styles.body}>Grievance officer: {ENTITY.grievanceOfficer}</Text>
      <Text style={styles.body}>Contact: {ENTITY.grievanceEmail}</Text>
      <Pressable onPress={() => Linking.openURL(`mailto:${ENTITY.grievanceEmail}`)} style={styles.button}>
        <Text style={styles.buttonText}>Email grievance contact</Text>
      </Pressable>
      <Text style={styles.disclaimer}>The named officer remains a placeholder until SyncroGo supplies verified details.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: Colors.white, borderWidth: 1, borderColor: "#E2E8F0", marginRight: 12 },
  backText: { color: Colors.text, fontWeight: "700" },
  title: { color: Colors.text, fontSize: 20, fontWeight: "800" },
  body: { color: Colors.text, fontSize: 14, marginBottom: 8 },
  button: { marginTop: 8, padding: 13, backgroundColor: Colors.primary, borderRadius: 10, alignItems: "center" },
  buttonText: { color: Colors.white, fontWeight: "800" },
  disclaimer: { marginTop: 14, color: Colors.textSecondary, fontSize: 12, lineHeight: 18 },
});
