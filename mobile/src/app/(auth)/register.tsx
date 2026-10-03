import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { POLICY_VERSION } from "../../legal/legalContent";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("passenger");
  const [loading, setLoading] = useState(false);

  // ── Consent (DPDP: specific, informed, unambiguous, no pre-ticked boxes) ──
  const [acceptTerms, setAcceptTerms] = useState(false);   // required
  const [acceptPrivacy, setAcceptPrivacy] = useState(false); // required
  const [consentCookies, setConsentCookies] = useState(false); // optional
  const [consentMarketing, setConsentMarketing] = useState(false); // optional
  const [consentLocation, setConsentLocation] = useState(false); // optional
  const [consentSms, setConsentSms] = useState(false); // optional

  const submit = async () => {
    if (!fullName || !email || !password) {
      return Alert.alert("Missing information", "Complete the required fields.");
    }
    // Required-consent gate: refuse before calling the API so the user sees
    // the problem in the form rather than a server error.
    if (!acceptTerms || !acceptPrivacy) {
      return Alert.alert(
        "Consent required",
        "You must agree to the Terms & Conditions and acknowledge the Privacy Policy to create a SyncroGo account."
      );
    }
    try {
      setLoading(true);
      await apiClient.post("/api/v1/users/register", {
        full_name: fullName,
        email,
        phone,
        password,
        role,
        // Required
        accept_terms: acceptTerms,
        accept_privacy: acceptPrivacy,
        // Optional — only sent when the user explicitly ticked them
        consent_cookies: consentCookies,
        consent_marketing_email: consentMarketing,
        consent_location: consentLocation,
        consent_sms: consentSms,
        consent_policy_version: POLICY_VERSION,
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

          {/* ── Required consent ── */}
          <Pressable
            onPress={() => setAcceptTerms((v) => !v)}
            style={styles.consentRow}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptTerms }}
          >
            <View style={[styles.checkbox, acceptTerms && styles.checkboxOn]}>
              {acceptTerms && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={styles.consentText}>
              I agree to the SyncroGo Terms & Conditions and acknowledge the{" "}
              <Text style={styles.consentLink}>Privacy Policy</Text>.
            </Text>
          </Pressable>

          {/* ── Optional consents, each separate (no pre-ticked boxes) ── */}
          <View style={styles.optionalBlock}>
            <Text style={styles.optionalLabel}>Optional — you choose</Text>
            {(
              [
                ["consentCookies", consentCookies, setConsentCookies, "Preference & analytics to remember my settings."],
                ["consentMarketing", consentMarketing, setConsentMarketing, "Marketing emails (product news and offers). Ride alerts are always sent."],
                ["consentLocation", consentLocation, setConsentLocation, "Use my location for ride matching and navigation."],
                ["consentSms", consentSms, setConsentSms, "Send OTPs and urgent ride/safety alerts to my mobile."],
              ] as const
            ).map(([key, value, setter, label]) => (
              <Pressable
                key={key}
                onPress={() => setter(!value)}
                style={styles.consentRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: value }}
              >
                <View style={[styles.checkbox, value && styles.checkboxOn]}>
                  {value && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={[styles.consentText, styles.consentTextSmall]}>{label}</Text>
              </Pressable>
            ))}
            <Text style={styles.optionalHint}>
              You can change any of these later in App Settings → Privacy.
            </Text>
          </View>

          <Button
            title="Create Account"
            onPress={submit}
            loading={loading}
            disabled={!acceptTerms || !acceptPrivacy}
          />
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
  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 10 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkMark: { color: "#FFFFFF", fontSize: 12, fontWeight: "900", lineHeight: 14 },
  consentText: { flex: 1, fontSize: 12, lineHeight: 17, color: "#475569" },
  consentTextSmall: { fontSize: 11, lineHeight: 16, color: "#64748B" },
  consentLink: { color: Colors.primaryDark, fontWeight: "700" },
  optionalBlock: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  optionalLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  optionalHint: { fontSize: 10, color: "#94A3B8", marginTop: 8 },
});
