import React, { useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import apiClient from "../../api/client";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Screen from "../../components/Screen";
import { Colors } from "../../constants/colors";
import { useAuthStore } from "../../store/auth";

export default function VerifyOtp() {
  const { email: presetEmail } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(presetEmail ?? "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !otp) {
      return Alert.alert("Missing information", "Enter your email and OTP.");
    }
    try {
      setLoading(true);
      const res = await apiClient.post("/api/v1/users/verify-otp", { email, otp });
      const { access_token, user } = res.data || {};
      if (access_token) {
        await useAuthStore.getState().login(access_token, user || null);
      }
      const role = (user?.role || "").toLowerCase();
      const isAdmin = ["admin", "administrator"].includes(role);
      router.replace(isAdmin ? "/(admin)" : "/(user)/home");
    } catch (error: any) {
      Alert.alert("Verification failed", error.response?.data?.detail ?? "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={styles.page}>
      <Text style={styles.logo}>SyncroGo</Text>
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.sub}>Enter the code sent to your email.</Text>
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Input
        label="OTP"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
      />
      <Button title="Verify & Continue" onPress={submit} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, justifyContent: "center" },
  logo: {
    textAlign: "center",
    fontSize: 36,
    fontWeight: "900",
    color: Colors.primary,
    marginBottom: 34,
  },
  title: { fontSize: 30, fontWeight: "800", color: Colors.text },
  sub: { color: Colors.textSecondary, marginTop: 8, marginBottom: 25 },
});
