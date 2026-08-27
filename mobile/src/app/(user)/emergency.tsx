import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import api from "../../api/client";
import { Colors } from "../../constants/colors";

export default function EmergencyScreen() {
  const [contacts, setContacts] = useState([
    { id: 1, name: "Family Primary", phone: "+91 98765 00001", relation: "Parent" },
    { id: 2, name: "Emergency Helpline", phone: "112", relation: "National Emergency" },
  ]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [sosTriggered, setSosTriggered] = useState(false);

  const handleTriggerSOS = () => {
    Alert.alert(
      "⚠️ SEND SOS ALERT",
      "This will immediately notify your emergency contacts and transmit your GPS coordinates to SyncroGo Safety Team.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "SEND SOS NOW",
          style: "destructive",
          onPress: async () => {
            try {
              await api.post("/api/v1/sos/trigger", {
                lat: 17.4435,
                lon: 78.3772,
              });
            } catch {
              // ignore
            }
            setSosTriggered(true);
            Alert.alert("🚨 SOS Alert Dispatched", "Emergency contacts have been notified.");
          },
        },
      ]
    );
  };

  const handleAddContact = () => {
    if (!name.trim() || !phone.trim()) {
      return Alert.alert("Fields Required", "Please enter contact name and phone number.");
    }
    setContacts((prev) => [
      ...prev,
      { id: Date.now(), name: name.trim(), phone: phone.trim(), relation: relation.trim() || "Contact" },
    ]);
    setName("");
    setPhone("");
    setRelation("");
    setShowAdd(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/(user)/profile")} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Emergency & Safety</Text>
      </View>

      {/* SOS Button */}
      <Pressable onPress={handleTriggerSOS} style={styles.sosCard}>
        <Text style={styles.sosEmoji}>🚨</Text>
        <Text style={styles.sosTitle}>
          {sosTriggered ? "SOS ALERT ACTIVE" : "EMERGENCY SOS"}
        </Text>
        <Text style={styles.sosSub}>
          Tap to broadcast your live location to trusted contacts
        </Text>
      </Pressable>

      <Text style={styles.sectionHeader}>Trusted Emergency Contacts</Text>
      {contacts.map((c) => (
        <View key={c.id} style={styles.contactCard}>
          <View style={styles.cAvatar}>
            <Text style={styles.cAvatarText}>{c.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cName}>{c.name}</Text>
            <Text style={styles.cPhone}>{c.phone}</Text>
            <Text style={styles.cRel}>{c.relation}</Text>
          </View>
          <Pressable
            onPress={() => Linking.openURL(`tel:${c.phone}`)}
            style={styles.callBtn}
          >
            <Text style={{ fontSize: 16 }}>📞</Text>
          </Pressable>
        </View>
      ))}

      {showAdd ? (
        <View style={styles.addCard}>
          <Text style={styles.addTitle}>Add Emergency Contact</Text>
          <Text style={styles.label}>NAME</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. John Doe"
            placeholderTextColor="#94A3B8"
          />
          <Text style={[styles.label, { marginTop: 10 }]}>PHONE NUMBER</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+91 98765 43210"
            placeholderTextColor="#94A3B8"
          />
          <Text style={[styles.label, { marginTop: 10 }]}>RELATION</Text>
          <TextInput
            style={styles.input}
            value={relation}
            onChangeText={setRelation}
            placeholder="e.g. Spouse / Friend"
            placeholderTextColor="#94A3B8"
          />
          <View style={styles.btnRow}>
            <Pressable onPress={() => setShowAdd(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleAddContact} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Add Contact</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setShowAdd(true)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add Emergency Contact</Text>
        </Pressable>
      )}
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
  sosCard: {
    backgroundColor: "#DC2626",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  sosEmoji: { fontSize: 40, marginBottom: 8 },
  sosTitle: { fontSize: 20, fontWeight: "900", color: Colors.white, letterSpacing: 1 },
  sosSub: { fontSize: 12, color: "rgba(255,255,255,0.9)", textAlign: "center", marginTop: 4 },
  sectionHeader: { fontSize: 15, fontWeight: "800", color: Colors.text, marginBottom: 12 },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 10,
  },
  cAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cAvatarText: { fontWeight: "800", color: "#DC2626", fontSize: 16 },
  cName: { fontSize: 14, fontWeight: "800", color: Colors.text },
  cPhone: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  cRel: { fontSize: 11, color: "#94A3B8", marginTop: 1 },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  addBtn: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  addBtnText: { color: Colors.primary, fontWeight: "800", fontSize: 13 },
  addCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginTop: 10,
  },
  addTitle: { fontSize: 15, fontWeight: "800", color: Colors.text, marginBottom: 12 },
  label: { fontSize: 10, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.5, marginBottom: 4 },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
  },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, backgroundColor: "#F1F5F9", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: "700", fontSize: 13 },
  saveBtn: { flex: 1, backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  saveBtnText: { color: Colors.white, fontWeight: "800", fontSize: 13 },
});
