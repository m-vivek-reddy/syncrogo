import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { Colors } from "../constants/colors";
export default function Input({ label, ...props }: TextInputProps & { label: string }) { return <View style={styles.wrap}><Text style={styles.label}>{label}</Text><TextInput {...props} style={styles.input} placeholderTextColor={Colors.textMuted} /></View>; }
const styles = StyleSheet.create({ wrap: { marginBottom: 16 }, label: { marginBottom: 7, marginLeft: 2, color: Colors.textSecondary, fontWeight: "700", fontSize: 13 }, input: { height: 52, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, paddingHorizontal: 16, color: Colors.text, backgroundColor: Colors.white, fontSize: 15 } });
