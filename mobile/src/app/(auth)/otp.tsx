import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../auth/AuthContext";
import { useAuthStore } from "../../store/auth";
import { Colors } from "../../constants/colors";
import apiClient from "../../api/client";

export default function OtpScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === "string" ? params.email : "";
  const { verifyOtp } = useAuth();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [seconds, setSeconds] = useState(30);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => {
      setSeconds((current) => current - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  function handleOtpChange(value: string) {
    const numeric = value.replace(/[^0-9]/g, "").slice(0, 6);
    setOtp(numeric);
  }

  async function handleVerify() {
    if (otp.length !== 6) {
      Alert.alert("Invalid OTP", "Please enter the 6-digit OTP.");
      return;
    }

    if (!email) {
      Alert.alert(
        "Session error",
        "Your login email is missing. Please login again."
      );
      router.replace("/(auth)/login");
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      await verifyOtp(email, otp);

      // Only navigate once the auth store actually has a token.
      const storedToken = useAuthStore.getState().token;
      if (!storedToken) {
        throw new Error(
          "OTP verified but no session token was stored. Please try logging in."
        );
      }

      const currentUser = useAuthStore.getState().user;
      const role = (
        currentUser?.role ||
        ""
      ).toLowerCase();
      const isAdmin = ["admin", "administrator"].includes(role);

      if (isAdmin) {
        router.replace("/(admin)");
      } else {
        router.replace("/(user)/home");
      }
    } catch (error: any) {
      console.error("OTP verification error:", error);
      Alert.alert(
        "Verification failed",
        error?.message || "The OTP is invalid or expired."
      );
      setOtp("");
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (seconds > 0) return;
    setResending(true);
    try {
      await apiClient.post("/api/v1/users/resend-otp", { email });
      setSeconds(30);
      Alert.alert(
        "OTP Resent",
        "A new 6-digit OTP code has been sent to your email."
      );
    } catch (error: any) {
      Alert.alert(
        "Resend Failed",
        error?.response?.data?.detail ||
          error?.message ||
          "Could not resend OTP. Please try again."
      );
    } finally {
      setResending(false);
    }
  }

  const maskedEmail =
    email.length > 4
      ? `${email.slice(0, 2)}â€¢â€¢â€¢${email.slice(email.indexOf("@"))}`
      : email;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>â€¹</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>ðŸ”</Text>
        </View>

        <Text style={styles.title}>Verify Your Account</Text>
        <Text style={styles.description}>We&apos;ve sent a 6-digit OTP to</Text>
        <Text style={styles.email}>{maskedEmail}</Text>

        <TextInput
          ref={inputRef}
          id="otp"
          accessibilityLabel="One time password"
          value={otp}
          onChangeText={handleOtpChange}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          style={styles.otpInput}
        />

        <View style={styles.dots}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index < otp.length && styles.dotFilled,
              ]}
            >
              {index < otp.length && (
                <Text style={styles.dotText}>{otp[index]}</Text>
              )}
            </View>
          ))}
        </View>

        <Pressable
          onPress={handleVerify}
          disabled={loading}
          style={[styles.verifyButton, loading && styles.disabled]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify & Continue</Text>
          )}
        </Pressable>

        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Didn&apos;t receive the code?</Text>
          <Pressable
            onPress={handleResend}
            disabled={seconds > 0 || resending}
          >
            <Text
              style={[
                styles.resendButton,
                seconds > 0 && styles.resendDisabled,
              ]}
            >
              {resending
                ? "Sending..."
                : seconds > 0
                ? ` Resend in ${seconds}s`
                : " Resend OTP"}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.security}>
          ðŸ”’ Your account is protected with two-step verification.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
  },
  backText: {
    fontSize: 30,
    color: "#0F172A",
    lineHeight: 32,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 25,
    paddingTop: 50,
  },
  icon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 22,
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    fontSize: 25,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
  },
  description: {
    marginTop: 10,
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },
  email: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: "900",
    color: "#2563EB",
  },
  otpInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  dots: {
    flexDirection: "row",
    gap: 9,
    marginTop: 35,
    marginBottom: 25,
  },
  dot: {
    width: 44,
    height: 54,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  dotFilled: {
    borderColor: Colors.primary,
    backgroundColor: "#F0FDF4",
  },
  dotText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
  },
  verifyButton: {
    width: "100%",
    height: 52,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  disabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  resendRow: {
    flexDirection: "row",
    marginTop: 20,
    alignItems: "center",
  },
  resendLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  resendButton: {
    fontSize: 11,
    color: "#2563EB",
    fontWeight: "900",
  },
  resendDisabled: {
    color: "#94A3B8",
  },
  security: {
    marginTop: 30,
    fontSize: 10,
    color: "#64748B",
    textAlign: "center",
  },
});
