import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Colors } from "../../constants/colors";

export default function SupportScreen() {
  const faqs = [
    { q: "How do I book a seat?", a: "Go to Find Ride, enter pickup and destination, and tap 'Book Seat'." },
    { q: "How does driver payout work?", a: "Earnings are credited to your linked UPI/bank account within 24 hours." },
    { q: "Can I cancel a booking?", a: "Yes, you can cancel before the trip begins from My Trips." },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/(user)/profile")} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Help & Support</Text>
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>24/7 Support Desk</Text>
        <Text style={styles.bannerText}>
          Need help with a ride or account? Our team is here for you.
        </Text>
        <Pressable
          onPress={() => Linking.openURL("mailto:support@syncrogo.com")}
          style={styles.contactBtn}
        >
          <Text style={styles.contactBtnText}>✉️ Email Support</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
      {faqs.map((f, i) => (
        <View key={i} style={styles.faqCard}>
          <Text style={styles.faqQ}>{f.q}</Text>
          <Text style={styles.faqA}>{f.a}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16, marginTop: 4 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  backText: { fontSize: 22, fontWeight: "700", color: Colors.text, marginTop: -2 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: Colors.text },
  banner: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 20,
  },
  bannerTitle: { fontSize: 16, fontWeight: "800", color: Colors.text },
  bannerText: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: 16 },
  contactBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  contactBtnText: { color: Colors.white, fontWeight: "800", fontSize: 13 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: Colors.text, marginBottom: 10 },
  faqCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 10,
  },
  faqQ: { fontSize: 14, fontWeight: "800", color: Colors.text },
  faqA: { fontSize: 12, color: Colors.textSecondary, marginTop: 6, lineHeight: 18 },
});
