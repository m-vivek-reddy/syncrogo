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
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import apiClient from "../../api/client";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert("Email required", "Please enter your registered email address.");
      return;
    }

    setLoading(true);

    try {
      await apiClient.post("/api/v1/users/forgot-password", {
        email: cleanEmail,
      });

      setSubmitted(true);
      Alert.alert(
        "Reset Link Sent",
        `If an account exists for ${cleanEmail}, password reset instructions have been sent to your inbox.`,
        [
          {
            text: "Back to Sign In",
            onPress: () => router.replace("/(auth)/login"),
          },
        ]
      );
    } catch {
      Alert.alert(
        "Request Submitted",
        "If an account exists for this email, password reset instructions have been dispatched.",
        [
          {
            text: "Back to Sign In",
            onPress: () => router.replace("/(auth)/login"),
          },
        ]
      );
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
        {/* Back Button */}
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </Pressable>

        {/* Brand Logo */}
        <View style={styles.logoRow}>
          <Text style={styles.logoDark}>Syncro</Text>
          <Text style={styles.logoGreen}>Go</Text>
        </View>

        <Text style={styles.tagline}>Travel Together. Save Together.</Text>

        <View style={styles.card}>
          <View style={styles.iconBox}>
            <Ionicons name="key-outline" size={28} color="#16A34A" />
          </View>

          <Text style={styles.heading}>Forgot Password?</Text>
          <Text style={styles.description}>
            Enter your registered email address and we&apos;ll send you instructions to
            reset your password.
          </Text>

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            id="forgot-email"
            accessibilityLabel="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your registered email"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            style={styles.input}
          />

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={[styles.submitButton, loading && styles.disabledButton]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {submitted ? "Resend Instructions" : "Send Reset Link"}
              </Text>
            )}
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Remember your password? </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text style={styles.signInLink}>Sign In</Text>
              </Pressable>
            </Link>
          </View>
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
    paddingTop: 50,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
    elevation: 1,
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
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
  },
  description: {
    marginTop: 6,
    marginBottom: 22,
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
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
    marginBottom: 20,
  },
  submitButton: {
    height: 52,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.65,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: {
    color: "#64748B",
    fontSize: 12,
  },
  signInLink: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "800",
  },
});
