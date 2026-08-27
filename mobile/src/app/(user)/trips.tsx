import {
  Alert,
  Linking,
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
import { useAuthStore } from "../../store/auth";

type Trip = {
  booking_id?: number;
  id?: number;
  ride_id: number;
  pickup_location?: string;
  dropoff_location?: string;
  price?: number;
  status?: string;
  driver_name?: string;
  driver_phone?: string;
  driver_id?: number;
  scheduled_time?: string;
  passenger_count?: number;
  seats_available?: number;
  type?: "driver" | "passenger";
};

export default function Trips() {
  const { mode } = useAuthStore();
  const [items, setItems] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTrips = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(
        mode === "driver" ? "/api/v1/driver/trips" : "/api/v1/trips/history"
      );
      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
      setItems(list);
    } catch {
      try {
        if (mode === "driver") throw new Error("Driver trips unavailable");
        const { data } = await api.get("/api/v1/bookings/my-rides");
        const list = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];
        setItems(list);
      } catch {
        Alert.alert("Error", "Could not fetch your trips.");
      }
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useFocusEffect(
    useCallback(() => {
      void loadTrips();
    }, [loadTrips])
  );

  const handleCancel = (bookingId: number) => {
    Alert.alert("Cancel Ride", "Are you sure you want to cancel this booking?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await api.post(`/api/v1/bookings/${bookingId}/cancel`);
          } catch {
            // optimistically update
          }
          setItems((prev) =>
            prev.filter((t) => (t.booking_id ?? t.id) !== bookingId)
          );
          Alert.alert("Cancelled", "Ride booking cancelled.");
        },
      },
    ]);
  };

  const handleCall = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() =>
        Alert.alert("Error", "Could not launch phone dialer.")
      );
    } else {
      Alert.alert("Notice", "Driver phone number not provided.");
    }
  };

  const handleChat = (trip: Trip) => {
    if (!trip.ride_id || !trip.driver_id) {
      Alert.alert("Chat unavailable", "This trip is missing driver chat details.");
      return;
    }

    router.push({
      pathname: "/(user)/message" as any,
      params: {
        chatPartnerName: trip.driver_name || `Driver ${trip.driver_id}`,
        rideId: String(trip.ride_id),
        receiverId: String(trip.driver_id),
        driverPhone: trip.driver_phone || "",
      },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{mode === "driver" ? "Offered Rides" : "My Trips"}</Text>
        <Text style={styles.headerSubtitle}>
          {mode === "driver" ? "Rides you published as a driver" : "Your active and past shared commutes"}
        </Text>
      </View>

      {items.map((trip) => {
        const bId = trip.booking_id ?? trip.id ?? 1;
        const isDriverTrip = mode === "driver" || trip.type === "driver";
        const status = (trip.status || (isDriverTrip ? "published" : "scheduled")).toLowerCase();
        const isScheduled = ["scheduled", "published", "available", "full"].includes(status);
        const isFinal = ["completed", "cancelled"].includes(status);

        return (
          <View key={bId} style={styles.card}>
            <View style={styles.topRow}>
              <Text style={styles.bookingTag}>{isDriverTrip ? "RIDE" : "BOOKING"} #{bId}</Text>
              <View
                style={[
                  styles.statusBadge,
                  isScheduled ? styles.statusActive : styles.statusDone,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    isScheduled ? styles.statusActiveText : styles.statusDoneText,
                  ]}
                >
                  {(trip.status || "SCHEDULED").toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.routeBox}>
              <View style={styles.routeItem}>
                <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
                <Text style={styles.routeText} numberOfLines={1}>
                  {trip.pickup_location || "Pickup Location"}
                </Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routeItem}>
                <View style={[styles.dot, { backgroundColor: Colors.green }]} />
                <Text style={styles.routeText} numberOfLines={1}>
                  {trip.dropoff_location || "Dropoff Location"}
                </Text>
              </View>
            </View>

            {isDriverTrip && (
              <View style={styles.driverInfoRow}>
                <Text style={styles.driverName}>
                  Passengers: {trip.passenger_count ?? 0} | Seats: {trip.seats_available ?? "--"}
                </Text>
                <Text style={styles.priceText}>Rs {Number(trip.price || 0).toFixed(2)}</Text>
              </View>
            )}

            <View style={[styles.driverInfoRow, isDriverTrip && styles.hidden]}>
              <Text style={styles.driverName}>
                👤 {trip.driver_name || "Assigned Driver"}
              </Text>
              <Text style={styles.priceText}>₹{Number(trip.price || 0).toFixed(2)}</Text>
            </View>

            <View style={styles.actionsRow}>
              {isDriverTrip ? (
                !isFinal && (
                  <Pressable
                    onPress={() => router.push("/(user)/driver-active-ride" as any)}
                    style={styles.actionBtn}
                  >
                    <Text style={styles.actionBtnText}>Manage</Text>
                  </Pressable>
                )
              ) : (
                <>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/(user)/ride/[bookingId]" as any,
                    params: { bookingId: String(bId) },
                  })
                }
                style={styles.actionBtn}
              >
                <Text style={styles.actionBtnText}>🗺️ Map</Text>
              </Pressable>

              <Pressable onPress={() => handleChat(trip)} style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>💬 Chat</Text>
              </Pressable>

              <Pressable onPress={() => handleCall(trip.driver_phone)} style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>📞 Call</Text>
              </Pressable>

                </>
              )}

              {!isDriverTrip && isScheduled && (
                <Pressable onPress={() => handleCancel(bId)} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      })}

      {items.length === 0 && !loading && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🚗</Text>
          <Text style={styles.emptyTitle}>{mode === "driver" ? "No offered rides yet" : "No trips booked yet"}</Text>
          <Text style={styles.emptySubtitle}>
            {mode === "driver"
              ? "When you publish a ride, it will appear here."
              : "When you book a ride, it will appear here."}
          </Text>
          <Pressable
            onPress={() => router.push(mode === "driver" ? "/(user)/offer-ride" as any : "/(user)/find-ride" as any)}
            style={styles.findRidesBtn}
          >
            <Text style={styles.findRidesBtnText}>{mode === "driver" ? "Offer a Ride" : "Find a Ride Now"}</Text>
          </Pressable>
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
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  bookingTag: { fontSize: 10, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12 },
  statusActive: { backgroundColor: "#DCFCE7" },
  statusDone: { backgroundColor: "#F1F5F9" },
  statusText: { fontSize: 10, fontWeight: "800" },
  statusActiveText: { color: Colors.greenDark },
  statusDoneText: { color: Colors.textSecondary },
  routeBox: { marginVertical: 6 },
  routeItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  routeText: { flex: 1, fontSize: 13, fontWeight: "600", color: Colors.text },
  routeLine: { width: 2, height: 12, backgroundColor: "#E2E8F0", marginLeft: 3, marginVertical: 2 },
  driverInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  driverName: { fontSize: 12, fontWeight: "700", color: Colors.textSecondary },
  hidden: { display: "none" },
  priceText: { fontSize: 18, fontWeight: "900", color: Colors.greenDark },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F8FAFC" },
  actionBtn: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: { fontSize: 12, fontWeight: "700", color: Colors.text },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#FEE2E2",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: { fontSize: 12, fontWeight: "800", color: "#DC2626" },
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
  emptySubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: "center", marginTop: 4, marginBottom: 18 },
  findRidesBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  findRidesBtnText: { color: Colors.white, fontWeight: "800", fontSize: 13 },
});
