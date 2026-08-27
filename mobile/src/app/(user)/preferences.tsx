import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { Colors } from "../../constants/colors";

export default function PreferencesScreen() {
  const [ac, setAc] = useState(true);
  const [music, setMusic] = useState(true);
  const [smoking, setSmoking] = useState(false);
  const [pets, setPets] = useState(false);
  const [chatty, setChatty] = useState(true);

  const handleSave = () => {
    Alert.alert("Preferences Saved", "Your ride preferences have been updated.");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/(user)/profile")} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Ride Preferences</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.title}>❄️ Air Conditioning</Text>
            <Text style={styles.sub}>Keep AC on during trips</Text>
          </View>
          <Switch value={ac} onValueChange={setAc} trackColor={{ false: "#CBD5E1", true: Colors.primary }} />
        </View>

        <View style={[styles.row, styles.border]}>
          <View style={styles.info}>
            <Text style={styles.title}>🎵 Music Allowed</Text>
            <Text style={styles.sub}>Enjoy songs while traveling</Text>
          </View>
          <Switch value={music} onValueChange={setMusic} trackColor={{ false: "#CBD5E1", true: Colors.primary }} />
        </View>

        <View style={[styles.row, styles.border]}>
          <View style={styles.info}>
            <Text style={styles.title}>💬 Chatty / Friendly</Text>
            <Text style={styles.sub}>Open to conversation</Text>
          </View>
          <Switch value={chatty} onValueChange={setChatty} trackColor={{ false: "#CBD5E1", true: Colors.primary }} />
        </View>

        <View style={[styles.row, styles.border]}>
          <View style={styles.info}>
            <Text style={styles.title}>🐾 Pet Friendly</Text>
            <Text style={styles.sub}>Allow small pets in carrier</Text>
          </View>
          <Switch value={pets} onValueChange={setPets} trackColor={{ false: "#CBD5E1", true: Colors.primary }} />
        </View>

        <View style={[styles.row, styles.border]}>
          <View style={styles.info}>
            <Text style={styles.title}>🚭 Smoking Allowed</Text>
            <Text style={styles.sub}>Permit smoking during stops</Text>
          </View>
          <Switch value={smoking} onValueChange={setSmoking} trackColor={{ false: "#CBD5E1", true: Colors.primary }} />
        </View>
      </View>

      <Pressable onPress={handleSave} style={styles.saveBtn}>
        <Text style={styles.saveBtnText}>Save Preferences</Text>
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
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 },
  border: { borderTopWidth: 1, borderTopColor: "#F8FAFC" },
  info: { flex: 1, paddingRight: 10 },
  title: { fontSize: 14, fontWeight: "800", color: Colors.text },
  sub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  saveBtnText: { color: Colors.white, fontWeight: "800", fontSize: 14 },
});
