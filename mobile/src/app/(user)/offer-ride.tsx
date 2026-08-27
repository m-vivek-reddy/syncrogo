import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import DateTimePicker from "@react-native-community/datetimepicker";
import api from "../../api/client";
import { Colors } from "../../constants/colors";
import LocationPickerMap from "../../components/LocationPickerMap";
import {
  reverseGeocode,
  searchPlaces,
  type PlaceResult,
} from "../../services/geocoding";
import { fetchRoadRoute, type Coordinate } from "../../services/routing";

/*
 * Formats the selected departure date for display.
 */
function formatDepartureLabel(date: Date): string {
  return date.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function OfferRideScreen() {
  const [pickup, setPickup] = useState<Coordinate | null>(null);
  const [destination, setDestination] = useState<Coordinate | null>(null);
  const [selectionMode, setSelectionMode] = useState<"pickup" | "destination">("pickup");

  const [pickupText, setPickupText] = useState("");
  const [destinationText, setDestinationText] = useState("");

  // Autocomplete suggestions state
  const [pickupSuggestions, setPickupSuggestions] = useState<PlaceResult[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<PlaceResult[]>([]);
  const [searchingPickup, setSearchingPickup] = useState(false);
  const [searchingDest, setSearchingDest] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<"pickup" | "destination" | null>(null);

  const debounceTimerRef = useRef<any>(null);

  const [vehicleType, setVehicleType] = useState<"car" | "bike">("car");
  const [seats, setSeats] = useState(3);

  /*
   * Departure scheduling: "now" publishes an immediate ride;
   * "scheduled" lets the driver pick a future departure date & time.
   */
  const [scheduleMode, setScheduleMode] = useState<"now" | "scheduled">("now");
  const minDepartureDate = useMemo(() => new Date(), []);
  const defaultDepartureDate = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    return d;
  }, []);
  const [departureDate, setDepartureDate] = useState<Date>(defaultDepartureDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [fare, setFare] = useState("");
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  // Driver documents verification state
  const [docsPending, setDocsPending] = useState(false);
  const [docsChecked, setDocsChecked] = useState(false);
  const [docsPendingMessage, setDocsPendingMessage] = useState<string | null>(null);
  const [docsChecking, setDocsChecking] = useState(false);

  /*
   * Fetch current high-accuracy location
   */
  const handleUseCurrentLocation = async () => {
    setGpsLoading(true);
    setActiveDropdown(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Location permission is needed to use your current location."
        );
        setGpsLoading(false);
        return;
      }

      if (Platform.OS === "android") {
        try {
          const provider = await Location.getProviderStatusAsync();
          if (!provider.locationServicesEnabled) {
            await Location.enableNetworkProviderAsync().catch(() => {});
          }
        } catch {}
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        mayShowUserSettingsDialog: true,
      });

      const accuracy = loc.coords.accuracy ?? null;
      setGpsAccuracy(accuracy);

      const rawLat = loc.coords.latitude;
      const rawLon = loc.coords.longitude;

      const coord: Coordinate = { latitude: rawLat, longitude: rawLon };
      setPickup(coord);
      setSelectionMode("destination");

      const address = await reverseGeocode(rawLat, rawLon);
      setPickupText(address || "Current Location");
    } catch {
      Alert.alert(
        "GPS Error",
        "Could not fetch current high-accuracy GPS location."
      );
    } finally {
      setGpsLoading(false);
    }
  };

  /*
   * Fetch driver vehicle profile if registered
   */
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/vehicles/me");
        if (res.data) {
          const cap = res.data.capacity;
          if (cap) {
            setSeats(Math.min(6, Math.max(1, cap - 1)));
          }
        }
      } catch {}
    })();
  }, []);

  /*
   * Verify driver documents status (block offer if documents are pending)
   */
  const checkDriverDocuments = useCallback(async () => {
    try {
      const res = await api.get("/api/v1/documents/");
      const docs: Array<{ document_type: string; status: string }> =
        res.data?.documents || (Array.isArray(res.data) ? res.data : []);

      const pendingDocs = docs.filter(
        (d) => (d.status || "").toLowerCase() === "pending"
      );
      if (pendingDocs.length > 0) {
        setDocsPending(true);
        setDocsPendingMessage(
          "Your driver documents are currently pending verification. You cannot offer a ride until your documents are approved by the administrator."
        );
      } else if (docs.length === 0) {
        setDocsPending(true);
        setDocsPendingMessage(
          "You must upload and verify your driver documents before offering a ride."
        );
      } else {
        const hasApproved = docs.some((d) =>
          ["approved", "verified"].includes((d.status || "").toLowerCase())
        );
        if (!hasApproved) {
          setDocsPending(true);
          setDocsPendingMessage(
            "Your driver documents have not been approved yet. You cannot offer a ride until your documents are verified."
          );
        } else {
          setDocsPending(false);
          setDocsPendingMessage(null);
        }
      }
    } catch {
      // If network fails, do not aggressively block local testing
    } finally {
      setDocsChecked(true);
    }
  }, []);

  useEffect(() => {
    void checkDriverDocuments();
  }, [checkDriverDocuments]);

  /*
   * Auto-fetch live location on mount
   */
  useEffect(() => {
    void handleUseCurrentLocation();
  }, []);

  /*
   * Handle text input with live autocomplete for Pickup
   */
  const handlePickupTextChange = (text: string) => {
    setPickupText(text);
    setActiveDropdown("pickup");

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (text.trim().length < 2) {
      setPickupSuggestions([]);
      setSearchingPickup(false);
      return;
    }

    setSearchingPickup(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(text);
        setPickupSuggestions(results);
      } catch {
        setPickupSuggestions([]);
      } finally {
        setSearchingPickup(false);
      }
    }, 320);
  };

  /*
   * Handle text input with live autocomplete for Destination
   */
  const handleDestinationTextChange = (text: string) => {
    setDestinationText(text);
    setActiveDropdown("destination");

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (text.trim().length < 2) {
      setDestSuggestions([]);
      setSearchingDest(false);
      return;
    }

    setSearchingDest(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(text);
        setDestSuggestions(results);
      } catch {
        setDestSuggestions([]);
      } finally {
        setSearchingDest(false);
      }
    }, 320);
  };

  /*
   * User selects a place suggestion for pickup
   */
  const handleSelectPickupSuggestion = (place: PlaceResult) => {
    Keyboard.dismiss();
    const coord: Coordinate = {
      latitude: place.latitude,
      longitude: place.longitude,
    };
    setPickup(coord);
    const label = place.subtitle
      ? `${place.displayName}, ${place.subtitle}`
      : place.displayName;
    setPickupText(label);
    setPickupSuggestions([]);
    setActiveDropdown(null);
    setSelectionMode("destination");
  };

  /*
   * User selects a place suggestion for destination
   */
  const handleSelectDestSuggestion = (place: PlaceResult) => {
    Keyboard.dismiss();
    const coord: Coordinate = {
      latitude: place.latitude,
      longitude: place.longitude,
    };
    setDestination(coord);
    const label = place.subtitle
      ? `${place.displayName}, ${place.subtitle}`
      : place.displayName;
    setDestinationText(label);
    setDestSuggestions([]);
    setActiveDropdown(null);
  };

  /*
   * Suggested total trip cost.
   */
  const estimatedTripCost = useMemo(() => {
    if (!distanceKm) return 0;
    const ratePerKm = vehicleType === "car" ? 10 : 5;
    return Math.round(distanceKm * ratePerKm);
  }, [distanceKm, vehicleType]);

  /*
   * Suggested passenger contribution.
   */
  const suggestedFare =
    estimatedTripCost > 0 ? Math.ceil(estimatedTripCost / seats) : 0;

  /*
   * When pickup changes from map tap
   */
  const handlePickupChange = async (coordinate: Coordinate) => {
    setPickup(coordinate);
    setSelectionMode("destination");
    setActiveDropdown(null);
    try {
      const address = await reverseGeocode(coordinate.latitude, coordinate.longitude);
      setPickupText(address || `${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}`);
    } catch {}
  };

  /*
   * When destination changes from map tap
   */
  const handleDestinationChange = async (coordinate: Coordinate) => {
    setDestination(coordinate);
    setActiveDropdown(null);
    try {
      const address = await reverseGeocode(coordinate.latitude, coordinate.longitude);
      setDestinationText(address || `${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}`);
    } catch {}
  };

  const lastDistanceRef = useRef<number | null>(null);
  const lastFareRef = useRef<string>("");

  /*
   * Route information from map & backend pricing calculation
   */
  const handleRouteChange = useCallback(
    async (
      distance: number,
      duration: number,
      coordinates: Coordinate[]
    ) => {
      // Round distance to 1 decimal place to eliminate floating-point micro-jitter
      const roundedDist = Math.round(distance * 10) / 10;
      if (lastDistanceRef.current === roundedDist && lastFareRef.current !== "") {
        return;
      }

      lastDistanceRef.current = roundedDist;
      setDistanceKm(roundedDist);
      setDurationMinutes(duration);
      setRouteCoordinates(coordinates);

      const rideType = vehicleType === "car" ? "carpool" : "bike";
      const ratePerKm = vehicleType === "car" ? 10 : 5;
      const localTotal = Math.round(roundedDist * ratePerKm);
      const localPerPassenger = Math.ceil(localTotal / seats);

      const fareStr = String(localPerPassenger);
      lastFareRef.current = fareStr;
      setFare(fareStr);

      try {
        const res = await api.post("/pricing/calculate", {
          distance_km: roundedDist,
          duration_minutes: duration,
          ride_type: rideType,
        });

        if (res.data && res.data.total_fare) {
          const perSeat = Math.ceil(res.data.total_fare / seats);
          const backendFareStr = String(perSeat);
          lastFareRef.current = backendFareStr;
          setFare(backendFareStr);
        }
      } catch {
        // Keep local fare calculation if pricing endpoint is unreachable
      }
    },
    [vehicleType, seats]
  );

  /*
   * Change vehicle and recalculate fare
   */
  const changeVehicle = async (type: "car" | "bike") => {
    setVehicleType(type);
    const newSeats = type === "bike" ? 1 : Math.max(1, seats);
    setSeats(newSeats);

    // Force route recalculation: bike routes must avoid motorways (ORR),
    // car routes may use them. Reset the dedupe refs so the map
    // recalculates with the new vehicle profile.
    lastDistanceRef.current = null;
    lastFareRef.current = "";

    if (pickup && destination) {
      try {
        const result = await fetchRoadRoute(pickup, destination, type);
        setDistanceKm(result.distanceKm);
        setDurationMinutes(result.durationMinutes);
        setRouteCoordinates(result.coordinates);

        const rideType = type === "car" ? "carpool" : "bike";
        const ratePerKm = type === "car" ? 10 : 5;
        const localTotal = Math.round(result.distanceKm * ratePerKm);
        setFare(String(Math.ceil(localTotal / newSeats)));

        const res = await api.post("/pricing/calculate", {
          distance_km: result.distanceKm,
          duration_minutes: result.durationMinutes,
          ride_type: rideType,
        });
        if (res.data && res.data.total_fare) {
          setFare(String(Math.ceil(res.data.total_fare / newSeats)));
        }
      } catch {
        // Fall back to existing distance/fare values if routing fails.
        if (distanceKm) {
          const rideType = type === "car" ? "carpool" : "bike";
          const ratePerKm = type === "car" ? 10 : 5;
          const localTotal = Math.round(distanceKm * ratePerKm);
          setFare(String(Math.ceil(localTotal / newSeats)));
        }
      }
      return;
    }

    if (distanceKm) {
      const rideType = type === "car" ? "carpool" : "bike";
      const ratePerKm = type === "car" ? 10 : 5;
      const localTotal = Math.round(distanceKm * ratePerKm);
      setFare(String(Math.ceil(localTotal / newSeats)));

      try {
        const res = await api.post("/pricing/calculate", {
          distance_km: distanceKm,
          duration_minutes: durationMinutes || Math.round((distanceKm / 35) * 60),
          ride_type: rideType,
        });
        if (res.data && res.data.total_fare) {
          setFare(String(Math.ceil(res.data.total_fare / newSeats)));
        }
      } catch {}
    }
  };

  /*
   * Change seats.
   */
  const changeSeats = (value: number) => {
    const maxLimit = vehicleType === "bike" ? 1 : 6;
    const newSeats = Math.max(1, Math.min(maxLimit, value));
    setSeats(newSeats);
    if (estimatedTripCost > 0) {
      setFare(String(Math.ceil(estimatedTripCost / newSeats)));
    }
  };

  /*
   * Fare validation rule
   */
  const currentFareNum = Number(fare) || 0;
  const maxAllowedFare = suggestedFare > 0 ? Math.ceil(suggestedFare * 1.15) : 0;
  const isFareExceeded = maxAllowedFare > 0 && currentFareNum > maxAllowedFare;
  const handlePublish = async () => {
    // Re-verify document status with the backend at submit time
    setDocsChecking(true);
    let submitBlocked = docsPending;
    let submitBlockMessage = docsPendingMessage;
    try {
      const res = await api.get("/api/v1/documents/");
      const docs: Array<{ document_type: string; status: string }> =
        res.data?.documents || (Array.isArray(res.data) ? res.data : []);
      const pendingDocs = docs.filter(
        (d) => (d.status || "").toLowerCase() === "pending"
      );
      const hasApproved = docs.some((d) =>
        ["approved", "verified"].includes((d.status || "").toLowerCase())
      );
      if (pendingDocs.length > 0) {
        submitBlocked = true;
        submitBlockMessage =
          "Your driver documents are currently pending verification. You cannot offer a ride until your documents are approved by the administrator.";
      } else if (docs.length === 0 || !hasApproved) {
        submitBlocked = true;
        submitBlockMessage = docs.length === 0
          ? "You must upload and verify your driver documents before offering a ride."
          : "Your driver documents have not been approved yet. You cannot offer a ride until your documents are verified.";
      } else {
        submitBlocked = false;
        submitBlockMessage = null;
      }
      setDocsPending(submitBlocked);
      setDocsPendingMessage(submitBlockMessage);
    } catch {
      // If we cannot confirm approval from the backend, block submission to be safe
      submitBlocked = true;
      submitBlockMessage =
        "We could not verify your document status. Please try again.";
    } finally {
      setDocsChecking(false);
    }

    if (submitBlocked) {
      Alert.alert(
        "Documents Pending Verification",
        submitBlockMessage ||
          "Your driver documents are currently pending verification. You cannot offer rides until they are approved.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "View Documents",
            onPress: () => router.push("/(user)/documents" as any),
          },
        ]
      );
      return;
    }

    if (!pickup) {
      Alert.alert("Pickup Required", "Please select your pickup location on the map or search for it.");
      return;
    }

    if (!destination) {
      Alert.alert("Destination Required", "Please search for or select your destination on the map.");
      return;
    }

    if (!distanceKm || distanceKm <= 0) {
      Alert.alert("Route Required", "Please wait for the road route to finish calculating.");
      return;
    }

    /*
     * Departure schedule validation.
     * Scheduled rides must be in the future (at least 5 minutes ahead)
     * and no more than 30 days out.
     */
    let departureTimeIso: string | null = null;
    if (scheduleMode === "scheduled") {
      const now = new Date();
      if (!departureDate || Number.isNaN(departureDate.getTime())) {
        Alert.alert("Departure Time Required", "Please pick a valid departure date and time.");
        return;
      }
      if (departureDate.getTime() < now.getTime() + 5 * 60 * 1000) {
        Alert.alert(
          "Invalid Departure Time",
          "Scheduled departure must be at least 5 minutes in the future. Choose \"Leave Now\" for an immediate ride."
        );
        return;
      }
      if (departureDate.getTime() > now.getTime() + 30 * 24 * 60 * 60 * 1000) {
        Alert.alert("Departure Too Far Ahead", "Rides can be scheduled at most 30 days in advance.");
        return;
      }
      departureTimeIso = departureDate.toISOString();
    }

    const finalFare = Number(fare);
    if (!finalFare || finalFare <= 0) {
      Alert.alert("Fare Required", "Please enter a valid passenger contribution fare.");
      return;
    }

    const maxAllowedFare = suggestedFare > 0 ? Math.ceil(suggestedFare * 1.15) : 0;
    if (maxAllowedFare > 0 && finalFare > maxAllowedFare) {
      Alert.alert(
        "Fare Limit Exceeded",
        `Fare cannot exceed 15% above the recommended fare (Maximum allowed: ₹${maxAllowedFare}).`
      );
      return;
    }

    setLoading(true);
    try {
      const payload = {
        pickup_location: pickupText.trim() || "Pickup Location",
        pickup_lat: pickup.latitude,
        pickup_lon: pickup.longitude,
        dropoff_location: destinationText.trim() || "Destination",
        dropoff_lat: destination.latitude,
        dropoff_lon: destination.longitude,
        distance_km: distanceKm,
        vehicle_type: vehicleType,
        available_seats: seats,
        gender_preference: "any_gender",
        discount: 0,
        // Backend stores a scheduled departure; immediate rides use "now".
        departure_time: departureTimeIso ?? new Date().toISOString(),
      };

      const res = await api.post("/api/v1/rides/offer", payload);
      const rideId = res.data?.ride_id ?? "";

      Alert.alert(
        "🎉 Ride Offer Published!",
        `Your ride offer #${rideId} (${distanceKm} km, ₹${finalFare}/seat) is now live in SyncroGo! Passengers can now discover and book seats.`,
        [
          {
            text: "View Dashboard",
            onPress: () => router.replace("/(user)/home" as any),
          },
        ]
      );
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || "Failed to publish ride offer.";
      Alert.alert("Publish Failed", detail);
    } finally {
      setLoading(false);
    }
  };

  const quickLandmarks = [
    { name: "Hitech City", lat: 17.4435, lon: 78.3772 },
    { name: "Gachibowli", lat: 17.4401, lon: 78.3489 },
    { name: "Cyber Towers", lat: 17.4504, lon: 78.3808 },
    { name: "RGIA Airport", lat: 17.2403, lon: 78.4294 },
    { name: "Secunderabad", lat: 17.4399, lon: 78.4983 },
    { name: "Koramangala", lat: 12.9352, lon: 77.6245 },
    { name: "Indiranagar", lat: 12.9784, lon: 77.6408 },
    { name: "BKC Mumbai", lat: 19.0674, lon: 72.8687 },
    { name: "Connaught Place", lat: 28.6315, lon: 77.2167 },
  ];

  const handleLandmarkSelect = (item: { name: string; lat: number; lon: number }) => {
    const coord: Coordinate = { latitude: item.lat, longitude: item.lon };
    if (selectionMode === "pickup") {
      setPickup(coord);
      setPickupText(`${item.name}`);
      setSelectionMode("destination");
    } else {
      setDestination(coord);
      setDestinationText(`${item.name}`);
    }
    setActiveDropdown(null);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityLabel="Go back"
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>

          <View>
            <Text style={styles.title}>Offer a Ride</Text>
            <Text style={styles.subtitle}>Share your vehicle, split fuel costs</Text>
          </View>
        </View>

        {/* Quick Landmarks & Hubs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.cityScroll}
          contentContainerStyle={styles.cityScrollContent}
        >
          {quickLandmarks.map((landmark) => (
            <Pressable
              key={landmark.name}
              onPress={() => handleLandmarkSelect(landmark)}
              style={styles.cityChip}
            >
              <Text style={styles.cityChipText}>📍 {landmark.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* JOURNEY INPUTS CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Route & Locations</Text>
            {gpsAccuracy !== null && (
              <View style={styles.accuracyBadge}>
                <Text style={styles.accuracyText}>
                  GPS: ±{Math.round(gpsAccuracy)}m
                </Text>
              </View>
            )}
          </View>

          {/* Quick Use Current Location Button */}
          <Pressable
            onPress={handleUseCurrentLocation}
            disabled={gpsLoading}
            style={({ pressed }) => [
              styles.useLocationBtn,
              pressed && styles.useLocationBtnPressed,
            ]}
          >
            {gpsLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.useLocationIcon}>🎯</Text>
            )}
            <Text style={styles.useLocationText}>
              {gpsLoading
                ? "Locating satellite GPS..."
                : "Use My Exact Current Location"}
            </Text>
          </Pressable>

          {/* Mode Switcher Tabs */}
          <View style={styles.modeTabsRow}>
            <Pressable
              onPress={() => {
                setSelectionMode("pickup");
                setActiveDropdown("pickup");
              }}
              style={[
                styles.modeTab,
                selectionMode === "pickup" && styles.modeTabActivePickup,
              ]}
            >
              <Text
                style={[
                  styles.modeTabText,
                  selectionMode === "pickup" && styles.modeTabTextActive,
                ]}
              >
                📍 1. Pickup Point
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setSelectionMode("destination");
                setActiveDropdown("destination");
              }}
              style={[
                styles.modeTab,
                selectionMode === "destination" && styles.modeTabActiveDest,
              ]}
            >
              <Text
                style={[
                  styles.modeTabText,
                  selectionMode === "destination" && styles.modeTabTextActive,
                ]}
              >
                🏁 2. Destination
              </Text>
            </Pressable>
          </View>

          {/* PICKUP INPUT */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>PICKUP LOCATION</Text>
            <View
              style={[
                styles.inputBox,
                selectionMode === "pickup" && styles.activeInputBoxPickup,
              ]}
            >
              <Text style={styles.inputIcon}>📍</Text>
              <TextInput
                value={pickupText}
                onChangeText={handlePickupTextChange}
                onFocus={() => {
                  setSelectionMode("pickup");
                  setActiveDropdown("pickup");
                }}
                placeholder="Search pickup address or landmark"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />
              {searchingPickup && (
                <ActivityIndicator size="small" color={Colors.primary} />
              )}
              {pickupText.length > 0 && !searchingPickup && (
                <Pressable
                  onPress={() => {
                    setPickupText("");
                    setPickup(null);
                    setPickupSuggestions([]);
                  }}
                  style={styles.clearBtn}
                >
                  <Text style={styles.clearBtnText}>✕</Text>
                </Pressable>
              )}
            </View>

            {/* Pickup Suggestions Dropdown */}
            {activeDropdown === "pickup" && pickupSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {pickupSuggestions.map((place, index) => (
                  <Pressable
                    key={`p-${index}-${place.latitude}-${place.longitude}`}
                    onPress={() => handleSelectPickupSuggestion(place)}
                    style={styles.suggestionItem}
                  >
                    <Text style={styles.suggestionIcon}>📍</Text>
                    <View style={styles.suggestionTextContainer}>
                      <Text style={styles.suggestionTitle} numberOfLines={1}>
                        {place.displayName}
                      </Text>
                      {place.subtitle ? (
                        <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                          {place.subtitle}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* DESTINATION INPUT */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>DESTINATION</Text>
            <View
              style={[
                styles.inputBox,
                selectionMode === "destination" && styles.activeInputBoxDest,
              ]}
            >
              <Text style={styles.inputIcon}>🏁</Text>
              <TextInput
                value={destinationText}
                onChangeText={handleDestinationTextChange}
                onFocus={() => {
                  setSelectionMode("destination");
                  setActiveDropdown("destination");
                }}
                placeholder="Search destination address or landmark"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />
              {searchingDest && (
                <ActivityIndicator size="small" color={Colors.green} />
              )}
              {destinationText.length > 0 && !searchingDest && (
                <Pressable
                  onPress={() => {
                    setDestinationText("");
                    setDestination(null);
                    setDestSuggestions([]);
                  }}
                  style={styles.clearBtn}
                >
                  <Text style={styles.clearBtnText}>✕</Text>
                </Pressable>
              )}
            </View>

            {/* Destination Suggestions Dropdown */}
            {activeDropdown === "destination" && destSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {destSuggestions.map((place, index) => (
                  <Pressable
                    key={`d-${index}-${place.latitude}-${place.longitude}`}
                    onPress={() => handleSelectDestSuggestion(place)}
                    style={styles.suggestionItem}
                  >
                    <Text style={styles.suggestionIcon}>🏁</Text>
                    <View style={styles.suggestionTextContainer}>
                      <Text style={styles.suggestionTitle} numberOfLines={1}>
                        {place.displayName}
                      </Text>
                      {place.subtitle ? (
                        <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                          {place.subtitle}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* MAP */}
        <View style={styles.mapCard}>
          <LocationPickerMap
            pickup={pickup}
            destination={destination}
            selectionMode={selectionMode}
            vehicleType={vehicleType}
            onPickupChange={handlePickupChange}
            onDestinationChange={handleDestinationChange}
            onRouteChange={handleRouteChange}
          />
        </View>

        {/* ROUTE SUMMARY */}
        {distanceKm !== null && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{distanceKm} km</Text>
              <Text style={styles.summaryLabel}>Road Distance</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{durationMinutes} min</Text>
              <Text style={styles.summaryLabel}>Estimated ETA</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryStat}>
              <Text style={[styles.summaryValue, { color: Colors.greenDark }]}>
                ₹{estimatedTripCost}
              </Text>
              <Text style={styles.summaryLabel}>Est. Fuel Cost</Text>
            </View>
          </View>
        )}

        {/* VEHICLE TYPE */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Select Vehicle</Text>
          <View style={styles.vehicleRow}>
            <Pressable
              onPress={() => changeVehicle("car")}
              style={[
                styles.vehicleButton,
                vehicleType === "car" && styles.vehicleSelectedCar,
              ]}
            >
              <Text style={styles.vehicleEmoji}>🚗</Text>
              <Text
                style={[
                  styles.vehicleText,
                  vehicleType === "car" && styles.vehicleTextSelectedCar,
                ]}
              >
                Car (₹10/km)
              </Text>
            </Pressable>

            <Pressable
              onPress={() => changeVehicle("bike")}
              style={[
                styles.vehicleButton,
                vehicleType === "bike" && styles.vehicleSelectedBike,
              ]}
            >
              <Text style={styles.vehicleEmoji}>🏍️</Text>
              <Text
                style={[
                  styles.vehicleText,
                  vehicleType === "bike" && styles.vehicleTextSelectedBike,
                ]}
              >
                Bike (₹5/km)
              </Text>
            </Pressable>
          </View>
        </View>

        {/* AVAILABLE SEATS */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Available Passenger Seats</Text>
            <Text style={styles.seatCapacityNote}>
              {vehicleType === "bike" ? "1 seat max" : "1–6 seats"}
            </Text>
          </View>

          <View style={styles.seatRow}>
            <Pressable
              onPress={() => changeSeats(seats - 1)}
              style={styles.counterButton}
              disabled={vehicleType === "bike" || seats <= 1}
            >
              <Text style={styles.counterText}>−</Text>
            </Pressable>

            <View style={styles.seatValueBox}>
              <Text style={styles.seatValue}>{seats}</Text>
              <Text style={styles.seatLabel}>
                {seats === 1 ? "seat" : "seats"} available
              </Text>
            </View>

            <Pressable
              onPress={() => changeSeats(seats + 1)}
              style={styles.counterButton}
              disabled={vehicleType === "bike" || seats >= 6}
            >
              <Text style={styles.counterText}>+</Text>
            </Pressable>
          </View>
        </View>

        {/* DEPARTURE SCHEDULE */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Departure Time</Text>
          <View style={styles.scheduleRow}>
            <Pressable
              onPress={() => setScheduleMode("now")}
              style={[
                styles.scheduleOption,
                scheduleMode === "now" && styles.scheduleOptionActive,
              ]}
            >
              <Text style={styles.scheduleEmoji}>⚡</Text>
              <Text
                style={[
                  styles.scheduleText,
                  scheduleMode === "now" && styles.scheduleTextActive,
                ]}
              >
                Leave Now
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setScheduleMode("scheduled");
                setShowDatePicker(true);
              }}
              style={[
                styles.scheduleOption,
                scheduleMode === "scheduled" && styles.scheduleOptionActive,
              ]}
            >
              <Text style={styles.scheduleEmoji}>🗓️</Text>
              <Text
                style={[
                  styles.scheduleText,
                  scheduleMode === "scheduled" && styles.scheduleTextActive,
                ]}
              >
                Schedule
              </Text>
            </Pressable>
          </View>

          {scheduleMode === "scheduled" && (
            <View style={styles.scheduleSummaryBox}>
              <Pressable onPress={() => setShowDatePicker(true)}>
                <Text style={styles.scheduleValueText}>
                  🕒 {formatDepartureLabel(departureDate)}
                </Text>
                <Text style={styles.scheduleHint}>Tap to change date & time</Text>
              </Pressable>
            </View>
          )}
        </View>

        {showDatePicker && (
          <View style={[styles.card, styles.datePickerCard]}>
            <View style={styles.datePickerHeaderRow}>
              <Text style={styles.sectionTitle}>Pick Departure Date & Time</Text>
              <Pressable onPress={() => setShowDatePicker(false)} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>✕</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={departureDate}
              mode="datetime"
              is24Hour={false}
              minimumDate={minDepartureDate}
              onChange={(event, selected) => {
                if (Platform.OS === "android") {
                  // Android fires once per pick; dismiss on cancel/neutral.
                  if (event.type !== "set") {
                    setShowDatePicker(false);
                    return;
                  }
                  setShowDatePicker(false);
                }
                if (selected) {
                  setDepartureDate(selected);
                }
              }}
            />
          </View>
        )}

        {/* FARE PER PASSENGER */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Passenger Contribution Fare</Text>
          <Text style={styles.fareHelper}>
            Shared travel cost per seat
          </Text>

          <View style={[styles.fareInputRow, isFareExceeded && styles.fareInputRowExceeded]}>
            <Text style={[styles.rupee, isFareExceeded && styles.rupeeExceeded]}>₹</Text>
            <TextInput
              value={fare}
              onChangeText={setFare}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#94A3B8"
              style={[styles.fareInput, isFareExceeded && styles.fareInputExceededText]}
            />
          </View>

          {isFareExceeded && (
            <View style={styles.fareErrorBox}>
              <Text style={styles.fareErrorText}>
                ⚠️ Fare ₹{currentFareNum} exceeds maximum allowed limit of ₹{maxAllowedFare}. Please lower the price.
              </Text>
            </View>
          )}

          {suggestedFare > 0 && (
            <Pressable
              onPress={() => setFare(String(suggestedFare))}
              style={styles.suggestionPill}
            >
              <Text style={styles.suggestion}>
                💡 Recommended fare: ₹{suggestedFare}/seat (Max allowed +15%: ₹{maxAllowedFare})
              </Text>
            </Pressable>
          )}
        </View>

        {/* PENDING DOCUMENTS WARNING CARD */}
        {docsPending && (
          <Pressable
            onPress={() => router.push("/(user)/documents" as any)}
            style={styles.pendingDocsCard}
          >
            <View style={styles.pendingDocsHeader}>
              <Text style={styles.pendingDocsIcon}>⏳</Text>
              <Text style={styles.pendingDocsTitle}>Documents Pending Verification</Text>
            </View>
            <Text style={styles.pendingDocsText}>
              {docsPendingMessage ||
                "Your driver documents are currently pending verification. You cannot offer rides until they are approved."}
            </Text>
            <Text style={styles.pendingDocsAction}>View / Upload Documents ›</Text>
          </Pressable>
        )}

        {/* PUBLISH BUTTON (BLOCKED IF DOCUMENTS PENDING OR FARE EXCEEDS LIMIT) */}
        {docsPending ? (
          <Pressable
            onPress={() => {
              Alert.alert(
                "Documents Pending Verification",
                docsPendingMessage ||
                  "Your driver documents are currently pending verification. You cannot offer rides until they are approved.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "View Documents",
                    onPress: () => router.push("/(user)/documents" as any),
                  },
                ]
              );
            }}
            style={styles.docsPendingBanner}
          >
            <Text style={styles.docsPendingBannerText}>
              ⏳ Cannot Offer Ride: Documents Pending Verification
            </Text>
          </Pressable>
        ) : !isFareExceeded ? (
          <Pressable
            onPress={handlePublish}
            disabled={loading || docsChecking}
            style={({ pressed }) => [
              styles.publishButton,
              pressed && styles.publishPressed,
              (loading || docsChecking) && styles.publishDisabled,
            ]}
          >
            {loading || docsChecking ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.publishText}>🚀 Publish Ride Offer</Text>
            )}
          </Pressable>
        ) : (
          <View style={styles.fareExceededBanner}>
            <Text style={styles.fareExceededBannerText}>
              ⛔ Cannot Publish: Price exceeds maximum limit of ₹{maxAllowedFare}/seat
            </Text>
          </View>
        )}

        <Text style={styles.footerText}>
          SyncroGo facilitates non-commercial carpooling and fuel-cost sharing in accordance with local regulations.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backText: {
    fontSize: 28,
    lineHeight: 32,
    color: "#1E3A8A",
    fontWeight: "700",
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 1,
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  cityScroll: {
    marginBottom: 14,
  },
  cityScrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  cityChip: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  cityChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E40AF",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  accuracyBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  accuracyText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#166534",
  },
  useLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  useLocationBtnPressed: {
    backgroundColor: "#DBEAFE",
    transform: [{ scale: 0.98 }],
  },
  useLocationIcon: {
    fontSize: 16,
  },
  useLocationText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  modeTabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
  },
  modeTabActivePickup: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
  },
  modeTabActiveDest: {
    backgroundColor: "#DCFCE7",
    borderColor: "#16A34A",
  },
  modeTabText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  modeTabTextActive: {
    color: "#0F172A",
    fontWeight: "800",
  },
  inputWrapper: {
    marginBottom: 12,
    position: "relative",
    zIndex: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    gap: 8,
  },
  activeInputBoxPickup: {
    borderColor: "#2563EB",
    backgroundColor: "#FFFFFF",
  },
  activeInputBoxDest: {
    borderColor: "#16A34A",
    backgroundColor: "#FFFFFF",
  },
  inputIcon: {
    fontSize: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "700",
  },
  suggestionsContainer: {
    marginTop: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 20,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 10,
  },
  suggestionIcon: {
    fontSize: 15,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  suggestionSubtitle: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  mapCard: {
    marginBottom: 14,
    borderRadius: 20,
    overflow: "hidden",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  summaryStat: {
    alignItems: "center",
    flex: 1,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1E3A8A",
  },
  summaryLabel: {
    marginTop: 3,
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E2E8F0",
  },
  vehicleRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  vehicleButton: {
    flex: 1,
    height: 72,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  vehicleSelectedCar: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  vehicleSelectedBike: {
    borderColor: "#16A34A",
    backgroundColor: "#F0FDF4",
  },
  vehicleEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  vehicleText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
  },
  vehicleTextSelectedCar: {
    color: "#2563EB",
  },
  vehicleTextSelectedBike: {
    color: "#16A34A",
  },
  seatCapacityNote: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  seatRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    marginVertical: 4,
  },
  counterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    justifyContent: "center",
    alignItems: "center",
  },
  counterText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2563EB",
  },
  seatValueBox: {
    alignItems: "center",
    minWidth: 90,
  },
  scheduleRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  scheduleOption: {
    flex: 1,
    height: 64,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  scheduleOptionActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  scheduleEmoji: {
    fontSize: 18,
    marginBottom: 3,
  },
  scheduleText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
  },
  scheduleTextActive: {
    color: "#2563EB",
  },
  scheduleSummaryBox: {
    marginTop: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  scheduleValueText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  scheduleHint: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  datePickerCard: {
    paddingVertical: 8,
  },
  datePickerHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  seatValue: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0F172A",
  },
  seatLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 1,
  },
  fareHelper: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 10,
  },
  fareInputRow: {
    height: 52,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: "#F8FAFC",
  },
  fareInputRowExceeded: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  rupee: {
    fontSize: 22,
    fontWeight: "900",
    color: "#16A34A",
  },
  rupeeExceeded: {
    color: "#DC2626",
  },
  fareInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginLeft: 8,
    paddingVertical: 0,
  },
  fareInputExceededText: {
    color: "#DC2626",
  },
  fareErrorBox: {
    marginTop: 8,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  fareErrorText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#DC2626",
  },
  fareExceededBanner: {
    height: 54,
    borderRadius: 16,
    backgroundColor: "#FEE2E2",
    borderWidth: 1.5,
    borderColor: "#FECACA",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
    paddingHorizontal: 16,
  },
  fareExceededBannerText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  suggestionPill: {
    marginTop: 8,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  suggestion: {
    fontSize: 11,
    color: "#15803D",
    fontWeight: "700",
  },
  publishButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
    elevation: 3,
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  publishPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  publishDisabled: {
    opacity: 0.6,
  },
  publishText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  pendingDocsCard: {
    backgroundColor: "#FEF3C7",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#FCD34D",
    padding: 14,
    marginBottom: 12,
  },
  pendingDocsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  pendingDocsIcon: {
    fontSize: 16,
  },
  pendingDocsTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#92400E",
  },
  pendingDocsText: {
    fontSize: 11,
    color: "#78350F",
    lineHeight: 16,
  },
  pendingDocsAction: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "800",
    color: "#B45309",
    textDecorationLine: "underline",
  },
  docsPendingBanner: {
    height: 54,
    borderRadius: 16,
    backgroundColor: "#FEF3C7",
    borderWidth: 1.5,
    borderColor: "#FCD34D",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
    paddingHorizontal: 16,
  },
  docsPendingBannerText: {
    color: "#92400E",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  footerText: {
    textAlign: "center",
    marginTop: 14,
    fontSize: 10,
    color: "#94A3B8",
    lineHeight: 15,
    paddingHorizontal: 10,
  },
});
