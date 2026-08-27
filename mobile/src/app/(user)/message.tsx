import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import api from "../../api/client";
import { Colors } from "../../constants/colors";
import { useAuthStore } from "../../store/auth";

type MessageItem = {
  id: number | string;
  senderId?: number;
  isMine: boolean;
  text: string;
  time: string;
};

export default function MessageScreen() {
  const params = useLocalSearchParams();
  const { user } = useAuthStore();

  const chatPartnerName = (params.chatPartnerName as string) || "Trip Partner";
  const driverPhone = (params.driverPhone as string) || "";
  const rideId = Number(params.rideId);
  const receiverId = Number(params.receiverId);
  const currentUserId = Number(user?.id);
  const hasValidConversation = Number.isFinite(rideId) && Number.isFinite(receiverId);

  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const loadChatHistory = useCallback(async () => {
    if (!hasValidConversation) {
      setLoadError("This conversation is missing ride or user details.");
      return;
    }

    try {
      const res = await api.get(`/chat/history/${rideId}`, {
        params: { receiver_id: receiverId },
      });
      if (res.status === 200 && Array.isArray(res.data)) {
        const formatted = res.data.map((msg: any) => {
          const serverSenderId = Number(msg.sender_id);
          return {
            id: msg.id,
            senderId: Number.isFinite(serverSenderId) ? serverSenderId : undefined,
            isMine:
              msg.sender === "me" ||
              (Number.isFinite(serverSenderId) && serverSenderId === currentUserId),
            text: msg.text || msg.content || "",
            time:
              msg.timestamp ||
              (msg.created_at
                ? new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })),
          };
        });
        setMessages(formatted);
        setLoadError(null);
      }
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 403 || status === 401) {
        setLoadError("You no longer have access to this conversation.");
      } else if (status === 404) {
        setLoadError("This conversation is unavailable.");
      } else {
        setLoadError("Unable to load messages. Check your connection.");
      }
    }
  }, [hasValidConversation, rideId, receiverId, currentUserId]);

  useEffect(() => {
    setLoading(true);
    void loadChatHistory().finally(() => setLoading(false));
    if (!hasValidConversation) return;
    const interval = setInterval(loadChatHistory, 4000);
    return () => clearInterval(interval);
  }, [hasValidConversation, loadChatHistory]);

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;
    if (!hasValidConversation) {
      setSendError("This conversation is missing ride or user details.");
      return;
    }
    const textToSend = inputText.trim();

    const optimisticId = `temp-${Date.now()}`;
    const optimisticMsg: MessageItem = {
      id: optimisticId,
      senderId: currentUserId,
      isMine: true,
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText("");
    setSendError(null);
    setSending(true);

    try {
      await api.post("/chat/send", {
        ride_id: rideId,
        receiver_id: receiverId,
        content: textToSend,
      });
      // Refresh from server so the optimistic entry gets the real server id + timestamp
      void loadChatHistory();
    } catch (e: any) {
      const status = e?.response?.status;
      let msg = "Could not send message. Please try again.";
      if (status === 403) msg = "You cannot message this user for this ride.";
      else if (status === 401) msg = "Please sign in again to send messages.";
      else if (status === 404) msg = "This conversation no longer exists.";
      setSendError(msg);
      // Roll back optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setInputText(textToSend);
    } finally {
      setSending(false);
    }
  };

  const handleCall = () => {
    if (driverPhone) {
      Linking.openURL(`tel:${driverPhone}`).catch(() =>
        Alert.alert("Error", "Could not open dialer.")
      );
    } else {
      Alert.alert("Notice", "Phone number not available.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {chatPartnerName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.partnerName}>{chatPartnerName}</Text>
            <Text style={styles.onlineStatus}>● Online</Text>
          </View>
        </View>

        {driverPhone ? (
          <Pressable onPress={handleCall} style={styles.callBtn}>
            <Text style={styles.callIcon}>📞</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Messages */}
      {loading && messages.length === 0 ? (
        <View style={styles.emptyMessages}>
          <Text style={styles.emptyText}>Loading conversation…</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubbleWrapper,
                item.isMine ? styles.myBubbleWrapper : styles.theirBubbleWrapper,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  item.isMine ? styles.myBubble : styles.theirBubble,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    item.isMine ? styles.myBubbleText : styles.theirBubbleText,
                  ]}
                >
                  {item.text}
                </Text>
              </View>
              <Text style={styles.bubbleTime}>{item.time}</Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyText}>
                {loadError ? loadError : "No messages yet. Say hello!"}
              </Text>
            </View>
          }
        />
      )}

      {sendError ? (
        <Text style={styles.errorBanner}>{sendError}</Text>
      ) : null}

      {/* Input Row */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={(t) => {
            setInputText(t);
            if (sendError) setSendError(null);
          }}
          placeholder="Type a message..."
          placeholderTextColor="#94A3B8"
          editable={!sending}
        />
        <Pressable
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
          style={[
            styles.sendBtn,
            inputText.trim() && !sending ? styles.sendBtnActive : styles.sendBtnDisabled,
          ]}
        >
          <Text style={styles.sendIcon}>{sending ? "…" : "➤"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    height: 70,
    backgroundColor: Colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  backText: { fontSize: 22, fontWeight: "700", color: Colors.text, marginTop: -2 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatarText: { fontWeight: "800", color: Colors.primaryDark },
  partnerName: { fontSize: 15, fontWeight: "800", color: Colors.text },
  onlineStatus: { fontSize: 11, color: Colors.green, fontWeight: "700" },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  callIcon: { fontSize: 16 },
  messagesList: { padding: 16, flexGrow: 1, justifyContent: "flex-end" },
  bubbleWrapper: { marginBottom: 12, maxWidth: "78%" },
  myBubbleWrapper: { alignSelf: "flex-end", alignItems: "flex-end" },
  theirBubbleWrapper: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  myBubble: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  theirBubble: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  myBubbleText: { color: Colors.white },
  theirBubbleText: { color: Colors.text },
  bubbleTime: { fontSize: 10, color: "#94A3B8", marginTop: 4, marginHorizontal: 4 },
  emptyMessages: { alignItems: "center", marginTop: 40 },
  emptyText: { color: "#94A3B8", fontSize: 13, fontWeight: "600" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnActive: { backgroundColor: Colors.primary },
  sendBtnDisabled: { backgroundColor: "#E2E8F0" },
  sendIcon: { color: Colors.white, fontSize: 16, marginLeft: 2 },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    color: "#B91C1C",
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#FECACA",
  },
});
