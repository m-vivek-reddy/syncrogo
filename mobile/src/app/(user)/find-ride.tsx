import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useCallback, useRef, useState } from "react";
import { router } from "expo-router";
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
  driver_id: number;
  driver_name?: string;
  driver_phone?: string;
  vehicle_number?: string;
  vehicle_type?: string;
  origin: string;
  destination: string;
  price_per_seat: number;
  seats_available?: number;
  available_seats?: number;
  gender_preference?: string;
};

export default function FindRide() {
  const [pickup, setPickup] = useState("Hayathnagar, Hyderabad");
  const [destination, setDestination] = useState("Lal Bahadur Nagar, Hyderabad");
  const [pickupCoord, setPickupCoord] = useState<Coordinate>({ latitude: 17.3298, longitude: 78.6017 });
  const [destinationCoord, setDestinationCoord] = useState<Coordinate>({ latitude: 17.348, longitude: 78.551 });
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

  const handleSearch = async () => {
    if (!pickup.trim() || !destination.trim()) {
      return Alert.alert(
        "Locations Required",
        "Please enter both pickup and destination."
      );
    }

    try {
      setIsSearching(true);
      setHasSearched(true);
      const { data } = await api.get("/api/v1/rides/search", {
        params: {
          pickup_lat: pickupCoord.latitude,
          pickup_lon: pickupCoord.longitude,
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

      <View style={styles.card}>
        <Text style={styles.label}>1. PICKUP LOCATION</Text>
        <View style={[styles.inputBox, selectionMode === "pickup" && styles.inputBoxActivePickup]}>
          <Text style={styles.inputIcon}>📍</Text>
          <TextInput
            style={styles.input}
            value={pickup}
            onChangeText={handlePickupTextChange}
            onFocus={() => {
              setSelectionMode("pickup");
              setActiveDropdown("pickup");
            }}
            placeholder="Type pickup address or area"
            placeholderTextColor="#94A3B8"
          />
          {searchingPickup && <ActivityIndicator size="small" color={Colors.primary} />}
        </View>

        {activeDropdown === "pickup" && pickupSuggestions.length > 0 && (
          <View style={styles.suggestionsList}>
            {pickupSuggestions.map((place, idx) => (
              <Pressable
                key={`p-${idx}-${place.latitude}`}
                onPress={() => handleSelectPickupSuggestion(place)}
                style={styles.suggestionItem}
              >
                <Text style={styles.suggestionIcon}>📍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionTitle} numberOfLines={1}>{place.displayName}</Text>
                  {place.subtitle && <Text style={styles.suggestionSub} numberOfLines={1}>{place.subtitle}</Text>}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={[styles.label, { marginTop: 14 }]}>2. DESTINATION</Text>
        <View style={[styles.inputBox, selectionMode === "destination" && styles.inputBoxActiveDest]}>
          <Text style={styles.inputIcon}>🏁</Text>
          <TextInput
            style={styles.input}
            value={destination}
            onChangeText={handleDestTextChange}
            onFocus={() => {
              setSelectionMode("destination");
              setActiveDropdown("destination");
            }}
            placeholder="Type dropoff address or landmark"
            placeholderTextColor="#94A3B8"
          />
          {searchingDest && <ActivityIndicator size="small" color={Colors.green} />}
        </View>

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
                  <Text style={styles.suggestionTitle} numberOfLines={1}>{place.displayName}</Text>
                  {place.subtitle && <Text style={styles.suggestionSub} numberOfLines={1}>{place.subtitle}</Text>}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Map Pin Point Adjuster */}
        <Text style={[styles.label, { marginTop: 16 }]}>MAP PINPOINT ADJUSTMENT</Text>
        <View style={styles.mapContainer}>
          <LocationPickerMap
            pickup={pickupCoord}
            destination={destinationCoord}
            selectionMode={selectionMode}
            onPickupChange={handlePickupMapChange}
            onDestinationChange={handleDestMapChange}
            onRouteChange={useCallback(() => {}, [])}
          />
        </View>

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
                    <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
                    <Text style={styles.routeTxt} numberOfLines={1}>
                      {offer.origin?.split(",")[0] || "Origin"}
                    </Text>
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
