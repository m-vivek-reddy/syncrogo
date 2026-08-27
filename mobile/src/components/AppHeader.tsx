import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../constants/colors";
import { useAuthStore } from "../store/auth";

export default function AppHeader() {
  const insets = useSafeAreaInsets();
  const { mode, setMode } = useAuthStore();
  const isDriver = mode === "driver";

  return (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) + 6 }]}>
      <Pressable
        onPress={() => router.replace("/(user)/home")}
        style={styles.brandContainer}
      >
        <Text style={styles.logo}>
          Syncro<Text style={styles.go}>Go</Text>
        </Text>
        <Text style={styles.tagline}>Travel Together. Save Together.</Text>
      </Pressable>

      {/* Modern Switch Toggle Button */}
      <Pressable
        onPress={() => void setMode(isDriver ? "passenger" : "driver")}
        style={({ pressed }) => [
          styles.switchContainer,
          isDriver ? styles.switchDriver : styles.switchPassenger,
          pressed && styles.switchPressed,
        ]}
        accessibilityRole="switch"
        accessibilityLabel="Toggle Driver or Passenger Mode"
      >
        <View style={styles.switchContent}>
          <Text style={styles.switchIcon}>{isDriver ? "🚙" : "🚗"}</Text>
          <View style={styles.switchTextCol}>
            <Text
              style={[
                styles.switchLabel,
                isDriver ? styles.switchLabelDriver : styles.switchLabelPassenger,
              ]}
            >
              {isDriver ? "Driver" : "Passenger"}
            </Text>
            <Text style={styles.switchSubLabel}>Tap to switch</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  brandContainer: {
    justifyContent: "center",
  },
  logo: {
    fontSize: 22,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  go: {
    color: Colors.green,
  },
  tagline: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
  },
  switchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 24,
    borderWidth: 1.5,
    minWidth: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  switchPassenger: {
    backgroundColor: "#EFF6FF",
    borderColor: "#93C5FD",
  },
  switchDriver: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
  },
  switchPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  switchContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  switchIcon: {
    fontSize: 18,
  },
  switchTextCol: {
    justifyContent: "center",
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  switchLabelPassenger: {
    color: Colors.primaryDark,
  },
  switchLabelDriver: {
    color: Colors.greenDark,
  },
  switchSubLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
});
