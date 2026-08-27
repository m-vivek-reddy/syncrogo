import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, router } from "expo-router";
import { useAuth } from "../../auth/AuthContext";
import { useAuthStore } from "../../store/auth";
import { Colors } from "../../constants/colors";

export default function LoginScreen() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert("Email required", "Please enter your email address.");
      return;
    }

    if (!password) {
      Alert.alert("Password required", "Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const response = await login(cleanEmail, password);

      // If response has access token directly, user is logged in
      if (response?.access_token) {
        const currentUser = useAuthStore.getState().user;
        const role = (
          currentUser?.role ||
          response?.user?.role ||
          response?.role ||
          ""
        ).toLowerCase();
        const isAdmin = ["admin", "administrator"].includes(role);

        if (isAdmin) {
          router.replace("/(admin)");
        } else {
          router.replace("/(user)/home");
        }
        return;
      }

      // Otherwise proceed to 2-step OTP screen
      router.push({
        pathname: "/(auth)/otp",
        params: {
          email: cleanEmail,
        },
      });
    } catch (error: any) {
      console.error("Login error:", error);
      const detail = error?.detail || error?.message || "";

      if (
        detail.toLowerCase().includes("verification") ||
        error?.status === 403
      ) {
        Alert.alert(
          "Verification Required",
          "Your account requires OTP verification before logging in.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Enter OTP",
              onPress: () =>
                router.push({
                  pathname: "/(auth)/otp",
                  params: { email: cleanEmail },
                }),
            },
          ]
        );
      } else if (
        detail.toLowerCase().includes("failed to fetch") ||
        detail.toLowerCase().includes("network") ||
        detail.toLowerCase().includes("connection")
      ) {
        Alert.alert(
          "Connection Error",
          "Unable to connect to the SyncroGo backend server. Please verify the backend is running at http://localhost:8000.",
          [{ text: "OK", style: "default" }]
        );
      } else {
        Alert.alert(
          "Sign In Failed",
          detail || "Incorrect email or password.\n\nIf you don't have an account yet, tap Register to create one.",
          [
            { text: "Try Again", style: "cancel" },
            {
              text: "Register",
              onPress: () => router.push("/(auth)/register"),
            },
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoRow}>
          <Text style={styles.logoDark}>Syncro</Text>
          <Text style={styles.logoGreen}>Go</Text>
        </View>

        <Text style={styles.tagline}>Travel Together. Save Together.</Text>

        <View style={styles.card}>
          <Text style={styles.heading}>Welcome Back</Text>
          <Text style={styles.description}>Log in to your SyncroGo account</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            id="email"
            accessibilityLabel="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            style={styles.input}
          />

          <View style={styles.passwordHeader}>
            <Text style={styles.label}>Password</Text>
            <Link href="/(auth)/forgot-password" asChild>
              <Pressable>
                <Text style={styles.forgot}>Forgot Password?</Text>
              </Pressable>
            </Link>
          </View>

          <View style={styles.passwordContainer}>
            <TextInput
              id="password"
              accessibilityLabel="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              style={styles.passwordInput}
            />

            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              style={styles.showButton}
            >
              <Text style={styles.showText}>
                {showPassword ? "Hide" : "Show"}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={[styles.loginButton, loading && styles.disabledButton]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Continue</Text>
            )}
          </Pressable>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>New to SyncroGo? </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable>
                <Text style={styles.registerLink}>Register</Text>
              </Pressable>
            </Link>
          </View>

          <Text style={styles.securityText}>
            🔐 You&apos;ll verify your account with an OTP
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  logoRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "baseline",
  },
  logoDark: {
    fontSize: 34,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -1.5,
  },
  logoGreen: {
    fontSize: 34,
    fontWeight: "900",
    color: Colors.primary,
    letterSpacing: -1.5,
  },
  tagline: {
    textAlign: "center",
    marginTop: 4,
    marginBottom: 24,
    fontSize: 11,
    color: "#64748B",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 22,
    elevation: 2,
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  heading: {
    fontSize: 27,
    fontWeight: "900",
    color: "#0F172A",
  },
  description: {
    marginTop: 5,
    marginBottom: 25,
    fontSize: 12,
    color: "#64748B",
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
    marginBottom: 7,
  },
  input: {
    height: 52,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 15,
    color: "#0F172A",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 18,
  },
  passwordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  forgot: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "700",
  },
  passwordContainer: {
    height: 52,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  passwordInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 15,
    color: "#0F172A",
    fontSize: 14,
  },
  showButton: {
    paddingHorizontal: 14,
  },
  showText: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "800",
  },
  loginButton: {
    height: 52,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.65,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
  },
  registerText: {
    color: "#64748B",
    fontSize: 12,
  },
  registerLink: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "800",
  },
  securityText: {
    textAlign: "center",
    marginTop: 16,
    fontSize: 10,
    color: "#64748B",
  },
});
