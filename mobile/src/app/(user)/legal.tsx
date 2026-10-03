import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Pressable } from "react-native";
import {
  PRIVACY,
  TERMS,
  COOKIE_POLICY,
  ENTITY,
  type LegalDoc,
} from "../../legal/legalContent";

const DOCS: Record<string, LegalDoc> = {
  terms: TERMS,
  privacy: PRIVACY,
  cookies: COOKIE_POLICY,
};

export default function LegalScreen() {
  const { doc: docParam } = useLocalSearchParams<{ doc?: string }>();
  const doc = DOCS[docParam ?? "terms"] ?? TERMS;

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{doc.eyebrow}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{doc.title}</Text>
        <Text style={styles.meta}>
          Effective {doc.effectiveDate} · Last updated {doc.lastUpdated}
        </Text>
        <Text style={styles.intro}>{doc.intro}</Text>

        {doc.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>

            {section.body ? (
              <Text style={styles.bodyText}>{section.body}</Text>
            ) : null}

            {section.bullets?.map((b) => (
              <View key={b} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))}

            {section.numbered?.map((n, i) => (
              <View key={n} style={styles.bulletRow}>
                <Text style={styles.numberText}>{i + 1}.</Text>
                <Text style={styles.bulletText}>{n}</Text>
              </View>
            ))}

            {section.sub?.map((sub) => (
              <View key={sub.heading} style={styles.subBlock}>
                <Text style={styles.subHeading}>{sub.heading}</Text>
                {sub.body ? (
                  <Text style={styles.bodyText}>{sub.body}</Text>
                ) : null}
                {sub.bullets?.map((b) => (
                  <View key={b} style={styles.bulletRow}>
                    <View style={styles.bulletDotSmall} />
                    <Text style={styles.bulletTextSmall}>{b}</Text>
                  </View>
                ))}
                {sub.body_after ? (
                  <Text style={styles.bodyText}>{sub.body_after}</Text>
                ) : null}
              </View>
            ))}

            {section.body_after ? (
              <Text style={styles.bodyText}>{section.body_after}</Text>
            ) : null}
          </View>
        ))}

        {doc.footerNote ? (
          <View style={styles.footerCard}>
            <Text style={styles.footerText}>{doc.footerNote}</Text>
          </View>
        ) : null}

        <View style={styles.contactCard}>
          <Text style={styles.footerText}>
            Questions or a privacy request? Write to {doc.id === "privacy"
              ? ENTITY.privacyEmail
              : ENTITY.grievanceEmail}
            .
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  backText: { fontSize: 20, fontWeight: "700", color: "#0F172A", marginTop: -2 },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "900", color: "#0F172A", lineHeight: 32 },
  meta: { fontSize: 12, color: "#94A3B8", marginTop: 6, fontWeight: "600" },
  intro: { fontSize: 13, lineHeight: 21, color: "#64748B", marginTop: 14 },
  section: { marginTop: 24 },
  sectionHeading: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  bodyText: { fontSize: 13, lineHeight: 21, color: "#475569", marginTop: 8 },
  bulletRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#22C55E",
    marginTop: 9,
  },
  bulletDotSmall: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#94A3B8",
    marginTop: 9,
  },
  bulletText: { flex: 1, fontSize: 13, lineHeight: 21, color: "#475569" },
  bulletTextSmall: { flex: 1, fontSize: 12, lineHeight: 19, color: "#64748B" },
  numberText: { fontSize: 13, fontWeight: "800", color: "#16A34A", marginTop: 1 },
  subBlock: {
    marginTop: 14,
    borderLeftWidth: 2,
    borderLeftColor: "#F1F5F9",
    paddingLeft: 12,
  },
  subHeading: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  footerCard: {
    marginTop: 26,
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  footerText: { fontSize: 12, lineHeight: 19, color: "#065F46" },
  contactCard: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
});
