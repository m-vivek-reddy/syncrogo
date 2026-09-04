import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import * as Location from "expo-location";
import api from "../../api/client";
import { Colors } from "../../constants/colors";
import LocationPickerMap from "../../components/LocationPickerMap";
import {
  reverseGeocode,
  searchPlaces,
  type PlaceResult,
} from "../../services/geocoding";
import type { Coordinate } from "../../services/routing";

type DriverOffer = {
  id: number;
  ride_id?: number;
  driver_id: number;
  driver_name?: string;
  driver_phone?: string;
  driver_online?: boolean;
  driver_live_location?: {
    latitude: number | null;
    longitude: number | null;
    is_live?: boolean;
  };
  vehicle_number?: string;
  vehicle_type?: string;
  origin: string;
  destination: string;
  price_per_seat: number;
  seats_available?: number;
  available_seats?: number;
  gender_preference?: string;
  pickup_distance_km?: number | null;
  eta_minutes?: number | null;
};

export default function FindRide() {
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [pickupCoord, setPickupCoord] = useState<Coordinate | null>(null);
  const [destinationCoord, setDestinationCoord] = useState<Coordinate | null>(null);
  const [selectionMode, setSelectionMode] = useState<"pickup" | "destination">("pickup");

  // Autocomplete state
  const [pickupSuggestions, setPickupSuggestions] = useState<PlaceResult[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<PlaceResult[]>([]);
  const [searchingPickup, setSearchingPickup] = useState(false);
  const [searchingDest, setSearchingDest] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<"pickup" | "destination" | null>(null);

  const debounceTimerRef = useRef<any>(null);

  const [rides, setRides] = useState<DriverOffer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [bookingRideId, setBookingRideId] = useState<number | null>(null);

  // Route metrics from road router
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);

  // Passenger live GPS state
  const [liveLocation, setLiveLocation] = useState<Coordinate | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "locating" | "granted" | "denied" | "unavailable"
  >("idle");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);

  /*
   * Explicitly set current location as pickup point
   */
  const handleUseCurrentLocation = useCallback(async () => {
    setGpsLoading(true);
    setActiveDropdown(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Location permission is needed to set your current location as pickup point."
        );
        setLocationStatus("denied");
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

      const coord: Coordinate = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      setLiveLocation(coord);
      setPickupCoord(coord);
      setLocationStatus("granted");

      // Reverse geocode to get a clear human-readable address
      const addr = await reverseGeocode(coord.latitude, coord.longitude);
      setPickup(addr || `Current Location (${coord.latitude.toFixed(4)}, ${coord.longitude.toFixed(4)})`);
      setPickupSuggestions([]);
      setSelectionMode("destination");
      Keyboard.dismiss();
    } catch {
      Alert.alert(
        "GPS Error",
        "Could not fetch current high-accuracy GPS location. Please ensure location services are enabled."
      );
    } finally {
      setGpsLoading(false);
    }
  }, []);

  const startLiveLocation = useCallback(async () => {
    try {
      setLocationStatus("locating");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationStatus("denied");
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const first = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setLiveLocation(first);
      setLocationStatus("granted");

      // If pickup is not manually chosen yet, prefill current location
      setPickupCoord((prev) => {
        if (!prev) {
          void reverseGeocode(first.latitude, first.longitude).then((addr) => {
            setPickup((current) => (current ? current : addr || "Current Location"));
          });
          return first;
        }
        return prev;
      });

      locationWatchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 25 },
        (loc) => {
          const coord = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setLiveLocation(coord);
        }
      );
    } catch {
      setLocationStatus("unavailable");
    }
  }, []);

  useEffect(() => {
    void startLiveLocation();
    return () => {
      locationWatchRef.current?.remove();
      locationWatchRef.current = null;
    };
  }, [startLiveLocation]);

  const handlePickupTextChange = (text: string) => {
    setPickup(text);
    setActiveDropdown("pickup");

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

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
    }, 300);
  };

  const handleDestTextChange = (text: string) => {
    setDestination(text);
    setActiveDropdown("destination");

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

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
    }, 300);
  };

  const handleSelectPickupSuggestion = (place: PlaceResult) => {
    Keyboard.dismiss();
    const coord: Coordinate = { latitude: place.latitude, longitude: place.longitude };
    setPickupCoord(coord);
    const label = place.subtitle ? `${place.displayName}, ${place.subtitle}` : place.displayName;
    setPickup(label);
    setPickupSuggestions([]);
    setActiveDropdown(null);
    setSelectionMode("destination");
  };

  const handleSelectDestSuggestion = (place: PlaceResult) => {
    Keyboard.dismiss();
    const coord: Coordinate = { latitude: place.latitude, longitude: place.longitude };
    setDestinationCoord(coord);
    const label = place.subtitle ? `${place.displayName}, ${place.subtitle}` : place.displayName;
    setDestination(label);
    setDestSuggestions([]);
    setActiveDropdown(null);
  };

  const handlePickupMapChange = useCallback(async (coord: Coordinate) => {
    setPickupCoord(coord);
    setSelectionMode("destination");
    setActiveDropdown(null);
    try {
      const addr = await reverseGeocode(coord.latitude, coord.longitude);
      setPickup(addr);
    } catch {}
  }, []);

  const handleDestMapChange = useCallback(async (coord: Coordinate) => {
    setDestinationCoord(coord);
    setActiveDropdown(null);
    try {
      const addr = await reverseGeocode(coord.latitude, coord.longitude);
      setDestination(addr);
    } catch {}
  }, []);

  const handleClearPickup = () => {
    setPickup("");
    setPickupCoord(null);
    setPickupSuggestions([]);
    setDistanceKm(null);
    setDurationMinutes(null);
  };

  const handleClearDest = () => {
    setDestination("");
    setDestinationCoord(null);
    setDestSuggestions([]);
    setDistanceKm(null);
    setDurationMinutes(null);
  };

  const handleRouteChange = useCallback((distance: number, duration: number) => {
    setDistanceKm(distance);
    setDurationMinutes(duration);
  }, []);

  const handleSearch = async () => {
    const useCoord = pickupCoord ?? liveLocation;
    if (!pickup.trim() || !useCoord) {
      return Alert.alert(
        "Pickup Location Required",
        "Please select a pickup location or tap 'Use Current Location'."
      );
    }

    if (!destination.trim() || !destinationCoord) {
      return Alert.alert(
        "Destination Required",
        "Please enter or select a destination."
      );
    }

    try {
      setIsSearching(true);
      setHasSearched(true);
      const { data } = await api.get("/api/v1/rides/search", {
        params: {
          pickup_lat: useCoord.latitude,
          pickup_lon: useCoord.longitude,
          dropoff_lat: destinationCoord.latitude,
          dropoff_lon: destinationCoord.longitude,
        },
      });

      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
      setRides(list);
    } catch (e: any) {
      Alert.alert(
        "Search Failed",
        e.response?.data?.detail ?? "Could not search for rides right now."
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleBook = async (offer: DriverOffer) => {
    try {
      setBookingRideId(offer.id);
      await api.post(`/api/v1/rides/${offer.id}/book`);
      Alert.alert(
        "🎉 Seat Booked!",
        "Your seat has been reserved. You can view it in My Trips.",
        [
          {
            text: "View My Trips",
            onPress: () => router.push("/(user)/trips" as any),
          },
          { text: "OK", style: "cancel" },
        ]
      );
      void handleSearch();
    } catch (e: any) {
      Alert.alert(
        "Booking Failed",
        e.response?.data?.detail ?? "Unable to book this seat."
      );
    } finally {
      setBookingRideId(null);
    }
  };

  const handleCall = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() =>
        Alert.alert("Error", "Could not open dialer.")
      );
    } else {
      Alert.alert("Notice", "Driver phone number not provided.");
    }
  };

  const handleChat = (offer: DriverOffer) => {
    router.push({
      pathname: "/(user)/message" as any,
      params: {
        chatPartnerName: offer.driver_name || `Driver ${offer.driver_id}`,
        rideId: String(offer.id),
        receiverId: String(offer.driver_id),
        driverPhone: offer.driver_phone || "",
      },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Find a Ride</Text>
      </View>

      {/* Passenger live location banner */}
      <View
        style={[
          styles.liveBanner,
          locationStatus === "granted" && styles.liveBannerActive,
          (locationStatus === "denied" || locationStatus === "unavailable") &&
            styles.liveBannerError,
        ]}
      >
        <Text style={styles.liveBannerText}>
          {locationStatus === "granted" &&
            `📍 Live location ON${
              liveLocation
                ? ` (${liveLocation.latitude.toFixed(4)}, ${liveLocation.longitude.toFixed(4)})`
                : ""
            }`}
          {locationStatus === "locating" && "📡 Getting your live location..."}
          {locationStatus === "denied" &&
            "⚠️ Location permission denied — enable it to find nearby offers."}
          {locationStatus === "unavailable" && "⚠️ GPS unavailable — using map pin instead."}
          {locationStatus === "idle" && "📡 Location idle"}
        </Text>
      </View>

      <View style={styles.card}>
        {/* Quick Current Location Button */}
        <Pressable
          onPress={handleUseCurrentLocation}
          disabled={gpsLoading}
          style={({ pressed }) => [
            styles.useLocationBtn,
            pressed && styles.useLocationBtnPressed,
          ]}
        >
          {gpsLoading ? (
            <ActivityIndicator size="small" color="#1D4ED8" />
          ) : (
            <Text style={styles.useLocationIcon}>🎯</Text>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.useLocationTitle}>
              {gpsLoading ? "Detecting current GPS location..." : "Use My Current Location"}
            </Text>
            <Text style={styles.useLocationSub}>
              Tap to set pickup at your live location
            </Text>
          </View>
          {gpsAccuracy !== null && (
            <View style={styles.accuracyTag}>
              <Text style={styles.accuracyTagText}>±{Math.round(gpsAccuracy)}m</Text>
            </View>
          )}
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
                selectionMode === "pickup" && styles.modeTabTextActivePickup,
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
                selectionMode === "destination" && styles.modeTabTextActiveDest,
              ]}
            >
              🏁 2. Destination
            </Text>
          </Pressable>
        </View>

        {/* PICKUP LOCATION INPUT */}
        <View style={styles.inputWrapper}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>1. PICKUP LOCATION</Text>
            {pickupCoord && (
              <Text style={styles.coordLabel}>
                {pickupCoord.latitude.toFixed(4)}, {pickupCoord.longitude.toFixed(4)}
              </Text>
            )}
          </View>
          <View
            style={[
              styles.inputBox,
              selectionMode === "pickup" && styles.inputBoxActivePickup,
            ]}
          >
            <Text style={styles.inputIcon}>📍</Text>
            <TextInput
              style={styles.input}
              value={pickup}
              onChangeText={handlePickupTextChange}
              onFocus={() => {
                setSelectionMode("pickup");
                setActiveDropdown("pickup");
              }}
              placeholder="Search pickup address or tap GPS"
              placeholderTextColor="#94A3B8"
            />
            {searchingPickup && (
              <ActivityIndicator size="small" color={Colors.primary} />
            )}
            {pickup.length > 0 && !searchingPickup && (
              <Pressable onPress={handleClearPickup} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>✕</Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleUseCurrentLocation}
              disabled={gpsLoading}
              style={styles.inlineGpsBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.inlineGpsBtnText}>🎯 GPS</Text>
            </Pressable>
          </View>

          {/* Pickup suggestions dropdown */}
          {activeDropdown === "pickup" && (
            <View style={styles.suggestionsList}>
              <Pressable
                onPress={handleUseCurrentLocation}
                style={styles.currentLocationSuggestionItem}
              >
                <View style={styles.currentLocationIconCircle}>
                  <Text style={styles.currentLocationIconText}>🎯</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.currentLocationTitle}>
                    Use Current Location
                  </Text>
                  <Text style={styles.suggestionSub}>
                    {liveLocation
                      ? `GPS: (${liveLocation.latitude.toFixed(4)}, ${liveLocation.longitude.toFixed(4)})`
                      : "Tap to set pickup at your current GPS location"}
                  </Text>
                </View>
              </Pressable>

              {pickupSuggestions.map((place, idx) => (
                <Pressable
                  key={`p-${idx}-${place.latitude}`}
                  onPress={() => handleSelectPickupSuggestion(place)}
                  style={styles.suggestionItem}
                >
                  <Text style={styles.suggestionIcon}>📍</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggestionTitle} numberOfLines={1}>
                      {place.displayName}
                    </Text>
                    {place.subtitle && (
                      <Text style={styles.suggestionSub} numberOfLines={1}>
                        {place.subtitle}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* DESTINATION LOCATION INPUT */}
        <View style={[styles.inputWrapper, { marginTop: 14 }]}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>2. DESTINATION</Text>
            {destinationCoord && (
              <Text style={styles.coordLabel}>
                {destinationCoord.latitude.toFixed(4)}, {destinationCoord.longitude.toFixed(4)}
              </Text>
            )}
          </View>
          <View
            style={[
              styles.inputBox,
              selectionMode === "destination" && styles.inputBoxActiveDest,
            ]}
          >
            <Text style={styles.inputIcon}>🏁</Text>
            <TextInput
              style={styles.input}
              value={destination}
              onChangeText={handleDestTextChange}
              onFocus={() => {
                setSelectionMode("destination");
                setActiveDropdown("destination");
              }}
              placeholder="Type destination address, area or landmark"
              placeholderTextColor="#94A3B8"
            />
            {searchingDest && (
              <ActivityIndicator size="small" color={Colors.green} />
            )}
            {destination.length > 0 && !searchingDest && (
              <Pressable onPress={handleClearDest} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>✕</Text>
              </Pressable>
            )}
          </View>

          {/* Destination suggestions dropdown */}
          {activeDropdown === "destination" && destSuggestions.length > 0 && (
            <View style={styles.suggestionsList}>
              {destSuggestions.map((place, idx) => (
                <Pressable
                  key={`d-${idx}-${place.latitude}`}
                  onPress={() => handleSelectDestSuggestion(place)}
                  style={styles.suggestionItem}
                >
                  <Text style={styles.suggestionIcon}>🏁</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggestionTitle} numberOfLines={1}>
                      {place.displayName}
                    </Text>
                    {place.subtitle && (
                      <Text style={styles.suggestionSub} numberOfLines={1}>
                        {place.subtitle}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Map Pin Point Adjuster */}
        <Text style={[styles.label, { marginTop: 16 }]}>MAP PINPOINT ADJUSTMENT</Text>
        <View style={styles.mapContainer}>
          <LocationPickerMap
            pickup={pickupCoord}
            destination={destinationCoord}
            selectionMode={selectionMode}
            onPickupChange={handlePickupMapChange}
            onDestinationChange={handleDestMapChange}
            onRouteChange={handleRouteChange}
          />
        </View>

        {/* Route Summary */}
        {distanceKm !== null && durationMinutes !== null && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{distanceKm} km</Text>
              <Text style={styles.summaryLabel}>Road Distance</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{durationMinutes} min</Text>
              <Text style={styles.summaryLabel}>Est. Travel Time</Text>
            </View>
          </View>
        )}

        <View style={styles.estimateBanner}>
          <Text style={styles.estimateText}>
            💡 Tap map to set exact pinpoint coordinates & view route.
          </Text>
        </View>

        <Pressable
          onPress={handleSearch}
          disabled={isSearching}
          style={[styles.searchBtn, isSearching && styles.searchBtnDisabled]}
        >
          <Text style={styles.searchBtnText}>
            {isSearching ? "Searching available rides..." : "Search Available Rides"}
          </Text>
        </Pressable>
      </View>

      {hasSearched && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>
            {rides.length > 0
              ? `Found ${rides.length} rides heading your way`
              : "No rides found on this route."}
          </Text>

          {rides.map((offer) => {
            const seats = offer.available_seats ?? offer.seats_available ?? 1;
            const isBooking = bookingRideId === offer.id;

            return (
              <View key={offer.id} style={styles.offerCard}>
                <View style={styles.offerHeader}>
                  <View>
                    <Text style={styles.driverName}>
                      {offer.driver_name || `Driver #${offer.driver_id}`}
                    </Text>
                    <View style={styles.vehiclePill}>
                      <Text style={styles.vehicleText}>
                        🚗 {offer.vehicle_number || offer.vehicle_type || "Vehicle TBA"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.fareContainer}>
                    <Text style={styles.farePrice}>₹{offer.price_per_seat}</Text>
                    <Text style={styles.seatsLeft}>{seats} Seats Left</Text>
                  </View>
                </View>

                <View style={styles.routeBox}>
                  <View style={styles.routeItem}>
                    <View
                      style={[
                        styles.dot,
                        offer.driver_online && offer.driver_live_location?.is_live
                          ? styles.dotLive
                          : { backgroundColor: Colors.primary },
                      ]}
                    />
                    <Text style={styles.routeTxt} numberOfLines={1}>
                      {offer.origin?.split(",")[0] || "Origin"}
                    </Text>
                    {(offer.pickup_distance_km != null ||
                      offer.eta_minutes != null) && (
                      <Text style={styles.etaText}>
                        {offer.pickup_distance_km != null
                          ? `${offer.pickup_distance_km} km`
                          : ""}
                        {offer.eta_minutes != null
                          ? ` • ~${offer.eta_minutes} min`
                          : ""}
                      </Text>
                    )}
                  </View>
                  <View style={styles.routeConnector} />
                  <View style={styles.routeItem}>
                    <View style={[styles.dot, { backgroundColor: Colors.green }]} />
                    <Text style={styles.routeTxt} numberOfLines={1}>
                      {offer.destination?.split(",")[0] || "Destination"}
                    </Text>
                  </View>
                </View>

                <View style={styles.tagContainer}>
                  <View style={styles.prefTag}>
                    <Text style={styles.prefTagText}>
                      {(offer.gender_preference || "any_gender").replace("_", " ")}
                    </Text>
                  </View>
                  {offer.driver_online && offer.driver_live_location?.is_live && (
                    <View style={styles.liveTag}>
                      <Text style={styles.liveTagText}>● LIVE</Text>
                    </View>
                  )}
                </View>

                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={() => handleChat(offer)}
                    style={styles.iconBtn}
                  >
                    <Text style={styles.iconBtnText}>💬</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleCall(offer.driver_phone)}
                    style={styles.iconBtn}
                  >
                    <Text style={styles.iconBtnText}>📞</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleBook(offer)}
                    disabled={isBooking}
                    style={[styles.bookBtn, isBooking && styles.bookBtnDisabled]}
                  >
                    <Text style={styles.bookBtnText}>
                      {isBooking ? "Reserving..." : "Book Seat"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  liveBanner: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  liveBannerActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#BBF7D0",
  },
  liveBannerError: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
  },
  liveBannerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
  dotLive: {
    backgroundColor: "#16A34A",
    shadowColor: "#16A34A",
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  etaText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#2563EB",
  },
  liveTag: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  liveTagText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#15803D",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
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
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.text,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  useLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 14,
  },
  useLocationBtnPressed: {
    backgroundColor: "#DBEAFE",
    transform: [{ scale: 0.98 }],
  },
  useLocationIcon: {
    fontSize: 20,
  },
  useLocationTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  useLocationSub: {
    fontSize: 11,
    fontWeight: "600",
    color: "#3B82F6",
    marginTop: 1,
  },
  accuracyTag: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  accuracyTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#166534",
  },
  modeTabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  modeTabActivePickup: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  modeTabActiveDest: {
    borderColor: "#16A34A",
    backgroundColor: "#F0FDF4",
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  modeTabTextActivePickup: {
    color: "#1D4ED8",
    fontWeight: "800",
  },
  modeTabTextActiveDest: {
    color: "#15803D",
    fontWeight: "800",
  },
  inputWrapper: {
    marginBottom: 4,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  coordLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    gap: 8,
  },
  inputBoxActivePickup: {
    borderColor: "#2563EB",
    backgroundColor: "#FFFFFF",
  },
  inputBoxActiveDest: {
    borderColor: "#16A34A",
    backgroundColor: "#FFFFFF",
  },
  inputIcon: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#64748B",
    lineHeight: 12,
  },
  inlineGpsBtn: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  inlineGpsBtnText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  suggestionsList: {
    marginTop: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  currentLocationSuggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: "#BFDBFE",
    backgroundColor: "#F0FDF4",
    gap: 10,
  },
  currentLocationIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  currentLocationIconText: {
    fontSize: 15,
  },
  currentLocationTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#15803D",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 10,
  },
  suggestionIcon: {
    fontSize: 14,
  },
  suggestionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  suggestionSub: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
    marginTop: 10,
  },
  summaryStat: {
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    marginTop: 2,
    textTransform: "uppercase",
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#CBD5E1",
  },
  mapContainer: {
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  estimateBanner: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  estimateText: {
    fontSize: 11,
    color: Colors.primaryDark,
    fontWeight: "600",
  },
  searchBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  searchBtnDisabled: {
    opacity: 0.6,
  },
  searchBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  resultsContainer: {
    marginTop: 4,
  },
  resultsTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 12,
  },
  offerCard: {
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
  offerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
    paddingBottom: 12,
  },
  driverName: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  vehiclePill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  vehicleText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  fareContainer: {
    alignItems: "flex-end",
  },
  farePrice: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.greenDark,
  },
  seatsLeft: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    textTransform: "uppercase",
    marginTop: 2,
  },
  routeBox: {
    marginVertical: 10,
  },
  routeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeTxt: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
  },
  routeConnector: {
    width: 2,
    height: 10,
    backgroundColor: "#E2E8F0",
    marginLeft: 3,
    marginVertical: 2,
  },
  tagContainer: {
    flexDirection: "row",
    marginBottom: 10,
  },
  prefTag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  prefTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "capitalize",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  iconBtnText: {
    fontSize: 18,
  },
  bookBtn: {
    flex: 1,
    backgroundColor: Colors.text,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
  },
  bookBtnDisabled: {
    opacity: 0.6,
  },
  bookBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
});
