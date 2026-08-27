import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { Colors } from "../constants/colors";

type Props = { title: string; onPress: () => void; loading?: boolean; variant?: "primary" | "secondary" | "green" | "dark" };
export default function Button({ title, onPress, loading, variant = "primary" }: Props) {
  const secondary = variant === "secondary";
  return <Pressable disabled={loading} onPress={onPress} style={[styles.button, secondary && styles.secondary, variant === "green" && styles.green, variant === "dark" && styles.dark, loading && styles.disabled]}>{loading ? <ActivityIndicator color={secondary ? Colors.primary : Colors.white} /> : <Text style={[styles.text, secondary && styles.secondaryText]}>{title}</Text>}</Pressable>;
}
const styles = StyleSheet.create({ button: { minHeight: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: Colors.primary, marginTop: 12, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 7, elevation: 3 }, secondary: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, shadowOpacity: 0 }, green: { backgroundColor: Colors.green }, dark: { backgroundColor: Colors.text }, text: { color: Colors.white, fontWeight: "800", fontSize: 15 }, secondaryText: { color: Colors.text }, disabled: { opacity: .65 } });
