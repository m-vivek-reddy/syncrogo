import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import api from "../../api/client";
import { Colors } from "../../constants/colors";
import { useAuthStore } from "../../store/auth";
import DriverRideMap, {
  type DriverPassengerMarker,
} from "../../components/DriverRideMap";
import { distanceToRouteMeters, fetchRoadRoute, type Coordinate } from "../../services/routing";

type ActiveDriverRideData = {
  id: number;
  driver_id: number;
  origin: string;
  destination: string;
  pickup_lat: number;
  pickup_lon: number;
  dropoff_lat: number;
  dropoff_lon: number;
  distance_km?: number;
  vehicle_type?: string;
  price_per_seat?: number;
  seats_available?: number;
  available_seats?: number;
  status: string; // published, full, started, completed
  passengers: {
    booking_id: number;
    id: number;
    passenger_id: number;
    name: string;
    phone?: string;
    pickup_location?: string;
    pickup_lat: number;
    pickup_lon: number;
    dropoff_location?: string;
    dropoff_lat: number;
    dropoff_lon: number;
    status: string; // ACCEPTED, CONFIRMED, STARTED, PICKED_UP, COMPLETED
    otp_code?: string;
    otp_verified?: string | boolean;
  }[];
};

export default function DriverActiveRideScreen() {
  const { user, mode } = useAuthStore();
  const [data, setData] = useState<ActiveDriverRideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // GPS & Live location state
  const [currentGps, setCurrentGps] = useState<Coordinate | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // OTP Inputs per passenger
  const [otpInputs, setOtpInputs] = useState<Record<number, string>>({});
  const [verifyingOtpId, setVerifyingOtpId] = useState<number | null>(null);

  // Action loading states
  const [isStartingRide, setIsStartingRide] = useState(false);
  const [isCompletingRide, setIsCompletingRide] = useState(false);
  const [isRemovingRide, setIsRemovingRide] = useState(false);
  const [completingPassengerId, setCompletingPassengerId] = useState<number | null>(null);

  // On-route warning check
  const [offRouteWarnings, setOffRouteWarnings] = useState<string[]>([]);

  /*
   * Refs hold the latest values without making callbacks unstable.
   * This prevents the useFocusEffect -> loadActiveRide -> setData ->
   * useFocusEffect re-run infinite loop.
   */
  const dataRef = useRef<ActiveDriverRideData | null>(null);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const userIdRef = useRef<number | string | undefined>(undefined);
  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  /*
   * Redirect passenger or non-owner if trying to open driver-only screen directly.
   * Uses refs so this effect runs only when mode changes.
   */
  useEffect(() => {
    if (mode !== "driver") {
      router.replace("/(user)/home");
      return;
    }
    const current = dataRef.current;
    const uid = userIdRef.current;
    if (current && uid && Number(current.driver_id) !== Number(uid)) {
      Alert.alert(
        "Access Denied",
        "Only the driver who published this ride can manage it."
      );
      router.replace("/(user)/home");
    }
  }, [mode]);

  const loadActiveRide = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else if (!dataRef.current) setLoading(true);

      const res = await api.get("/api/v1/rides/driver/active");
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
        setError(null);
      } else {
        setData(null);
        setError("No active driver ride found.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not fetch active driver ride.");
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadActiveRide();
    }, [loadActiveRide])
  );

  // Manual GPS location refresh handler
  const handleManualLocationRefresh = async () => {
    try {
      setGpsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Location permission is needed to fetch your GPS coordinates.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coord = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setCurrentGps(coord);

      const current = dataRef.current;
      if (current && current.passengers && current.passengers.length > 0) {
        const activeBooking = current.passengers.find(p => p.status === "STARTED" || p.status === "PICKED_UP");
        if (activeBooking) {
          await api.post(`/api/v1/bookings/${activeBooking.booking_id}/driver-location`, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }).catch(() => { });
        }
      }
      Alert.alert("GPS Location Updated", `Current GPS: ${coord.latitude.toFixed(4)}, ${coord.longitude.toFixed(4)}`);
    } catch {
      Alert.alert("GPS Error", "Could not fetch current GPS location.");
    } finally {
      setGpsLoading(false);
    }
  };

  // Clean up location when ride completes
  useEffect(() => {
    if (data?.status === "completed" || data?.status === "COMPLETED") {
      setCurrentGps(null);
    }
  }, [data?.status]);

  /*
   * Continuous GPS watch while the ride is STARTED.
   * Feeds the 3D navigation camera and vehicle marker with real driver fixes.
   * Watcher is fully cleaned up when ride ends / status changes / unmount.
   */
  const isRideStartedStatus = data?.status === "started" || data?.status === "STARTED";

  useEffect(() => {
    if (!isRideStartedStatus) return;
    let subscription: Location.LocationSubscription | null = null;
    let mounted = true;

    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") return;

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 8,
          },
          (location) => {
            if (!mounted) return;
            const lat = location.coords.latitude;
            const lon = location.coords.longitude;
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
            setCurrentGps({ latitude: lat, longitude: lon });
          }
        );
      } catch (err) {
        console.warn("Driver ride GPS watch error:", err);
      }
    })();

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [isRideStartedStatus]);

  // Check 300-meter rule for passengers
  useEffect(() => {
    let active = true;
    const validatePassengersRoute = async () => {
      if (!data || !data.passengers || data.passengers.length === 0) {
        if (active) setOffRouteWarnings([]);
        return;
      }

      try {
        const start = { latitude: data.pickup_lat, longitude: data.pickup_lon };
        const dest = { latitude: data.dropoff_lat, longitude: data.dropoff_lon };
        const routeRes = await fetchRoadRoute(start, dest);

        if (!active) return;

        const warnings: string[] = [];
        data.passengers.forEach((p, idx) => {
          if (p.pickup_lat && p.pickup_lon && p.status !== "COMPLETED" && p.status !== "CANCELLED") {
            const dist = distanceToRouteMeters({ latitude: p.pickup_lat, longitude: p.pickup_lon }, routeRes.coordinates);
            if (dist > 300) {
              warnings.push(`${p.name || `Passenger ${idx + 1}`}\u2019s pickup point is ${Math.round(dist)}m off your road route (exceeds 300m rule).`);
            }
          }
        });
        setOffRouteWarnings(warnings);
      } catch {
        if (active) setOffRouteWarnings([]);
      }
    };

    void validatePassengersRoute();
    return () => {
      active = false;
    };
  }, [data]);

  const handleCall = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => Alert.alert("Error", "Could not open dialer."));
    } else {
      Alert.alert("Notice", "Passenger phone number not available.");
    }
  };

  const handleChat = (passengerName: string, bookingId: number, passengerId: number, phone?: string) => {
    const current = dataRef.current;
    if (!current) return;
    router.push({
      pathname: "/(user)/message" as any,
      params: {
        chatPartnerName: passengerName,
        rideId: String(current.id),
        receiverId: String(passengerId),
        driverPhone: phone || "",
      },
    });
  };

  const handleStartRide = async () => {
    const current = dataRef.current;
    if (!current) return;
    try {
      setIsStartingRide(true);
      await api.post(`/api/v1/rides/${current.id}/start`);
      Alert.alert("\ud83d\ude80 Ride Started!", "You are now on route. Real-time GPS location active.");
      await loadActiveRide(true);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.detail || "Could not start ride.");
    } finally {
      setIsStartingRide(false);
    }
  };

  const handleRemoveRide = () => {
    const current = dataRef.current;
    if (!current) return;

    Alert.alert("Remove Ride", "Are you sure you want to remove this ride?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            setIsRemovingRide(true);
            await api.delete(`/api/v1/rides/${current.id}`);
            setCurrentGps(null);
            setData(null);
            Alert.alert("Ride Removed", "Your published ride has been removed.");
            router.replace("/(user)/home");
          } catch (err: any) {
            Alert.alert("Error", err?.response?.data?.detail || "Could not remove this ride.");
          } finally {
            setIsRemovingRide(false);
          }
        },
      },
    ]);
  };

  const handleVerifyOtp = async (bookingId: number) => {
    const code = otpInputs[bookingId]?.trim();
    if (!code) {
      Alert.alert("OTP Required", "Please enter the OTP provided by the passenger.");
      return;
    }

    try {
      setVerifyingOtpId(bookingId);
      await api.post(`/api/v1/bookings/${bookingId}/verify-otp`, { otp: code });
      Alert.alert("\u2705 OTP Verified", "Passenger pickup confirmed!");
      setOtpInputs(prev => ({ ...prev, [bookingId]: "" }));
      await loadActiveRide(true);
    } catch (err: any) {
      Alert.alert("OTP Failed", err?.response?.data?.detail || "Invalid OTP code.");
    } finally {
      setVerifyingOtpId(null);
    }
  };

  const handleCompletePassenger = (bookingId: number, passengerName: string) => {
    Alert.alert(
      "Complete Passenger Journey?",
      `Confirm that ${passengerName} has reached their destination.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete Passenger",
          onPress: async () => {
            try {
              setCompletingPassengerId(bookingId);
              await api.post(`/api/v1/bookings/${bookingId}/complete-passenger`);
              Alert.alert("\u2713 Passenger Completed", `${passengerName}\u2019s journey is completed.`);
              await loadActiveRide(true);
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.detail || "Could not complete passenger journey.");
            } finally {
              setCompletingPassengerId(null);
            }
          },
        },
      ]
    );
  };

  const handleCompleteEntireRide = () => {
    const current = dataRef.current;
    if (!current) return;

    const activePassengers = current.passengers?.filter(
      p => p.status === "PICKED_UP" || p.status === "CONFIRMED" || p.status === "ACCEPTED" || p.status === "STARTED"
    );

    let warningMsg = "Are you sure you have reached your destination and completed the entire ride?";
    if (activePassengers && activePassengers.length > 0) {
      warningMsg = `You still have ${activePassengers.length} active passenger(s) on this ride. Are you sure you want to complete the entire ride for everyone?`;
    }

    Alert.alert("Complete Entire Ride?", warningMsg, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Complete Ride",
        onPress: async () => {
          try {
            setIsCompletingRide(true);
            await api.post(`/api/v1/rides/${current.id}/complete`);

            // Clear live GPS location
            setCurrentGps(null);

            Alert.alert("\ud83c\udf89 Ride Completed!", "Your ride has been successfully completed.");
            await loadActiveRide(true);
          } catch (err: any) {
            Alert.alert("Error", err?.response?.data?.detail || "Unable to complete ride.");
          } finally {
            setIsCompletingRide(false);
          }
        },
      },
    ]);
  };

  if (loading && !data) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading driver active ride...</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{`\ud83d\ude97 ${error}`}</Text>
        <Pressable onPress={() => void loadActiveRide(true)} style={styles.retryBtn}>
          <Text style={styles.retryText}>Refresh</Text>
        </Pressable>
      </View>
    );
  }

  const isRideStarted = data?.status === "started" || data?.status === "STARTED";
  const isRideCompleted = data?.status === "completed" || data?.status === "COMPLETED";

  const mappedPassengers: DriverPassengerMarker[] = (data?.passengers || []).map(p => ({
    booking_id: p.booking_id,
    passenger_id: p.passenger_id,
    name: p.name,
    phone: p.phone,
    pickup_location: p.pickup_location,
    latitude: p.pickup_lat,
    longitude: p.pickup_lon,
    status: p.status,
  }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>{`\u2039`}</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Driver Active Ride</Text>
          <Text style={styles.headerSub}>Ride #{data?.id}</Text>
        </View>
        <Pressable onPress={() => void loadActiveRide(true)} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>{refreshing ? "..." : "\ud83d\udd04"}</Text>
        </Pressable>
      </View>

      {/* Driver Map */}
      <DriverRideMap
        driverStart={data ? { name: data.origin, latitude: data.pickup_lat, longitude: data.pickup_lon } : null}
        driverDestination={data ? { name: data.destination, latitude: data.dropoff_lat, longitude: data.dropoff_lon } : null}
        driverCurrentLocation={isRideStarted ? currentGps : null}
        passengers={mappedPassengers}
        rideStarted={isRideStarted}
        vehicleType={data?.vehicle_type}
        height={380}
      />

      {/* Manual GPS Refresh Button */}
      {isRideStarted && (
        <Pressable
          onPress={handleManualLocationRefresh}
          disabled={gpsLoading}
          style={({ pressed }) => [
            styles.manualGpsBtn,
            pressed && styles.btnDisabled,
            gpsLoading && styles.btnDisabled,
          ]}
        >
          {gpsLoading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.manualGpsBtnText}>{`\ud83c\udfaf Refresh My Current Location`}</Text>
          )}
        </Pressable>
      )}

      {/* Off-route Warning Banner */}
      {offRouteWarnings.length > 0 && (
        <View style={styles.warnBanner}>
          {offRouteWarnings.map((w, i) => (
            <Text key={`w-${i}`} style={styles.warnText}>{`\u26a0\ufe0f ${w}`}</Text>
          ))}
        </View>
      )}

      {/* Start Ride Button (before starting) */}
      {!isRideStarted && !isRideCompleted && (
        <View style={styles.rideActionRow}>
          <Pressable
            onPress={handleStartRide}
            disabled={isStartingRide || isRemovingRide}
            style={[styles.startRideBtn, (isStartingRide || isRemovingRide) && styles.btnDisabled]}
          >
            <Text style={styles.startRideBtnText}>
              {isStartingRide ? "Starting Ride..." : "\ud83d\ude80 Start Ride"}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleRemoveRide}
            disabled={isStartingRide || isRemovingRide}
            style={[styles.removeRideBtn, (isStartingRide || isRemovingRide) && styles.btnDisabled]}
          >
            <Text style={styles.removeRideBtnText}>
              {isRemovingRide ? "Removing..." : "Remove Ride"}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Passengers List Section */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>
          BOOKED PASSENGERS ({data?.passengers?.length || 0})
        </Text>

        {data?.passengers && data.passengers.length > 0 ? (
          data.passengers.map((p, idx) => {
            const isPCompleted = p.status === "COMPLETED";
            const isPPickedUp = p.status === "PICKED_UP";
            const isPAccepted = p.status === "ACCEPTED" || p.status === "CONFIRMED";
            const isVerifying = verifyingOtpId === p.booking_id;
            const isCompletingP = completingPassengerId === p.booking_id;

            return (
              <View key={p.booking_id || idx} style={styles.passengerCard}>
                <View style={styles.passengerTop}>
                  <View style={styles.passengerAvatar}>
                    <Text style={styles.avatarLetter}>
                      {(p.name || `P${idx + 1}`).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.passengerName}>
                      {`Passenger ${idx + 1} \u2014 ${p.name || "User"}`}
                    </Text>
                    <Text style={styles.passengerPickup} numberOfLines={1}>
                      {`\ud83d\udccd ${p.pickup_location || "Pickup Location"}`}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, isPCompleted ? styles.badgeCompleted : isPPickedUp ? styles.badgePicked : styles.badgeConfirmed]}>
                    <Text style={[styles.statusBadgeText, isPCompleted ? styles.badgeCompletedText : isPPickedUp ? styles.badgePickedText : styles.badgeConfirmedText]}>
                      {p.status}
                    </Text>
                  </View>
                </View>

                {/* Actions Row (Call & Chat) */}
                <View style={styles.pActionGrid}>
                  <Pressable
                    onPress={() => handleChat(p.name || "Passenger", p.booking_id, p.passenger_id, p.phone)}
                    style={styles.pSmallBtn}
                  >
                    <Text style={styles.pSmallBtnText}>{`\ud83d\udcac Chat`}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleCall(p.phone)}
                    style={styles.pSmallBtn}
                  >
                    <Text style={styles.pSmallBtnText}>{`\ud83d\udcde Call`}</Text>
                  </Pressable>
                </View>

                {/* OTP Verification Box */}
                {isPAccepted && !isPCompleted && (
                  <View style={styles.otpVerifyContainer}>
                    <Text style={styles.otpInputLabel}>ENTER PASSENGER OTP</Text>
                    <View style={styles.otpRow}>
                      <TextInput
                        style={styles.otpInput}
                        value={otpInputs[p.booking_id] || ""}
                        onChangeText={(txt) => setOtpInputs(prev => ({ ...prev, [p.booking_id]: txt }))}
                        placeholder="6-digit OTP"
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                      <Pressable
                        onPress={() => handleVerifyOtp(p.booking_id)}
                        disabled={isVerifying}
                        style={[styles.verifyBtn, isVerifying && styles.btnDisabled]}
                      >
                        <Text style={styles.verifyBtnText}>
                          {isVerifying ? "Verifying..." : "Verify OTP"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* Individual Passenger Complete Button */}
                {isPPickedUp && !isPCompleted && (
                  <Pressable
                    onPress={() => handleCompletePassenger(p.booking_id, p.name || `Passenger ${idx + 1}`)}
                    disabled={isCompletingP}
                    style={[styles.completePassengerBtn, isCompletingP && styles.btnDisabled]}
                  >
                    <Text style={styles.completePassengerBtnText}>
                      {isCompletingP ? "Completing..." : "\u2713 Complete Passenger Journey"}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyPassengersBox}>
            <Text style={styles.emptyPassengersText}>No passengers booked on this route yet.</Text>
          </View>
        )}

        {/* Complete Entire Ride Button */}
        {isRideStarted && (
          <Pressable
            onPress={handleCompleteEntireRide}
            disabled={isCompletingRide}
            style={[styles.completeEntireRideBtn, isCompletingRide && styles.btnDisabled]}
          >
            <Text style={styles.completeEntireRideBtnText}>
              {isCompletingRide ? "Completing Ride..." : "Complete Entire Ride"}
            </Text>
          </Pressable>
        )}

        {/* Completed State */}
        {isRideCompleted && (
          <View style={styles.completedCard}>
            <Text style={styles.completedTitle}>Ride Completed</Text>
            <Text style={styles.completedSub}>All passengers have been dropped off safely.</Text>
          </View>
        )}
      </View>

      {/* Route Details */}
      {data && (
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>ROUTE DETAILS</Text>
          <View style={styles.routeFlow}>
            <View style={styles.routePoint}>
              <View style={[styles.dot, { backgroundColor: Colors.text }]} />
              <Text style={styles.routeAddress} numberOfLines={1}>{data.origin}</Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routePoint}>
              <View style={[styles.dot, { backgroundColor: Colors.green }]} />
              <Text style={styles.routeAddress} numberOfLines={1}>{data.destination}</Text>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>DISTANCE</Text>
              <Text style={styles.metricValue}>{data.distance_km ? `${data.distance_km.toFixed(1)} km` : "--"}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>FARE/SEAT</Text>
              <Text style={styles.metricValue}>{data.price_per_seat ? `Rs ${data.price_per_seat}` : "--"}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>SEATS</Text>
              <Text style={styles.metricValue}>{data.available_seats ?? data.seats_available ?? "--"}</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: Colors.background },
  loadingText: { marginTop: 12, color: Colors.textSecondary, fontWeight: "700" },
  errorText: { color: "#DC2626", fontSize: 14, fontWeight: "800", textAlign: "center", marginBottom: 16 },
  retryBtn: { backgroundColor: Colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  retryText: { color: Colors.white, fontWeight: "800" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0", marginRight: 12 },
  backText: { fontSize: 28, color: Colors.text, lineHeight: 30 },
  headerTitle: { fontSize: 18, fontWeight: "900", color: Colors.text },
  headerSub: { fontSize: 11, color: Colors.textSecondary, fontWeight: "700", marginTop: 2 },
  refreshBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0" },
  refreshText: { fontSize: 14 },
  warnBanner: { backgroundColor: "#FEF3C7", borderRadius: 14, padding: 12, marginTop: 12, borderWidth: 1, borderColor: "#FDE68A", gap: 4 },
  warnText: { fontSize: 11, fontWeight: "700", color: "#B45309" },
  manualGpsBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    elevation: 2,
  },
  manualGpsBtnText: { color: Colors.white, fontSize: 13, fontWeight: "800" },
  rideActionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  startRideBtn: { flex: 1, backgroundColor: Colors.green, borderRadius: 16, paddingVertical: 14, alignItems: "center", justifyContent: "center", elevation: 3 },
  startRideBtnText: { color: Colors.white, fontSize: 15, fontWeight: "900" },
  removeRideBtn: { flex: 1, backgroundColor: "#FEE2E2", borderRadius: 16, paddingVertical: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FECACA" },
  removeRideBtnText: { color: "#DC2626", fontSize: 15, fontWeight: "900" },
  btnDisabled: { opacity: 0.6 },
  card: { backgroundColor: Colors.white, borderRadius: 20, padding: 16, marginTop: 12, borderWidth: 1, borderColor: "#F1F5F9", elevation: 2 },
  sectionHeader: { fontSize: 10, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.5, marginBottom: 10 },
  passengerCard: { backgroundColor: "#F8FAFC", borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#E2E8F0" },
  passengerTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  passengerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#DBEAFE", justifyContent: "center", alignItems: "center" },
  avatarLetter: { fontSize: 16, fontWeight: "900", color: Colors.primaryDark },
  passengerName: { fontSize: 14, fontWeight: "800", color: Colors.text },
  passengerPickup: { fontSize: 11, color: Colors.textSecondary, fontWeight: "600", marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeConfirmed: { backgroundColor: "#FEF3C7" },
  badgeConfirmedText: { color: "#B45309", fontSize: 9, fontWeight: "900" },
  badgePicked: { backgroundColor: "#E0F2FE" },
  badgePickedText: { color: "#0369A1", fontSize: 9, fontWeight: "900" },
  badgeCompleted: { backgroundColor: "#DCFCE7" },
  badgeCompletedText: { color: "#15803D", fontSize: 9, fontWeight: "900" },
  statusBadgeText: { letterSpacing: 0.5 },
  pActionGrid: { flexDirection: "row", gap: 8, marginTop: 10 },
  pSmallBtn: { flex: 1, backgroundColor: Colors.white, paddingVertical: 6, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: "#CBD5E1" },
  pSmallBtnText: { fontSize: 11, fontWeight: "700", color: Colors.text },
  otpVerifyContainer: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  otpInputLabel: { fontSize: 9, fontWeight: "800", color: "#64748B", marginBottom: 4 },
  otpRow: { flexDirection: "row", gap: 8 },
  otpInput: { flex: 1, backgroundColor: Colors.white, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, fontWeight: "800", color: Colors.text },
  verifyBtn: { backgroundColor: Colors.primary, paddingHorizontal: 12, justifyContent: "center", borderRadius: 8 },
  verifyBtnText: { color: Colors.white, fontSize: 12, fontWeight: "800" },
  completePassengerBtn: { backgroundColor: "#DCFCE7", borderWidth: 1, borderColor: "#BBF7D0", borderRadius: 10, paddingVertical: 10, alignItems: "center", marginTop: 10 },
  completePassengerBtnText: { color: "#15803D", fontSize: 12, fontWeight: "800" },
  emptyPassengersBox: { paddingVertical: 16, alignItems: "center" },
  emptyPassengersText: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600" },
  routeFlow: { marginVertical: 4 },
  routePoint: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  routeAddress: { flex: 1, fontSize: 13, fontWeight: "700", color: Colors.text },
  routeLine: { width: 2, height: 12, backgroundColor: "#E2E8F0", marginLeft: 4, marginVertical: 3 },
  metricsGrid: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F8FAFC" },
  metricItem: { flex: 1, alignItems: "center" },
  metricLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: "700" },
  metricValue: { fontSize: 15, fontWeight: "900", color: Colors.text, marginTop: 2 },
  metricDivider: { width: 1, height: 24, backgroundColor: "#F1F5F9" },
  completeEntireRideBtn: { backgroundColor: "#DC2626", borderRadius: 16, paddingVertical: 14, alignItems: "center", justifyContent: "center", marginTop: 14, elevation: 3 },
  completeEntireRideBtnText: { color: Colors.white, fontSize: 15, fontWeight: "900" },
  completedCard: { backgroundColor: "#DCFCE7", borderRadius: 18, padding: 20, alignItems: "center", marginTop: 14, borderWidth: 1, borderColor: "#BBF7D0" },
  completedTitle: { fontSize: 18, fontWeight: "900", color: "#15803D" },
  completedSub: { fontSize: 12, color: "#166534", marginTop: 4, fontWeight: "600" },
});
