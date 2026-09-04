import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import api from "../../../api/client";
import { Colors } from "../../../constants/colors";
import PassengerRideMap, {
  type PassengerMarker,
} from "../../../components/PassengerRideMap";

type LiveBookingData = {
  booking_id: number;
  ride_id: number;
  status: string;
  otp_code?: string;
  otp_verified?: string | boolean;
  fare: number;
  driver_start: { name?: string; latitude: number; longitude: number } | null;
  driver_destination: { name?: string; latitude: number; longitude: number } | null;
  driver_current_location?: { latitude: number; longitude: number } | null;
  passengers: PassengerMarker[];
  driver_info: {
    id: number;
    name: string;
    phone: string;
    rating?: number | null;
    vehicle?: string;
    vehicle_number?: string;
  };
  ride_info: {
    price_per_seat?: number;
    available_seats?: number;
    distance_km?: number | null;
  };
  started_at?: string | null;
  completed_at?: string | null;
};

export default function RideNavigation() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [data, setData] = useState<LiveBookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Passenger live location sharing
  const [sharingLocation, setSharingLocation] = useState(false);
  const [lastSharedAt, setLastSharedAt] = useState<string | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const hasLoadedRef = useRef(false);

  const shareLocation = useCallback(async () => {
    if (!bookingId) return;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        const req = await Location.requestForegroundPermissionsAsync();
        if (req.status !== "granted") return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      await api.post(`/api/v1/bookings/${bookingId}/passenger-location`, {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      setLastSharedAt(new Date().toLocaleTimeString());
    } catch {
      // Silent — location sharing is best-effort
    }
  }, [bookingId]);

  // Share live location while booking is active
  const isBookingActive = Boolean(
    data &&
      !["COMPLETED", "CANCELLED"].includes((data.status || "").toUpperCase())
  );

  useEffect(() => {
    if (!isBookingActive) {
      watchRef.current?.remove();
      watchRef.current = null;
      setSharingLocation(false);
      return;
    }

    let cancelled = false;

    const start = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || cancelled) return;
        setSharingLocation(true);

        // Immediate push, then watch
        void shareLocation();
        watchRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 15000,
            distanceInterval: 30,
          },
          () => void shareLocation()
        );
      } catch {
        setSharingLocation(false);
      }
    };

    void start();

    return () => {
      cancelled = true;
      watchRef.current?.remove();
      watchRef.current = null;
      setSharingLocation(false);
    };
  }, [isBookingActive, shareLocation]);

  const loadLiveBooking = useCallback(
    async (isManualRefresh = false) => {
      if (!bookingId) return;
      try {
        if (isManualRefresh) setRefreshing(true);
        else if (!hasLoadedRef.current) setLoading(true);

        const res = await api.get(`/api/v1/bookings/${bookingId}/live`);
        if (res.data?.success && res.data?.data) {
          setData(res.data.data);
          hasLoadedRef.current = true;
          setError(null);
        } else {
          setError("Booking details not available.");
        }
      } catch (err: any) {
        setError(
          err?.response?.data?.detail || "Could not fetch live booking data."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [bookingId]
  );

  useFocusEffect(
    useCallback(() => {
      void loadLiveBooking();
    }, [loadLiveBooking])
  );

  // Poll for driver live location & status when ride is active
  useEffect(() => {
    if (!data || data.status === "COMPLETED" || data.status === "CANCELLED") {
      return;
    }
    const interval = setInterval(() => {
      void loadLiveBooking(false);
    }, 8000);
    return () => clearInterval(interval);
  }, [data, loadLiveBooking]);

  const handleCallDriver = () => {
    const phone = data?.driver_info?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() =>
        Alert.alert("Error", "Could not open dialer.")
      );
    } else {
      Alert.alert("Notice", "Driver phone number is not available.");
    }
  };

  const handleChatDriver = () => {
    if (!data) return;
    const driverId = data.driver_info?.id;
    if (!driverId) {
      Alert.alert("Chat unavailable", "This booking is missing driver chat details.");
      return;
    }

    router.push({
      pathname: "/(user)/message" as any,
      params: {
        chatPartnerName: data.driver_info?.name || "Driver",
        rideId: String(data.ride_id),
        receiverId: String(driverId),
        driverPhone: data.driver_info?.phone || "",
      },
    });
  };

  const handleCancelBooking = () => {
    if (!data) return;
    Alert.alert("Cancel Booking", "Are you sure you want to cancel this booking?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await api.post(`/api/v1/bookings/${data.booking_id}/cancel`);
            Alert.alert("Cancelled", "Your booking has been cancelled.");
            router.replace("/(user)/trips" as any);
          } catch (err: any) {
            Alert.alert(
              "Error",
              err?.response?.data?.detail || "Could not cancel booking."
            );
          }
        },
      },
    ]);
  };

  if (loading && !data) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading live carpool route...</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <Pressable onPress={() => void loadLiveBooking(true)} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const isCompleted = data?.status === "COMPLETED";
  const isStarted = data?.status === "STARTED";
  const isAccepted = data?.status === "ACCEPTED";
  const isPending = data?.status === "PENDING";
  const isCancelled = data?.status === "CANCELLED";

  const ratingVal = data?.driver_info?.rating;
  const ratingText =
    ratingVal !== null && ratingVal !== undefined && ratingVal > 0
      ? ratingVal.toFixed(1)
      : "No ratings yet";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Bar */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {isStarted ? "Live Trip Tracking" : "Carpool Route Map"}
          </Text>
          <Text style={styles.headerSub}>Booking #{bookingId}</Text>
        </View>
        <Pressable
          onPress={() => void loadLiveBooking(true)}
          style={styles.refreshBtn}
        >
          <Text style={styles.refreshText}>{refreshing ? "..." : "🔄"}</Text>
        </Pressable>
      </View>

      {/* Map Section */}
      <PassengerRideMap
        driverStart={data?.driver_start || null}
        driverDestination={data?.driver_destination || null}
        driverCurrentLocation={isStarted ? data?.driver_current_location : null}
        passengers={data?.passengers || []}
        rideStatus={data?.status}
        vehicleType={data?.driver_info?.vehicle}
        height={360}
      />

      {/* Ride Status Banner */}
      <View style={styles.statusBanner}>
        <View style={styles.statusPill}>
          <Text style={styles.statusTag}>STATUS</Text>
          <Text style={styles.statusValue}>{data?.status || "SCHEDULED"}</Text>
        </View>

        {data?.otp_code && (isAccepted || isStarted) && (
          <View style={styles.otpBox}>
            <Text style={styles.otpLabel}>SHARE OTP WITH DRIVER</Text>
            <Text style={styles.otpCode}>{data.otp_code}</Text>
          </View>
        )}
      </View>

      {/* Live location sharing indicator */}
      <View style={styles.locationShareBar}>
        <Text style={styles.locationShareText}>
          {sharingLocation
            ? `🟢 Live location sharing ON${lastSharedAt ? ` • last update ${lastSharedAt}` : ""}`
            : "⚪ Live location sharing off"}
        </Text>
      </View>

      {/* Driver Information Card */}
      <View style={styles.card}>
        <Text style={styles.cardSectionLabel}>DRIVER & VEHICLE</Text>
        <View style={styles.driverRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(data?.driver_info?.name || "D").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.driverName}>
              {data?.driver_info?.name || "Driver"}
            </Text>
            <Text style={styles.vehicleInfo}>
              🚗 {data?.driver_info?.vehicle || "Car"} •{" "}
              {data?.driver_info?.vehicle_number || "Verified Driver"}
            </Text>
            <View style={styles.ratingRow}>
              <Text style={styles.starIcon}>★</Text>
              <Text style={styles.ratingText}>{ratingText}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionGrid}>
          <Pressable onPress={handleChatDriver} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>💬 Chat</Text>
          </Pressable>
          <Pressable onPress={handleCallDriver} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>📞 Call</Text>
          </Pressable>
        </View>
      </View>

      {/* Carpool Route & Seats Info */}
      <View style={styles.card}>
        <Text style={styles.cardSectionLabel}>CARPOOL ROUTE DETAILS</Text>

        <View style={styles.routeFlow}>
          <View style={styles.routePoint}>
            <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
            <Text style={styles.routeAddress} numberOfLines={1}>
              Driver Pickup: {data?.driver_start?.name || "Origin"}
            </Text>
          </View>

          {data?.passengers && data.passengers.length > 0 && (
            <View style={styles.passengersFlow}>
              <Text style={styles.passengersFlowHeader}>
                Booked Passengers ({data.passengers.length}):
              </Text>
              {data.passengers.map((p, idx) => (
                <View key={`pf-${idx}`} style={styles.passengerFlowRow}>
                  <Text style={styles.passengerDot}>📍</Text>
                  <Text style={styles.passengerFlowText} numberOfLines={1}>
                    {p.is_current_user ? "Your Pickup: " : `${p.name}: `}
                    {p.pickup_location || "Pickup point"}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.routeLine} />

          <View style={styles.routePoint}>
            <View style={[styles.dot, { backgroundColor: Colors.green }]} />
            <Text style={styles.routeAddress} numberOfLines={1}>
              Driver Destination: {data?.driver_destination?.name || "Destination"}
            </Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Fare / Seat</Text>
            <Text style={styles.metricValue}>₹{data?.fare ?? 0}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Seats Left</Text>
            <Text style={styles.metricValue}>
              {data?.ride_info?.available_seats ?? 0}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Distance</Text>
            <Text style={styles.metricValue}>
              {data?.ride_info?.distance_km
                ? `${data.ride_info.distance_km} km`
                : "Route Live"}
            </Text>
          </View>
        </View>
      </View>

      {/* Cancel Action if Pending */}
      {isPending && (
        <Pressable onPress={handleCancelBooking} style={styles.cancelCardBtn}>
          <Text style={styles.cancelCardText}>Cancel Booking</Text>
        </Pressable>
      )}

      {isCompleted && (
        <View style={styles.completedCard}>
          <Text style={styles.completedTitle}>🎉 Trip Completed</Text>
          <Text style={styles.completedSub}>
            Thank you for traveling with SyncroGo!
          </Text>
        </View>
      )}

      {isCancelled && (
        <View style={styles.cancelledCard}>
          <Text style={styles.cancelledTitle}>Ride Cancelled</Text>
          <Text style={styles.cancelledSub}>
            This ride booking is no longer active.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 40 },
  centerContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
    textAlign: "center",
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: { color: Colors.white, fontWeight: "800", fontSize: 13 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    marginTop: 4,
  },
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
  backText: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    marginTop: -2,
  },
  headerTitle: { fontSize: 20, fontWeight: "900", color: Colors.text },
  headerSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  refreshText: { fontSize: 14 },
  statusBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  locationShareBar: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  locationShareText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  statusPill: { flex: 1 },
  statusTag: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.primary,
    marginTop: 2,
  },
  otpBox: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  otpLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: "#166534",
    letterSpacing: 0.5,
  },
  otpCode: {
    fontSize: 18,
    fontWeight: "900",
    color: "#15803D",
    letterSpacing: 2,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
  },
  cardSectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 20, fontWeight: "900", color: Colors.primaryDark },
  driverName: { fontSize: 16, fontWeight: "800", color: Colors.text },
  vehicleInfo: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  starIcon: { color: "#F59E0B", fontSize: 13 },
  ratingText: { fontSize: 12, fontWeight: "800", color: "#B45309" },
  actionGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  actionBtn: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: { fontSize: 13, fontWeight: "800", color: Colors.text },
  routeFlow: { marginVertical: 4 },
  routePoint: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  routeAddress: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  routeLine: {
    width: 2,
    height: 12,
    backgroundColor: "#E2E8F0",
    marginLeft: 4,
    marginVertical: 3,
  },
  passengersFlow: {
    marginLeft: 18,
    marginVertical: 6,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: "#DBEAFE",
  },
  passengersFlowHeader: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    marginBottom: 4,
  },
  passengerFlowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginVertical: 2,
  },
  passengerDot: { fontSize: 12 },
  passengerFlowText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    flex: 1,
  },
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  metricItem: { flex: 1, alignItems: "center" },
  metricLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: "700" },
  metricValue: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.text,
    marginTop: 2,
  },
  metricDivider: { width: 1, height: 24, backgroundColor: "#F1F5F9" },
  cancelCardBtn: {
    backgroundColor: "#FEE2E2",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  cancelCardText: { fontSize: 14, fontWeight: "800", color: "#DC2626" },
  completedCard: {
    backgroundColor: "#DCFCE7",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  completedTitle: { fontSize: 18, fontWeight: "900", color: "#15803D" },
  completedSub: {
    fontSize: 12,
    color: "#166534",
    marginTop: 4,
    fontWeight: "600",
  },
  cancelledCard: {
    backgroundColor: "#FEE2E2",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  cancelledTitle: { fontSize: 18, fontWeight: "900", color: "#DC2626" },
  cancelledSub: {
    fontSize: 12,
    color: "#991B1B",
    marginTop: 4,
    fontWeight: "600",
  },
});
