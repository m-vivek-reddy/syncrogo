import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface PasswordStrengthMeterProps {
  password: string;
}

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const requirements = [
    { label: "8+ chars", met: hasMinLength },
    { label: "Uppercase (A-Z)", met: hasUppercase },
    { label: "Number (0-9)", met: hasNumber },
    { label: "Special (!@#$)", met: hasSpecial },
  ];

  const score = [hasMinLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;

  const getLabelAndColor = () => {
    switch (score) {
      case 0:
      case 1:
        return { label: "Weak", color: "#EF4444" };
      case 2:
        return { label: "Fair", color: "#F59E0B" };
      case 3:
        return { label: "Good", color: "#3B82F6" };
      case 4:
        return { label: "Strong", color: "#10B981" };
      default:
        return { label: "", color: "#E2E8F0" };
    }
  };

  const strength = getLabelAndColor();

  return (
    <View style={styles.container}>
      {/* Progress bar segments */}
      <View style={styles.segmentsRow}>
        {[1, 2, 3, 4].map((step) => (
          <View
            key={step}
            style={[
              styles.segment,
              { backgroundColor: step <= score ? strength.color : "#E2E8F0" },
            ]}
          />
        ))}
      </View>

      {/* Strength Label */}
      <View style={styles.labelRow}>
        <Text style={styles.labelTitle}>Password Strength:</Text>
        <Text style={[styles.labelValue, { color: strength.color }]}>
          {strength.label}
        </Text>
      </View>

      {/* Checklist Grid */}
      <View style={styles.checklist}>
        {requirements.map((req, index) => (
          <View key={index} style={styles.checkItem}>
            <Text style={[styles.checkMark, { color: req.met ? "#10B981" : "#CBD5E1" }]}>
              {req.met ? "✓" : "○"}
            </Text>
            <Text style={[styles.checkText, { color: req.met ? "#334155" : "#94A3B8" }]}>
              {req.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    marginBottom: 12,
  },
  segmentsRow: {
    flexDirection: "row",
    gap: 6,
    height: 5,
  },
  segment: {
    flex: 1,
    borderRadius: 3,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  labelTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  labelValue: {
    fontSize: 11,
    fontWeight: "800",
  },
  checklist: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: "45%",
  },
  checkMark: {
    fontSize: 12,
    fontWeight: "800",
  },
  checkText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
