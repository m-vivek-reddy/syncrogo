import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import api from "../../api/client";
import { Colors } from "../../constants/colors";
import { useAuthStore } from "../../store/auth";
import HomeMap from "../../components/HomeMap";

type PassengerBooking = {
  booking_id: number;
  ride_id: number;
  pickup_location: string;
  dropoff_location: string;
  status: string;
  price: number;
  driver_id?: number;
  driver_name?: string;
  driver_phone?: string;
};

type ActiveRide = {
  id: number;
  origin: string;
  destination: string;
  price_per_seat: number;
  available_seats?: number;
  seats_available?: number;
  passengers?: { id: number; name: string; phone: string }[];
};

export default function Home() {
  const { mode, setMode } = useAuthStore();
  const isDriver = mode === "driver";

  const [passengerBookings, setPassengerBookings] = useState<PassengerBooking[]>([]);
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const prevSeatsRef = useRef<number | null>(null);

  // Load passenger bookings
  const loadPassengerBookings = useCallback(async () => {
    if (isDriver) return;
    try {
      setLoadingBookings(true);
      const { data } = await api.get("/api/v1/bookings/my-rides");
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setPassengerBookings(list);
    } catch {
      // ignore
    } finally {
      setLoadingBookings(false);
    }
  }, [isDriver]);

  // Load driver active ride
  const loadActiveDriverRide = useCallback(async () => {
    if (!isDriver) return;
    try {
      const { data } = await api.get("/api/v1/rides/driver/active");
      if (data?.success && data?.data) {
        const seats = data.data.available_seats ?? data.data.seats_available ?? 0;
        if (prevSeatsRef.current !== null && seats < prevSeatsRef.current) {
          Alert.alert("🎉 New Passenger", "A passenger just booked a seat on your ride!");
        }
        prevSeatsRef.current = seats;
        setActiveRide(data.data);
      } else {
        setActiveRide(null);
        prevSeatsRef.current = null;
      }
    } catch {
      setActiveRide(null);
    }
  }, [isDriver]);

  useFocusEffect(
    useCallback(() => {
      if (isDriver) {
        void loadActiveDriverRide();
      } else {
        void loadPassengerBookings();
      }
    }, [isDriver, loadActiveDriverRide, loadPassengerBookings])
  );

  // Polling for driver active ride
  useEffect(() => {
    if (!isDriver) return;
    const interval = setInterval(loadActiveDriverRide, 6000);
    return () => clearInterval(interval);
  }, [isDriver, loadActiveDriverRide]);

  // Cancel booking
  const handleCancelBooking = (bookingId: number) => {
    Alert.alert("Cancel Ride", "Are you sure you want to cancel this booking?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await api.post(`/api/v1/bookings/${bookingId}/cancel`);
            Alert.alert("Success", "Booking cancelled.");
            setPassengerBookings((prev) => prev.filter((b) => b.booking_id !== bookingId));
          } catch {
            // optimistically update
            setPassengerBookings((prev) => prev.filter((b) => b.booking_id !== bookingId));
            Alert.alert("Cancelled", "Ride booking has been removed.");
          }
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
      Alert.alert("Notice", "Phone number not available.");
    }
  };

  const handleChat = (name: string, rideId: number, receiverId?: number, phone?: string) => {
    if (!rideId || !receiverId) {
      Alert.alert("Chat unavailable", "This ride is missing chat details.");
      return;
    }

    router.push({
      pathname: "/(user)/message",
      params: {
        chatPartnerName: name,
        rideId: String(rideId),
        receiverId: String(receiverId),
        driverPhone: phone || "",
      },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Live Interactive Map with GPS Tracking & Mode Controls */}
      <HomeMap />

      <View style={styles.sheetContainer}>
        {/* ==================================================== */}
        {/* PASSENGER VIEW */}
        {/* ==================================================== */}
        {!isDriver ? (
          <>
            {/* Find Ride Banner */}
            <View style={styles.planCard}>
              <View style={styles.planTextContainer}>
                <Text style={styles.planTag}>PLAN YOUR RIDE</Text>
                <Text style={styles.planTitle}>Find a ride near you</Text>
                <Text style={styles.planSubtitle}>
                  Search rides and travel together in seconds.
                </Text>
              </View>
              <Pressable
                onPress={() => router.push("/(user)/find-ride")}
                style={styles.findButton}
              >
                <Text style={styles.findButtonText}>Find Offers</Text>
              </Pressable>
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionHeader}>Quick Actions</Text>
            <View style={styles.quickGrid}>
              <Pressable
                onPress={() => router.push("/(user)/find-ride")}
                style={styles.actionCard}
              >
                <Text style={styles.actionIcon}>🔍</Text>
                <Text style={styles.actionTitle}>Find a Ride</Text>
                <Text style={styles.actionSub}>Search nearby offers</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/(user)/trips")}
                style={styles.actionCard}
              >
                <Text style={styles.actionIcon}>🗺️</Text>
                <Text style={styles.actionTitle}>My Trips</Text>
                <Text style={styles.actionSub}>View bookings</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/(user)/payments")}
                style={styles.actionCard}
              >
                <Text style={styles.actionIcon}>💳</Text>
                <Text style={styles.actionTitle}>Payments</Text>
                <Text style={styles.actionSub}>Wallet & UPI</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/(user)/messages")}
                style={styles.actionCard}
              >
                <Text style={styles.actionIcon}>💬</Text>
                <Text style={styles.actionTitle}>Messages</Text>
                <Text style={styles.actionSub}>Trip chats</Text>
              </Pressable>
            </View>

            {/* Nearby Drivers Card */}
            <View style={styles.nearbySection}>
              <Text style={styles.sectionHeader}>Nearby Drivers</Text>
              <View style={{ paddingVertical: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 13, color: Colors.textSecondary, fontWeight: "500" }}>
                  No drivers available nearby right now.
                </Text>
              </View>
            </View>

            {/* Popular Routes */}
            <Text style={styles.sectionHeader}>Popular Routes</Text>
            <View style={styles.popularRow}>
              <Pressable
                onPress={() => router.push("/(user)/find-ride")}
                style={styles.popularCard}
              >
                <Text style={styles.routeText}>Hitech City ➔ Gachibowli</Text>
                <Text style={styles.routeFare}>From ₹45</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/(user)/find-ride")}
                style={styles.popularCard}
              >
                <Text style={styles.routeText}>Secunderabad ➔ Cyber Towers</Text>
                <Text style={styles.routeFare}>From ₹95</Text>
              </Pressable>
            </View>

            {/* Recent Activity */}
            <Text style={styles.sectionHeader}>Recent Activity</Text>
            {passengerBookings.length > 0 ? (
              passengerBookings.map((booking) => (
                <View key={booking.booking_id} style={styles.bookingCard}>
                  <View style={styles.bookingHeader}>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>
                        {booking.status?.toUpperCase() || "SCHEDULED"}
                      </Text>
                    </View>
                    <Text style={styles.bookingPrice}>₹{booking.price}</Text>
                  </View>

                  <View style={styles.routeFlow}>
                    <View style={styles.routePoint}>
                      <View style={[styles.routeDot, { backgroundColor: Colors.primary }]} />
                      <Text style={styles.routeAddress} numberOfLines={1}>
                        From: {booking.pickup_location}
                      </Text>
                    </View>
                    <View style={styles.routeLine} />
                    <View style={styles.routePoint}>
                      <View style={[styles.routeDot, { backgroundColor: Colors.green }]} />
                      <Text style={styles.routeAddress} numberOfLines={1}>
                        To: {booking.dropoff_location}
                      </Text>
                    </View>
                  </View>

                  {/* Actions Row */}
                  <View style={styles.cardActions}>
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/(user)/ride/[bookingId]" as any,
                          params: { bookingId: String(booking.booking_id) },
                        })
                      }
                      style={styles.actionIconBtn}
                    >
                      <Text style={styles.actionIconLabel}>🗺️ Map</Text>
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        handleChat(
                          booking.driver_name || "Driver",
                          booking.ride_id,
                          booking.driver_id,
                          booking.driver_phone
                        )
                      }
                      style={styles.actionIconBtn}
                    >
                      <Text style={styles.actionIconLabel}>💬 Chat</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleCall(booking.driver_phone)}
                      style={styles.actionIconBtn}
                    >
                      <Text style={styles.actionIconLabel}>📞 Call</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleCancelBooking(booking.booking_id)}
                      style={styles.cancelBtn}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  {loadingBookings
                    ? "Loading your rides..."
                    : "No recent rides. Time to explore!"}
                </Text>
              </View>
            )}
          </>
        ) : (
          /* ==================================================== */
          /* DRIVER VIEW */
          /* ==================================================== */
          <>
            {/* Stats Row */}
            <View style={styles.driverStatsRow}>
              <View style={styles.driverStatCard}>
                <Text style={styles.driverStatLabel}>Today&apos;s Earnings</Text>
                <Text style={[styles.driverStatValue, { color: Colors.green }]}>₹0</Text>
              </View>
              <View style={styles.driverStatCard}>
                <Text style={styles.driverStatLabel}>Available Seats</Text>
                <Text style={styles.driverStatValue}>
                  {activeRide
                    ? activeRide.available_seats ?? activeRide.seats_available ?? "-"
                    : "-"}
                </Text>
              </View>
            </View>

            {/* Offer New Ride Button */}
            <Pressable
              onPress={() => router.push("/(user)/offer-ride")}
              style={styles.offerRideBtn}
            >
              <Text style={styles.offerRideBtnText}>+ Offer New Ride</Text>
            </Pressable>

            {/* Active Ride Section */}
            <Text style={styles.sectionHeader}>
              {activeRide ? "Active Ride" : "No Active Rides"}
            </Text>

            {activeRide ? (
              <View style={styles.activeRideCard}>
                <Pressable
                  onPress={() => router.push("/(user)/driver-active-ride" as any)}
                  style={styles.openDriverMapBtn}
                >
                  <Text style={styles.openDriverMapText}>🗺️ Manage Active Ride & Live Map</Text>
                </Pressable>

                <View style={styles.routeFlow}>
                  <View style={styles.routePoint}>
                    <View style={[styles.routeDot, { backgroundColor: Colors.text }]} />
                    <Text style={styles.routeAddress} numberOfLines={1}>
                      {activeRide.origin?.split(",")[0] || "Origin"}
                    </Text>
                    <Text style={styles.nowBadge}>Now</Text>
                  </View>
                  <View style={styles.routeLine} />
                  <View style={styles.routePoint}>
                    <View style={[styles.routeDot, { backgroundColor: Colors.green }]} />
                    <Text style={styles.routeAddress} numberOfLines={1}>
                      {activeRide.destination?.split(",")[0] || "Destination"}
                    </Text>
                  </View>
                </View>

                {/* Booked Passengers */}
                {activeRide.passengers && activeRide.passengers.length > 0 && (
                  <View style={styles.passengersSection}>
                    <Text style={styles.passengersHeader}>Booked Passengers</Text>
                    {activeRide.passengers.map((passenger) => (
                      <View key={passenger.id} style={styles.passengerRow}>
                        <View>
                          <Text style={styles.passengerName}>{passenger.name}</Text>
                          <Text style={styles.passengerSeat}>Seat Confirmed</Text>
                        </View>
                        <View style={styles.passengerBtns}>
                          <Pressable
                            onPress={() =>
                              handleChat(passenger.name, activeRide.id, passenger.id, passenger.phone)
                            }
                            style={styles.smallRoundBtn}
                          >
                            <Text>💬</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleCall(passenger.phone)}
                            style={styles.smallRoundBtn}
                          >
                            <Text>📞</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  You haven&apos;t published any routes today.
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  sheetContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  planCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  planTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  planTag: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 2,
  },
  planSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  findButton: {
    backgroundColor: Colors.green,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  findButtonText: {
    color: Colors.white,
    fontWeight: "800",
    fontSize: 13,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 10,
    marginTop: 6,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  actionCard: {
    width: "48%",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIcon: {
    fontSize: 22,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.text,
  },
  actionSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  nearbySection: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 16,
  },
  driverItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  driverAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  driverAvatarText: {
    fontWeight: "800",
    color: Colors.primaryDark,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  driverMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  driverTag: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  driverTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.greenDark,
  },
  popularRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  popularCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  routeText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text,
  },
  routeFare: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.green,
    marginTop: 4,
  },
  bookingCard: {
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
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusPill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.greenDark,
  },
  bookingPrice: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.greenDark,
  },
  routeFlow: {
    marginVertical: 4,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeAddress: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
  },
  routeLine: {
    width: 2,
    height: 14,
    backgroundColor: "#E2E8F0",
    marginLeft: 4,
    marginVertical: 2,
  },
  nowBadge: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.green,
  },
  openDriverMapBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  openDriverMapText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "800",
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  actionIconBtn: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#FEE2E2",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#DC2626",
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 16,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  driverStatsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  driverStatCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  driverStatLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "700",
    marginBottom: 4,
  },
  driverStatValue: {
    fontSize: 22,
    fontWeight: "900",
    color: Colors.text,
  },
  offerRideBtn: {
    backgroundColor: Colors.green,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  offerRideBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  activeRideCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  passengersSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  passengersHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  passengerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  passengerName: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  passengerSeat: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  passengerBtns: {
    flexDirection: "row",
    gap: 6,
  },
  smallRoundBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
});
