import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { Colors } from "../constants/colors";

type Props = {
  /** Set true to show the notice. */
  visible: boolean;
  title: string;
  body: string;
  /** Extra required acknowledgement shown as a checkbox. */
  confirmLabel?: string;
  confirmLabelRequired?: boolean;
  /** Primary button text, e.g. "Continue". */
  actionLabel?: string;
  /** Called when the user proceeds. */
  onProceed: () => void;
  /** Called when the user declines / dismisses. */
  onDismiss?: () => void;
};

/**
 * Pre-permission consent notice.
 *
 * DPDP 2023 expects the user to be told, in plain language, what data a
 * feature will use and why BEFORE the operating system's own permission
 * dialog appears. Render this first; only call the OS permission request in
 * `onProceed`.
 *
 * Usage pattern:
 *   <ConsentNoticeModal ... onProceed={() => requestOsPermission()} />
 */
export default function ConsentNoticeModal({
  visible,
  title,
  body,
  confirmLabel,
  confirmLabelRequired = false,
  actionLabel = "Continue",
  onProceed,
  onDismiss,
}: Props) {
  const [checked, setChecked] = useState(false);
  const blocked = confirmLabelRequired && !checked;

  const proceed = () => {
    if (confirmLabelRequired && !checked) return;
    setChecked(false);
    onProceed();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss ?? (() => { })}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>

          {confirmLabel ? (
            <Pressable
              onPress={() => setChecked((v) => !v)}
              style={styles.checkRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
            >
              <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                {checked && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={styles.checkText}>{confirmLabel}</Text>
            </Pressable>
          ) : null}

          <View style={styles.btnRow}>
            <Pressable
              onPress={onDismiss ?? (() => { })}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryText}>Not now</Text>
            </Pressable>
            <Pressable
              onPress={proceed}
              disabled={blocked}
              style={[styles.primaryBtn, blocked && styles.disabledBtn]}
            >
              <Text style={styles.primaryText}>{actionLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  title: { fontSize: 18, fontWeight: "900", color: "#0F172A" },
  body: { fontSize: 13, lineHeight: 20, color: "#64748B", marginTop: 8 },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 14 },
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
  checkText: { flex: 1, fontSize: 12, lineHeight: 17, color: "#475569" },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 18, justifyContent: "flex-end" },
  secondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  secondaryText: { fontSize: 13, fontWeight: "700", color: "#475569" },
  primaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  primaryText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
  disabledBtn: { opacity: 0.5 },
});
