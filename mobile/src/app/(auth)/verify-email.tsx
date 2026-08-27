import { StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import Button from "../../components/Button";
import Screen from "../../components/Screen";
import { Colors } from "../../constants/colors";
export default function VerifyEmail() { return <Screen style={styles.page}><Text style={styles.logo}>SyncroGo</Text><Text style={styles.title}>Verify your email</Text><Text style={styles.sub}>Enter the OTP sent to your email to continue.</Text><Button title="Enter OTP" onPress={() => router.push("/(auth)/verify-otp")} /></Screen>; }
const styles = StyleSheet.create({ page: { padding: 24, justifyContent: "center" }, logo: { textAlign: "center", fontSize: 36, fontWeight: "900", color: Colors.primary, marginBottom: 34 }, title: { fontSize: 30, fontWeight: "800", color: Colors.text }, sub: { color: Colors.textSecondary, marginTop: 8, marginBottom: 25 } });
