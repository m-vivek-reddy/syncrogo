import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, router } from "expo-router";
import apiClient from "../../api/client";
import Button from "../../components/Button";
import Input from "../../components/Input";
import PasswordStrengthMeter from "../../components/PasswordStrengthMeter";
import { Colors } from "../../constants/colors";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("passenger");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!fullName || !email || !password) {
      return Alert.alert("Missing information", "Complete the required fields.");
    }
    try {
      setLoading(true);
      await apiClient.post("/api/v1/users/register", {
        full_name: fullName,
        email,
        phone,
        password,
        role,
      });
      router.push({ pathname: "/(auth)/otp", params: { email } });
    } catch (error: any) {
      Alert.alert(
        "Registration failed",
        error.response?.data?.detail ?? "Unable to create your account."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.logo}>SyncroGo</Text>
        <View style={styles.card}>
          <Text style={styles.title}>Create account</Text>
          <Input label="Full name" value={fullName} onChangeText={setFullName} />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <PasswordStrengthMeter password={password} />

          <View style={styles.roles}>
            <Button
              title="Passenger"
              onPress={() => setRole("passenger")}
              variant={role === "passenger" ? "primary" : "secondary"}
            />
            <Button
              title="Driver"
              onPress={() => setRole("driver")}
              variant={role === "driver" ? "primary" : "secondary"}
            />
          </View>
          <Button title="Create Account" onPress={submit} loading={loading} />
          <Text style={styles.footer}>
            Already have an account?{" "}
            <Link href="/(auth)/login" style={styles.link}>
              Sign in
            </Link>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1, justifyContent: "center", padding: 24 },
  logo: {
    textAlign: "center",
    fontSize: 36,
    fontWeight: "900",
    color: Colors.primary,
    marginBottom: 28,
  },
  card: {
    backgroundColor: Colors.surface,
    padding: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { fontSize: 28, fontWeight: "800", color: Colors.text, marginBottom: 22 },
  roles: { flexDirection: "row", gap: 10, marginVertical: 12 },
  footer: { textAlign: "center", color: Colors.textSecondary, marginTop: 22 },
  link: { color: Colors.primaryDark, fontWeight: "700" },
});
