import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { Colors } from "../../constants/colors";

type Vehicle = {
  id: number;
  model: string;
  plate: string;
  type: string;
  color: string;
};

export default function VehiclesScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    {
      id: 1,
      model: "Honda City 2022",
      plate: "TS 09 AB 1234",
      type: "Sedan / Car",
      color: "Pearl White",
    },
  ]);

  const [showAdd, setShowAdd] = useState(false);
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [color, setColor] = useState("");

  const handleAdd = () => {
    if (!model.trim() || !plate.trim()) {
      return Alert.alert("Fields Required", "Please enter vehicle model and license plate.");
    }

    const newVehicle: Vehicle = {
      id: Date.now(),
      model: model.trim(),
      plate: plate.trim().toUpperCase(),
      type: "Car",
      color: color.trim() || "White",
    };

    setVehicles((prev) => [...prev, newVehicle]);
    setModel("");
    setPlate("");
    setColor("");
    setShowAdd(false);
    Alert.alert("Vehicle Added", "Your vehicle has been registered.");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/(user)/profile")} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>My Vehicles</Text>
      </View>

      {vehicles.map((v) => (
        <View key={v.id} style={styles.vehicleCard}>
          <View style={styles.vIcon}>
            <Text style={{ fontSize: 24 }}>🚗</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.vModel}>{v.model}</Text>
            <Text style={styles.vPlate}>{v.plate}</Text>
            <Text style={styles.vMeta}>
              {v.type} • {v.color}
            </Text>
          </View>
          <View style={styles.verifiedPill}>
            <Text style={styles.verifiedText}>Approved</Text>
          </View>
        </View>
      ))}

      {showAdd ? (
        <View style={styles.addCard}>
          <Text style={styles.addTitle}>Add New Vehicle</Text>
          <Text style={styles.label}>MAKE & MODEL</Text>
          <TextInput
            style={styles.input}
            value={model}
            onChangeText={setModel}
            placeholder="e.g. Hyundai Creta"
            placeholderTextColor="#94A3B8"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>LICENSE PLATE NUMBER</Text>
          <TextInput
            style={styles.input}
            value={plate}
            onChangeText={setPlate}
            autoCapitalize="characters"
            placeholder="e.g. TS 08 EA 4567"
            placeholderTextColor="#94A3B8"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>VEHICLE COLOR</Text>
          <TextInput
            style={styles.input}
            value={color}
            onChangeText={setColor}
            placeholder="e.g. Silver"
            placeholderTextColor="#94A3B8"
          />

          <View style={styles.btnRow}>
            <Pressable onPress={() => setShowAdd(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleAdd} style={styles.confirmBtn}>
              <Text style={styles.confirmBtnText}>Save Vehicle</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setShowAdd(true)} style={styles.addNewBtn}>
          <Text style={styles.addNewBtnText}>+ Add Another Vehicle</Text>
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
  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  vIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  vModel: { fontSize: 16, fontWeight: "800", color: Colors.text },
  vPlate: { fontSize: 13, fontWeight: "700", color: Colors.primaryDark, marginTop: 2 },
  vMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  verifiedPill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  verifiedText: { fontSize: 11, fontWeight: "800", color: Colors.greenDark },
  addNewBtn: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: "#DBEAFE",
    borderStyle: "dashed",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  addNewBtnText: { color: Colors.primary, fontWeight: "800", fontSize: 14 },
  addCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginTop: 8,
  },
  addTitle: { fontSize: 16, fontWeight: "800", color: Colors.text, marginBottom: 14 },
  label: { fontSize: 10, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.5, marginBottom: 6 },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: "700", fontSize: 13 },
  confirmBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmBtnText: { color: Colors.white, fontWeight: "800", fontSize: 13 },
});
