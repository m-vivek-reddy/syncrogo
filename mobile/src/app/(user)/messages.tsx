import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import api from "../../api/client";
import { Colors } from "../../constants/colors";

type Conversation = {
  rideId: number;
  receiverId: number;
  name: string;
  lastMessage: string;
  time: string;
  phone?: string;
};

export default function Messages() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/chat/conversations");
      const raw = res.data;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
        ? raw.data
        : [];
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadConversations();
    }, [loadConversations])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Text style={styles.headerSubtitle}>
          Chat with drivers and passengers
        </Text>
      </View>

      {items.map((item) => (
        <Pressable
          key={`${item.rideId}-${item.receiverId}`}
          onPress={() =>
            router.push({
              pathname: "/(user)/message" as any,
              params: {
                chatPartnerName: item.name,
                rideId: String(item.rideId),
                receiverId: String(item.receiverId),
                driverPhone: item.phone || "",
              },
            })
          }
          style={({ pressed }) => [
            styles.chatCard,
            pressed && styles.chatCardPressed,
          ]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.chatInfo}>
            <View style={styles.chatTop}>
              <Text style={styles.partnerName}>{item.name}</Text>
              <Text style={styles.chatTime}>{item.time}</Text>
            </View>
            <Text style={styles.lastMsg} numberOfLines={1}>
              {item.lastMessage}
            </Text>
          </View>
        </Pressable>
      ))}

      {items.length === 0 && !loading && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>
            When you book or offer a ride, you can chat with your trip partners here.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 16, marginTop: 4 },
  headerTitle: { fontSize: 24, fontWeight: "900", color: Colors.text },
  headerSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  chatCardPressed: { backgroundColor: "#F8FAFC" },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarText: { fontSize: 18, fontWeight: "800", color: Colors.primaryDark },
  chatInfo: { flex: 1 },
  chatTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  partnerName: { fontSize: 15, fontWeight: "800", color: Colors.text },
  chatTime: { fontSize: 11, color: Colors.textSecondary },
  lastMsg: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: Colors.text },
  emptySubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: "center", marginTop: 4 },
});
