import { Alert, StyleSheet, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import apiClient from "../../api/client";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Screen from "../../components/Screen";
import { Colors } from "../../constants/colors";
export default function ResetPassword() { const { token: initialToken } = useLocalSearchParams<{ token?: string }>(); const [token, setToken] = useState(initialToken ?? ""); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [loading, setLoading] = useState(false); const submit = async () => { if (!token || !password || password !== confirm) return Alert.alert("Check your details", "Enter the reset token and matching passwords."); try { setLoading(true); await apiClient.post("/api/v1/users/reset-password", { token, new_password: password }); Alert.alert("Password updated", "You can now sign in.", [{ text: "Sign in", onPress: () => router.replace("/(auth)/login") }]); } catch (error: any) { Alert.alert("Reset failed", error.response?.data?.detail ?? "Please try again."); } finally { setLoading(false); } }; return <Screen style={styles.page}><Text style={styles.logo}>SyncroGo</Text><Text style={styles.title}>Reset password</Text><Input label="Reset token" value={token} onChangeText={setToken} /><Input label="New password" value={password} onChangeText={setPassword} secureTextEntry /><Input label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry /><Button title="Reset Password" onPress={submit} loading={loading} /></Screen>; }
const styles = StyleSheet.create({ page: { padding: 24, justifyContent: "center" }, logo: { textAlign: "center", fontSize: 36, fontWeight: "900", color: Colors.primary, marginBottom: 34 }, title: { fontSize: 30, fontWeight: "800", color: Colors.text, marginBottom: 25 } });
