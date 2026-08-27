import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, {
  Circle,
  MapPressEvent,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from "react-native-maps";
import * as Location from "expo-location";

import {
  fetchRoadRoute,
  haversineDistanceKm,
  type Coordinate,
} from "../services/routing";

type SelectionMode = "pickup" | "destination";

type LocationPickerMapProps = {
  pickup: Coordinate | null;
  destination: Coordinate | null;
  selectionMode: SelectionMode;
  /** "car" uses all roads (incl. ORR); "bike" excludes motorways. */
  vehicleType?: string;
  onPickupChange: (coordinate: Coordinate) => void;
  onDestinationChange: (coordinate: Coordinate) => void;
  onRouteChange: (
    distanceKm: number,
    durationMinutes: number,
    coordinates: Coordinate[]
  ) => void;
};

const DEFAULT_REGION: Region = {
  latitude: 17.4435,
  longitude: 78.3772,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

function estimateDurationMinutes(
  distanceKm: number
): number {
  if (distanceKm <= 0) {
    return 0;
  }

  return Math.max(
    1,
    Math.round((distanceKm / 30) * 60)
  );
}

function useRouteCalculator(
  pickup: Coordinate | null,
  destination: Coordinate | null,
  onRouteChange: (
    distanceKm: number,
    durationMinutes: number,
    coordinates: Coordinate[]
  ) => void,
  mapRef: React.RefObject<MapView | null>,
  vehicleType?: string
) {
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const onRouteChangeRef = useRef(onRouteChange);
  useEffect(() => {
    onRouteChangeRef.current = onRouteChange;
  }, [onRouteChange]);

  const lastRouteKeyRef = useRef<string>("");

  const pLat = pickup ? pickup.latitude.toFixed(4) : "";
  const pLon = pickup ? pickup.longitude.toFixed(4) : "";
  const dLat = destination ? destination.latitude.toFixed(4) : "";
  const dLon = destination ? destination.longitude.toFixed(4) : "";
  const routeKey = `${pLat},${pLon};${dLat},${dLon};${String(vehicleType || "car").toLowerCase()}`;

  useEffect(() => {
    let cancelled = false;

    const calculateRoute = async () => {
      if (!pickup || !destination) {
        setRouteCoordinates([]);
        setRouteError(null);
        lastRouteKeyRef.current = "";
        return;
      }

      if (routeKey === lastRouteKeyRef.current) {
        return; // Skip duplicate calculation for identical coordinates
      }

      lastRouteKeyRef.current = routeKey;

      const directDistance = haversineDistanceKm(pickup, destination);

      if (directDistance < 0.01) {
        const samePointRoute = [pickup, destination];
        setRouteCoordinates(samePointRoute);
        onRouteChangeRef.current(0.01, 1, samePointRoute);
        return;
      }

      try {
        setRouteLoading(true);
        setRouteError(null);

        const result = await fetchRoadRoute(pickup, destination, vehicleType);

        if (cancelled) {
          return;
        }

        setRouteCoordinates(result.coordinates);
        onRouteChangeRef.current(
          result.distanceKm,
          result.durationMinutes,
          result.coordinates
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.log("Road route error:", error);

        const fallbackDistance = Math.max(
          0.1,
          Math.round(directDistance * 100) / 100
        );

        const fallbackDuration = estimateDurationMinutes(fallbackDistance);

        const fallbackCoordinates = [pickup, destination];

        setRouteCoordinates(fallbackCoordinates);

        setRouteError(
          "Road route temporarily unavailable. Showing direct route."
        );

        onRouteChangeRef.current(
          fallbackDistance,
          fallbackDuration,
          fallbackCoordinates
        );
      } finally {
        if (!cancelled) {
          setRouteLoading(false);
        }
      }
    };

    void calculateRoute();

    return () => {
      cancelled = true;
    };
  }, [pLat, pLon, dLat, dLon, pickup, destination, routeKey, vehicleType]);

  return { routeCoordinates, routeLoading, routeError };
}

export default function LocationPickerMap({
  pickup,
  destination,
  selectionMode,
  vehicleType,
  onPickupChange,
  onDestinationChange,
  onRouteChange,
}: LocationPickerMapProps) {
  const mapRef =
    useRef<MapView | null>(null);

  const [region, setRegion] =
    useState<Region>(
      DEFAULT_REGION
    );

  const [userLocation, setUserLocation] =
    useState<Coordinate | null>(null);

  const [locationAccuracy, setLocationAccuracy] =
    useState<number | null>(null);

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [mapReady, setMapReady] =
    useState(false);

  const { routeCoordinates, routeLoading, routeError } =
    useRouteCalculator(
      pickup,
      destination,
      onRouteChange,
      mapRef,
      vehicleType
    );

  const loadCurrentLocation =
    useCallback(async () => {
      try {
        setLocationLoading(true);

        const {
          status,
        } =
          await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          Alert.alert(
            "Location Permission",
            "Please allow location permission to use your current location."
          );
          return;
        }

        const location =
          await Location.getCurrentPositionAsync(
            {
              accuracy:
                Location.Accuracy.High,
              mayShowUserSettingsDialog:
                true,
            }
          );

        const coordinate: Coordinate = {
          latitude:
            location.coords.latitude,
          longitude:
            location.coords.longitude,
        };

        setUserLocation(
          coordinate
        );

        setLocationAccuracy(
          location.coords
            .accuracy ?? null
        );

        if (!pickup) {
          onPickupChange(
            coordinate
          );
        }

        mapRef.current?.animateToRegion(
          {
            latitude:
              coordinate.latitude,
            longitude:
              coordinate.longitude,
            latitudeDelta: 0.035,
            longitudeDelta: 0.035,
          },
          700
        );
      } catch (error) {
        console.log(
          "LocationPickerMap GPS error:",
          error
        );
      } finally {
        setLocationLoading(
          false
        );
      }
    }, []);

  useEffect(() => {
    void loadCurrentLocation();
  }, []);

  const handleMapPress =
    useCallback(
      (event: MapPressEvent) => {
        const coordinate =
          event?.nativeEvent
            ?.coordinate;

        if (
          !coordinate ||
          !Number.isFinite(
            Number(
              coordinate.latitude
            )
          ) ||
          !Number.isFinite(
            Number(
              coordinate.longitude
            )
          )
        ) {
          return;
        }

        const selectedCoordinate: Coordinate =
        {
          latitude: Number(
            coordinate.latitude
          ),
          longitude: Number(
            coordinate.longitude
          ),
        };

        if (
          selectionMode ===
          "pickup"
        ) {
          onPickupChange(
            selectedCoordinate
          );
        } else {
          onDestinationChange(
            selectedCoordinate
          );
        }
      },
      [
        onDestinationChange,
        onPickupChange,
        selectionMode,
      ]
    );

  const focusLocation =
    useCallback(
      (
        coordinate:
          | Coordinate
          | null
      ) => {
        if (!coordinate) {
          return;
        }

        mapRef.current?.animateToRegion(
          {
            latitude:
              coordinate.latitude,
            longitude:
              coordinate.longitude,
            latitudeDelta: 0.035,
            longitudeDelta: 0.035,
          },
          500
        );
      },
      []
    );

  const initialRegion =
    useMemo(() => {
      if (pickup) {
        return {
          latitude:
            pickup.latitude,
          longitude:
            pickup.longitude,
          latitudeDelta: 0.035,
          longitudeDelta: 0.035,
        };
      }

      return DEFAULT_REGION;
    }, [pickup]);

  const handleFitRoute =
    useCallback(() => {
      if (
        pickup &&
        destination
      ) {
        const coordinates =
          routeCoordinates.length >=
            2
            ? routeCoordinates
            : [
              pickup,
              destination,
            ];

        mapRef.current?.fitToCoordinates(
          coordinates,
          {
            edgePadding: {
              top: 100,
              right: 50,
              bottom: 130,
              left: 50,
            },
            animated: true,
          }
        );

        return;
      }

      if (pickup) {
        focusLocation(pickup);
        return;
      }

      if (userLocation) {
        focusLocation(
          userLocation
        );
        return;
      }

      mapRef.current?.animateToRegion(
        DEFAULT_REGION,
        500
      );
    }, [
      destination,
      focusLocation,
      pickup,
      routeCoordinates,
      userLocation,
    ]);

  const handleZoomIn =
    useCallback(() => {
      mapRef.current?.animateToRegion(
        {
          ...region,
          latitudeDelta:
            Math.max(
              region.latitudeDelta *
              0.5,
              0.001
            ),
          longitudeDelta:
            Math.max(
              region.longitudeDelta *
              0.5,
              0.001
            ),
        },
        300
      );
    }, [region]);

  const handleZoomOut =
    useCallback(() => {
      mapRef.current?.animateToRegion(
        {
          ...region,
          latitudeDelta:
            Math.min(
              region.latitudeDelta *
              2,
              10
            ),
          longitudeDelta:
            Math.min(
              region.longitudeDelta *
              2,
              10
            ),
        },
        300
      );
    }, [region]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={
          initialRegion
        }
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass
        showsScale
        showsBuildings
        showsTraffic={false}
        loadingEnabled
        loadingIndicatorColor="#2563EB"
        loadingBackgroundColor="#E2E8F0"
        moveOnMarkerPress={false}
        onMapReady={() => {
          console.log(
            "SyncroGo map is ready"
          );
          setMapReady(true);
        }}
        onPress={handleMapPress}
        onRegionChangeComplete={
          setRegion
        }
      >
        {userLocation &&
          locationAccuracy !==
          null && (
            <Circle
              center={
                userLocation
              }
              radius={Math.max(
                10,
                locationAccuracy
              )}
              fillColor="rgba(37,99,235,0.12)"
              strokeColor="rgba(37,99,235,0.35)"
              strokeWidth={1}
            />
          )}

        {pickup && (
          <Marker
            coordinate={pickup}
            title="Pickup"
            description="Ride pickup location"
            pinColor="#2563EB"
            onPress={() =>
              focusLocation(
                pickup
              )
            }
          >
            <View
              style={
                styles.pickupMarker
              }
            >
              <View
                style={
                  styles.pickupMarkerInner
                }
              />
            </View>
          </Marker>
        )}

        {destination && (
          <Marker
            coordinate={
              destination
            }
            title="Destination"
            description="Ride destination"
            pinColor="#16A34A"
            onPress={() =>
              focusLocation(
                destination
              )
            }
          >
            <View
              style={
                styles.destinationMarker
              }
            >
              <View
                style={
                  styles.destinationMarkerInner
                }
              />
            </View>
          </Marker>
        )}

        {routeCoordinates.length >=
          2 && (
            <Polyline
              coordinates={
                routeCoordinates
              }
              strokeColor="#2563EB"
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
              geodesic={false}
            />
          )}
      </MapView>

      <View
        style={styles.topOverlay}
      >
        <View
          style={
            styles.instructionBox
          }
        >
          <Text
            style={
              styles.instructionTitle
            }
          >
            {selectionMode ===
              "pickup"
              ? "📍 Select Pickup"
              : "🏁 Select Destination"}
          </Text>

          <Text
            style={
              styles.instructionText
            }
          >
            Tap anywhere on the
            map to choose your{" "}
            {selectionMode ===
              "pickup"
              ? "pickup point"
              : "destination"}
            .
          </Text>
        </View>
      </View>

      {locationAccuracy !==
        null && (
          <View
            style={
              styles.accuracyBadge
            }
          >
            <Text
              style={
                styles.accuracyText
              }
            >
              GPS ±
              {Math.round(
                locationAccuracy
              )}
              m
            </Text>
          </View>
        )}

      {!mapReady && (
        <View
          style={
            styles.mapLoadingOverlay
          }
          pointerEvents="none"
        >
          <View
            style={
              styles.mapLoadingBox
            }
          >
            <ActivityIndicator
              size="small"
              color="#2563EB"
            />

            <Text
              style={
                styles.mapLoadingText
              }
            >
              Loading map...
            </Text>
          </View>
        </View>
      )}

      {routeLoading && (
        <View
          style={
            styles.routeLoadingBox
          }
        >
          <ActivityIndicator
            size="small"
            color="#2563EB"
          />

          <Text
            style={
              styles.routeLoadingText
            }
          >
            Calculating road
            route...
          </Text>
        </View>
      )}

      {!routeLoading &&
        routeError && (
          <View
            style={
              styles.routeErrorBox
            }
          >
            <Text
              style={
                styles.routeErrorText
              }
            >
              ⚠️ {routeError}
            </Text>
          </View>
        )}

      <View
        style={styles.controls}
      >
        <Pressable
          onPress={
            handleFitRoute
          }
          style={
            styles.controlButton
          }
          accessibilityLabel="Fit route"
        >
          <Text
            style={
              styles.controlText
            }
          >
            ⛶
          </Text>
        </Pressable>

        <Pressable
          onPress={
            handleZoomIn
          }
          style={
            styles.controlButton
          }
          accessibilityLabel="Zoom in"
        >
          <Text
            style={
              styles.controlText
            }
          >
            +
          </Text>
        </Pressable>

        <Pressable
          onPress={
            handleZoomOut
          }
          style={
            styles.controlButton
          }
          accessibilityLabel="Zoom out"
        >
          <Text
            style={
              styles.controlText
            }
          >
            −
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() =>
          void loadCurrentLocation()
        }
        disabled={
          locationLoading
        }
        style={[
          styles.gpsButton,
          locationLoading &&
          styles.gpsButtonDisabled,
        ]}
        accessibilityLabel="Current location"
      >
        {locationLoading ? (
          <ActivityIndicator
            size="small"
            color="#2563EB"
          />
        ) : (
          <Text
            style={
              styles.gpsText
            }
          >
            🎯
          </Text>
        )}
      </Pressable>

      {pickup &&
        destination && (
          <View
            style={
              styles.bottomOverlay
            }
          >
            <View
              style={
                styles.routeSummary
              }
            >
              <View
                style={
                  styles.summaryItem
                }
              >
                <Text
                  style={
                    styles.summaryValue
                  }
                >
                  {routeCoordinates.length >=
                    2
                    ? "✓"
                    : "..."}
                </Text>

                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Route
                </Text>
              </View>

              <View
                style={
                  styles.summaryDivider
                }
              />

              <View
                style={
                  styles.summaryItem
                }
              >
                <Text
                  style={
                    styles.summaryValue
                  }
                >
                  {routeLoading
                    ? "..."
                    : "Ready"}
                </Text>

                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Status
                </Text>
              </View>
            </View>
          </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 390,
    minHeight: 390,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    position: "relative",
  },

  map: {
    ...StyleSheet.absoluteFillObject,
  },

  topOverlay: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 70,
  },

  instructionBox: {
    backgroundColor:
      "rgba(255,255,255,0.96)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
  },

  instructionTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0F172A",
  },

  instructionText: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },

  accuracyBadge: {
    position: "absolute",
    top: 82,
    right: 12,
    backgroundColor:
      "rgba(255,255,255,0.95)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },

  accuracyText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#166534",
  },

  controls: {
    position: "absolute",
    right: 12,
    top: 112,
    gap: 7,
  },

  controlButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 5,
  },

  controlText: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "500",
    color: "#1E3A8A",
  },

  gpsButton: {
    position: "absolute",
    right: 12,
    bottom: 74,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 6,
  },

  gpsButtonDisabled: {
    opacity: 0.65,
  },

  gpsText: {
    fontSize: 22,
  },

  pickupMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    borderColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },

  pickupMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2563EB",
  },

  destinationMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    borderColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
  },

  destinationMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#16A34A",
  },

  routeLoadingBox: {
    position: "absolute",
    left: 12,
    bottom: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor:
      "rgba(255,255,255,0.96)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 7,
    elevation: 3,
  },

  routeLoadingText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1E3A8A",
  },

  routeErrorBox: {
    position: "absolute",
    left: 12,
    right: 70,
    bottom: 16,
    backgroundColor:
      "rgba(255,247,237,0.96)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },

  routeErrorText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#9A3412",
  },

  mapLoadingOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E2E8F0",
  },

  mapLoadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    elevation: 4,
  },

  mapLoadingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },

  bottomOverlay: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
  },

  routeSummary: {
    backgroundColor:
      "rgba(255,255,255,0.96)",
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 5,
  },

  summaryItem: {
    flex: 1,
    alignItems: "center",
  },

  summaryValue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#2563EB",
  },

  summaryLabel: {
    marginTop: 1,
    fontSize: 9,
    fontWeight: "600",
    color: "#64748B",
  },

  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E2E8F0",
  },
});