import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";

import api from "../api/client";
import { Colors } from "../constants/colors";
import { useAuthStore } from "../store/auth";

const DEFAULT_COORDS = {
  latitude: 17.385,
  longitude: 78.4867,
};

/**
 * Existing backend endpoint used to retrieve nearby vehicles.
 *
 * Expected backend response can be one of:
 *
 * {
 *   data: [...]
 * }
 *
 * OR
 *
 * [...]
 *
 * Each vehicle should contain latitude/longitude or lat/lng.
 */
const NEARBY_VEHICLES_ENDPOINT = "/api/v1/drivers/nearby";

const NEARBY_RADIUS_KM = 5;

type Coordinates = {
  latitude: number;
  longitude: number;
};

type NearbyVehicle = {
  id?: number | string;
  driver_id?: number | string;
  user_id?: number | string;

  latitude?: number;
  longitude?: number;

  lat?: number;
  lng?: number;
  lon?: number;

  full_name?: string;
  name?: string;

  vehicle_type?: string;
  vehicleType?: string;

  distance_km?: number;
  distance?: number;

  eta_minutes?: number;
  eta?: number;
};

type NearbyVehicleResponse = {
  success?: boolean;
  data?: NearbyVehicle[];
  drivers?: NearbyVehicle[];
  vehicles?: NearbyVehicle[];
  results?: NearbyVehicle[];
};

const isValidCoordinate = (
  lat: unknown,
  lon: unknown
): lat is number => {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180 &&
    (lat !== 0 || lon !== 0)
  );
};

function getVehicleCoordinates(
  vehicle: NearbyVehicle
): Coordinates | null {
  const lat =
    typeof vehicle.latitude === "number"
      ? vehicle.latitude
      : typeof vehicle.lat === "number"
      ? vehicle.lat
      : null;

  const lon =
    typeof vehicle.longitude === "number"
      ? vehicle.longitude
      : typeof vehicle.lng === "number"
      ? vehicle.lng
      : typeof vehicle.lon === "number"
      ? vehicle.lon
      : null;

  if (lat === null || lon === null) {
    return null;
  }

  if (!isValidCoordinate(lat, lon)) {
    return null;
  }

  return {
    latitude: lat,
    longitude: lon,
  };
}

function normalizeNearbyVehicles(
  response: unknown
): NearbyVehicle[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (!response || typeof response !== "object") {
    return [];
  }

  const data = response as NearbyVehicleResponse;

  if (Array.isArray(data.data)) {
    return data.data;
  }

  if (Array.isArray(data.drivers)) {
    return data.drivers;
  }

  if (Array.isArray(data.vehicles)) {
    return data.vehicles;
  }

  if (Array.isArray(data.results)) {
    return data.results;
  }

  return [];
}

export default function HomeMap() {
  const { mode } = useAuthStore();
  const isDriver = mode === "driver";

  const webViewRef = useRef<WebView>(null);

  const [coords, setCoords] = useState<Coordinates>(DEFAULT_COORDS);
  const [gpsReady, setGpsReady] = useState(false);
  const [locationAccuracy, setLocationAccuracy] =
    useState<number | null>(null);

  const [nearbyVehicles, setNearbyVehicles] = useState<
    NearbyVehicle[]
  >([]);

  const [loadingVehicles, setLoadingVehicles] =
    useState(false);

  const [nearbyVehiclesError, setNearbyVehiclesError] =
    useState(false);

  const nearbyRequestIdRef = useRef(0);

  // =========================================================
  // Send message to Leaflet WebView
  // =========================================================

  const sendMapMessage = useCallback(
    (message: Record<string, unknown>) => {
      webViewRef.current?.postMessage(JSON.stringify(message));
    },
    []
  );

  // =========================================================
  // Center map on user
  // =========================================================

  const syncMapCenter = useCallback(
    (lat?: number, lon?: number) => {
      const targetLat = lat ?? coords.latitude;
      const targetLon = lon ?? coords.longitude;

      sendMapMessage({
        type: "SET_CENTER",
        lat: targetLat,
        lon: targetLon,
      });
    },
    [
      coords.latitude,
      coords.longitude,
      sendMapMessage,
    ]
  );

  // =========================================================
  // Fetch nearby vehicles from backend
  // =========================================================

  const fetchNearbyVehicles = useCallback(
    async (location: Coordinates) => {
      // Driver mode should not display nearby driver vehicles.
      if (isDriver) {
        setNearbyVehicles([]);
        setNearbyVehiclesError(false);

        sendMapMessage({
          type: "SET_VEHICLES",
          vehicles: [],
        });

        return;
      }

      const requestId = ++nearbyRequestIdRef.current;

      try {
        setLoadingVehicles(true);
        setNearbyVehiclesError(false);

        const response = await api.get(
          NEARBY_VEHICLES_ENDPOINT,
          {
            params: {
              latitude: location.latitude,
              longitude: location.longitude,
              lat: location.latitude,
              lng: location.longitude,
              radius_km: NEARBY_RADIUS_KM,
            },
          }
        );

        // Ignore an older request if a newer GPS request completed first.
        if (requestId !== nearbyRequestIdRef.current) {
          return;
        }

        const vehicles = normalizeNearbyVehicles(
          response.data
        ).filter((vehicle) => {
          return getVehicleCoordinates(vehicle) !== null;
        });

        setNearbyVehicles(vehicles);

        // Send ONLY backend vehicles to Leaflet.
        sendMapMessage({
          type: "SET_VEHICLES",
          vehicles: vehicles.map((vehicle, index) => {
            const position =
              getVehicleCoordinates(vehicle);

            return {
              id:
                vehicle.id ??
                vehicle.driver_id ??
                vehicle.user_id ??
                `vehicle-${index}`,

              lat: position!.latitude,
              lon: position!.longitude,

              title:
                vehicle.full_name ||
                vehicle.name ||
                "Nearby Driver",

              vehicleType:
                vehicle.vehicle_type ||
                vehicle.vehicleType ||
                "vehicle",

              distanceKm:
                typeof vehicle.distance_km === "number"
                  ? vehicle.distance_km
                  : typeof vehicle.distance === "number"
                  ? vehicle.distance
                  : null,

              etaMinutes:
                typeof vehicle.eta_minutes === "number"
                  ? vehicle.eta_minutes
                  : typeof vehicle.eta === "number"
                  ? vehicle.eta
                  : null,
            };
          }),
        });
      } catch (error: any) {
        if (requestId !== nearbyRequestIdRef.current) {
          return;
        }

        console.warn(
          "HomeMap nearby vehicles error:",
          error?.response?.data || error?.message || error
        );

        setNearbyVehicles([]);
        setNearbyVehiclesError(true);

        // IMPORTANT:
        // If backend fails, remove all vehicle markers.
        // We do NOT show fake vehicles.
        sendMapMessage({
          type: "SET_VEHICLES",
          vehicles: [],
        });
      } finally {
        if (requestId === nearbyRequestIdRef.current) {
          setLoadingVehicles(false);
        }
      }
    },
    [isDriver, sendMapMessage]
  );

  // =========================================================
  // GPS
  // =========================================================

  const fetchLocation = useCallback(async () => {
    try {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        console.warn(
          "HomeMap: Location permission not granted"
        );
        return;
      }

      if (Platform.OS === "android") {
        try {
          const provider =
            await Location.getProviderStatusAsync();

          if (!provider.locationServicesEnabled) {
            await Location.enableNetworkProviderAsync().catch(
              () => {}
            );
          }
        } catch {}
      }

      const location =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
          mayShowUserSettingsDialog: true,
        });

      const rawLat = location.coords.latitude;
      const rawLon = location.coords.longitude;

      const accuracy =
        location.coords.accuracy ?? null;

      setLocationAccuracy(accuracy);

      if (!isValidCoordinate(rawLat, rawLon)) {
        console.warn(
          "HomeMap: Invalid GPS coordinates"
        );
        return;
      }

      const userCoords: Coordinates = {
        latitude: rawLat,
        longitude: rawLon,
      };

      setCoords(userCoords);
      setGpsReady(true);

      // Move passenger marker.
      sendMapMessage({
        type: "SET_USER_LOCATION",
        lat: userCoords.latitude,
        lon: userCoords.longitude,
      });

      // Center map.
      sendMapMessage({
        type: "SET_CENTER",
        lat: userCoords.latitude,
        lon: userCoords.longitude,
      });

      // Fetch REAL vehicles from backend.
      await fetchNearbyVehicles(userCoords);
    } catch (error) {
      console.warn(
        "HomeMap GPS location error:",
        error
      );
    }
  }, [
    fetchNearbyVehicles,
    sendMapMessage,
  ]);

  // =========================================================
  // Initial GPS + continuous GPS
  // =========================================================

  useEffect(() => {
    let subscription:
      | Location.LocationSubscription
      | null = null;

    let mounted = true;

    void fetchLocation();

    (async () => {
      try {
        const { status } =
          await Location.getForegroundPermissionsAsync();

        if (status !== "granted" || !mounted) {
          return;
        }

        subscription =
          await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Highest,
              timeInterval: 5000,
              distanceInterval: 10,
            },
            async (location) => {
              if (!mounted) {
                return;
              }

              const rawLat =
                location.coords.latitude;

              const rawLon =
                location.coords.longitude;

              const accuracy =
                location.coords.accuracy ?? null;

              setLocationAccuracy(accuracy);

              if (
                !isValidCoordinate(
                  rawLat,
                  rawLon
                )
              ) {
                return;
              }

              const liveCoords: Coordinates = {
                latitude: rawLat,
                longitude: rawLon,
              };

              setCoords(liveCoords);
              setGpsReady(true);

              // Move user marker only.
              sendMapMessage({
                type: "SET_USER_LOCATION",
                lat: liveCoords.latitude,
                lon: liveCoords.longitude,
              });

              // Fetch current real vehicles from backend.
              await fetchNearbyVehicles(
                liveCoords
              );
            }
          );
      } catch (error) {
        console.warn(
          "HomeMap location watch error:",
          error
        );
      }
    })();

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [
    fetchLocation,
    fetchNearbyVehicles,
    sendMapMessage,
  ]);

  // =========================================================
  // Recenter
  // =========================================================

  const recenter = useCallback(() => {
    sendMapMessage({
      type: "RECENTER",
      lat: coords.latitude,
      lon: coords.longitude,
    });
  }, [
    coords.latitude,
    coords.longitude,
    sendMapMessage,
  ]);

  // =========================================================
  // Zoom
  // =========================================================

  const handleZoomIn = useCallback(() => {
    sendMapMessage({
      type: "ZOOM_IN",
    });
  }, [sendMapMessage]);

  const handleZoomOut = useCallback(() => {
    sendMapMessage({
      type: "ZOOM_OUT",
    });
  }, [sendMapMessage]);

  // =========================================================
  // Map HTML
  // =========================================================

  const mapHtml = useMemo(() => {
    const initialLat = DEFAULT_COORDS.latitude;
    const initialLon = DEFAULT_COORDS.longitude;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
  />

  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html,
    body,
    #map {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #F8FAFC;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        sans-serif;
    }

    .leaflet-control-attribution {
      display: none !important;
    }

    .leaflet-container {
      background: #e2e8f0 !important;
    }

    /* =====================================================
       USER MARKER
       ===================================================== */

    .user-marker {
      position: relative;
      width: 24px;
      height: 24px;
    }

    .user-pulse {
      position: absolute;
      top: -6px;
      left: -6px;
      width: 36px;
      height: 36px;

      background: ${
        isDriver
          ? "rgba(16,185,129,0.35)"
          : "rgba(37,99,235,0.35)"
      };

      border-radius: 50%;
      animation: userPulse 2s infinite ease-in-out;
    }

    .user-core {
      position: absolute;
      top: 2px;
      left: 2px;

      width: 20px;
      height: 20px;

      background: ${
        isDriver
          ? "#10B981"
          : "#2563EB"
      };

      border: 3px solid #ffffff;
      border-radius: 50%;

      box-shadow:
        0 3px 8px rgba(0, 0, 0, 0.35);
    }

    @keyframes userPulse {
      0% {
        transform: scale(0.85);
        opacity: 0.9;
      }

      50% {
        transform: scale(1.6);
        opacity: 0.15;
      }

      100% {
        transform: scale(0.85);
        opacity: 0.9;
      }
    }

    /* =====================================================
       REAL BACKEND VEHICLE MARKER
       ===================================================== */

    .vehicle-marker {
      width: 34px;
      height: 34px;

      background: #ffffff;

      border: 2px solid #10B981;

      border-radius: 50%;

      display: flex;
      align-items: center;
      justify-content: center;

      font-size: 16px;

      box-shadow:
        0 3px 8px rgba(0, 0, 0, 0.25);
    }

    .vehicle-marker.bike {
      border-color: #2563EB;
    }

    .vehicle-marker.car {
      border-color: #10B981;
    }

    .vehicle-popup {
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        sans-serif;

      min-width: 120px;
    }

    .vehicle-popup-title {
      font-size: 13px;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 3px;
    }

    .vehicle-popup-meta {
      font-size: 11px;
      color: #64748B;
    }
  </style>
</head>

<body>
  <div id="map"></div>

  <script
    src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  ></script>

  <script>
    var map = null;
    var userMarker = null;

    // IMPORTANT:
    // This array starts EMPTY.
    // No fake/static vehicles are created.
    var vehicleMarkers = [];

    var centerLat = ${initialLat};
    var centerLon = ${initialLon};

    var isDriverMode =
      ${isDriver ? "true" : "false"};

    // =====================================================
    // USER ICON
    // =====================================================

    function createCustomUserIcon() {
      var html =
        '<div class="user-marker">' +
          '<div class="user-pulse"></div>' +
          '<div class="user-core"></div>' +
        '</div>';

      return L.divIcon({
        className: "custom-user-icon",
        html: html,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
    }

    // =====================================================
    // VEHICLE ICON
    // =====================================================

    function createVehicleIcon(vehicleType) {
      var type =
        String(vehicleType || "car")
          .toLowerCase();

      var isBike =
        type === "bike" ||
        type === "motorcycle" ||
        type === "scooter";

      var emoji =
        isBike ? "🏍️" : "🚗";

      var className =
        isBike
          ? "vehicle-marker bike"
          : "vehicle-marker car";

      var html =
        '<div class="' +
        className +
        '">' +
        emoji +
        '</div>';

      return L.divIcon({
        className: "custom-vehicle-icon",
        html: html,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -17]
      });
    }

    // =====================================================
    // CLEAR VEHICLES
    // =====================================================

    function clearVehicleMarkers() {
      if (!map) {
        vehicleMarkers = [];
        return;
      }

      vehicleMarkers.forEach(function(marker) {
        try {
          map.removeLayer(marker);
        } catch (e) {}
      });

      vehicleMarkers = [];
    }

    // =====================================================
    // SET BACKEND VEHICLES
    // =====================================================

    function setVehicles(vehicles) {
      if (!map) {
        return;
      }

      // Always remove old markers first.
      clearVehicleMarkers();

      if (
        isDriverMode ||
        !Array.isArray(vehicles)
      ) {
        return;
      }

      vehicles.forEach(function(vehicle) {
        if (!vehicle) {
          return;
        }

        var lat =
          Number(vehicle.lat);

        var lon =
          Number(vehicle.lon);

        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lon) ||
          lat < -90 ||
          lat > 90 ||
          lon < -180 ||
          lon > 180 ||
          (lat === 0 && lon === 0)
        ) {
          return;
        }

        var marker =
          L.marker(
            [lat, lon],
            {
              icon:
                createVehicleIcon(
                  vehicle.vehicleType
                )
            }
          ).addTo(map);

        var title =
          vehicle.title ||
          "Nearby Driver";

        var vehicleType =
          vehicle.vehicleType ||
          "Vehicle";

        var distanceText = "";

        if (
          typeof vehicle.distanceKm ===
          "number"
        ) {
          distanceText =
            "<div class='vehicle-popup-meta'>" +
            vehicle.distanceKm.toFixed(1) +
            " km away</div>";
        }

        var etaText = "";

        if (
          typeof vehicle.etaMinutes ===
          "number"
        ) {
          etaText =
            "<div class='vehicle-popup-meta'>" +
            Math.round(
              vehicle.etaMinutes
            ) +
            " min away</div>";
        }

        marker.bindPopup(
          "<div class='vehicle-popup'>" +
            "<div class='vehicle-popup-title'>" +
              title +
            "</div>" +
            "<div class='vehicle-popup-meta'>" +
              vehicleType +
            "</div>" +
            distanceText +
            etaText +
          "</div>"
        );

        vehicleMarkers.push(marker);
      });
    }

    // =====================================================
    // INIT MAP
    // =====================================================

    function initMap() {
      if (
        typeof L === "undefined"
      ) {
        setTimeout(
          initMap,
          100
        );

        return;
      }

      if (map) {
        return;
      }

      map =
        L.map("map", {
          zoomControl: false,
          attributionControl: false,
          fadeAnimation: true,
          zoomAnimation: true
        }).setView(
          [centerLat, centerLon],
          15
        );

      var primaryTiles =
        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
          {
            maxZoom: 19,
            subdomains: "abcd"
          }
        );

      primaryTiles.on(
        "tileerror",
        function() {
          if (
            !map._hasOsmFallback
          ) {
            map._hasOsmFallback = true;

            L.tileLayer(
              "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
              {
                maxZoom: 19
              }
            ).addTo(map);
          }
        }
      );

      primaryTiles.addTo(map);

      // User marker only.
      userMarker =
        L.marker(
          [
            centerLat,
            centerLon
          ],
          {
            icon:
              createCustomUserIcon()
          }
        ).addTo(map);

      // NO STATIC VEHICLES HERE.

      setTimeout(function() {
        if (map) {
          map.invalidateSize();
        }
      }, 100);

      setTimeout(function() {
        if (map) {
          map.invalidateSize();
        }
      }, 500);

      try {
        if (
          window.ReactNativeWebView &&
          window.ReactNativeWebView.postMessage
        ) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({
              type: "MAP_READY"
            })
          );
        }
      } catch (e) {}
    }

    // =====================================================
    // MESSAGE HANDLER
    // =====================================================

    function handleMessage(data) {
      try {
        var msg =
          typeof data === "string"
            ? JSON.parse(data)
            : data;

        if (!msg || !map) {
          return;
        }

        // -----------------------------------------------
        // User GPS position
        // -----------------------------------------------

        if (
          msg.type ===
          "SET_USER_LOCATION"
        ) {
          var userLat =
            Number(msg.lat);

          var userLon =
            Number(msg.lon);

          if (
            Number.isFinite(userLat) &&
            Number.isFinite(userLon)
          ) {
            if (userMarker) {
              userMarker.setLatLng([
                userLat,
                userLon
              ]);
            }
          }

          return;
        }

        // -----------------------------------------------
        // Map center
        // -----------------------------------------------

        if (
          msg.type === "SET_CENTER" ||
          msg.type === "RECENTER"
        ) {
          var targetLat =
            Number(msg.lat);

          var targetLon =
            Number(msg.lon);

          if (
            !Number.isFinite(targetLat) ||
            !Number.isFinite(targetLon)
          ) {
            return;
          }

          centerLat = targetLat;
          centerLon = targetLon;

          if (userMarker) {
            userMarker.setLatLng([
              targetLat,
              targetLon
            ]);
          }

          map.setView(
            [
              targetLat,
              targetLon
            ],
            15,
            {
              animate: true
            }
          );

          return;
        }

        // -----------------------------------------------
        // Backend vehicles
        // -----------------------------------------------

        if (
          msg.type ===
          "SET_VEHICLES"
        ) {
          setVehicles(
            Array.isArray(
              msg.vehicles
            )
              ? msg.vehicles
              : []
          );

          return;
        }

        // -----------------------------------------------
        // Zoom
        // -----------------------------------------------

        if (
          msg.type === "ZOOM_IN"
        ) {
          map.zoomIn();
          return;
        }

        if (
          msg.type === "ZOOM_OUT"
        ) {
          map.zoomOut();
          return;
        }
      } catch (e) {
        console.warn(
          "Map message error",
          e
        );
      }
    }

    window.addEventListener(
      "message",
      function(e) {
        handleMessage(
          e.data
        );
      }
    );

    document.addEventListener(
      "message",
      function(e) {
        handleMessage(
          e.data
        );
      }
    );

    window.addEventListener(
      "resize",
      function() {
        if (map) {
          map.invalidateSize();
        }
      }
    );

    initMap();
  </script>
</body>
</html>
`;
  }, [isDriver]);

  // =========================================================
  // WebView source
  // =========================================================

  const mapSource = useMemo(
    () => ({
      html: mapHtml,
      baseUrl:
        "https://basemaps.cartocdn.com",
    }),
    [mapHtml]
  );

  // =========================================================
  // Status text
  // =========================================================

  const statusText = useMemo(() => {
    if (isDriver) {
      return `Driver Online • ${
        locationAccuracy
          ? `±${Math.round(
              locationAccuracy
            )}m`
          : "GPS Live"
      }`;
    }

    if (!gpsReady) {
      return "Locating GPS Area...";
    }

    if (loadingVehicles) {
      return "Finding nearby vehicles...";
    }

    if (nearbyVehiclesError) {
      return "Unable to load nearby vehicles";
    }

    if (nearbyVehicles.length === 0) {
      return "No vehicles nearby";
    }

    return `${nearbyVehicles.length} ${
      nearbyVehicles.length === 1
        ? "Vehicle"
        : "Vehicles"
    } Nearby • ${
      locationAccuracy
        ? `±${Math.round(
            locationAccuracy
          )}m`
        : "GPS Live"
    }`;
  }, [
    isDriver,
    gpsReady,
    loadingVehicles,
    nearbyVehiclesError,
    nearbyVehicles.length,
    locationAccuracy,
  ]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={mapSource}
        style={styles.map}
        containerStyle={
          styles.mapContainer
        }
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={false}
        scrollEnabled={false}
        nestedScrollEnabled={false}
        showsHorizontalScrollIndicator={
          false
        }
        showsVerticalScrollIndicator={
          false
        }
        originWhitelist={["*"]}
        mixedContentMode="always"
        androidLayerType="hardware"
        allowFileAccess={true}
        allowFileAccessFromFileURLs={
          true
        }
        allowUniversalAccessFromFileURLs={
          true
        }
        cacheEnabled={true}
        onMessage={
          handleWebViewMessage
        }
        onLoadEnd={() =>
          syncMapCenter()
        }
      />

      {/* ===================================================
          STATUS
          =================================================== */}

      <View
        style={styles.statusPill}
        pointerEvents="none"
      >
        <View
          style={[
            styles.pulseDot,
            {
              backgroundColor:
                isDriver
                  ? Colors.green
                  : Colors.primary,
            },
          ]}
        />

        <Text
          style={
            styles.statusPillText
          }
          numberOfLines={1}
        >
          {statusText}
        </Text>
      </View>

      {/* ===================================================
          ZOOM
          =================================================== */}

      <View
        style={styles.zoomControls}
      >
        <Pressable
          onPress={
            handleZoomIn
          }
          style={({
            pressed,
          }) => [
            styles.zoomButton,
            pressed &&
              styles.zoomButtonPressed,
          ]}
          accessibilityLabel="Zoom In"
        >
          <Text
            style={
              styles.zoomButtonText
            }
          >
            +
          </Text>
        </Pressable>

        <View
          style={
            styles.zoomDivider
          }
        />

        <Pressable
          onPress={
            handleZoomOut
          }
          style={({
            pressed,
          }) => [
            styles.zoomButton,
            pressed &&
              styles.zoomButtonPressed,
          ]}
          accessibilityLabel="Zoom Out"
        >
          <Text
            style={
              styles.zoomButtonText
            }
          >
            −
          </Text>
        </Pressable>
      </View>

      {/* ===================================================
          RECENTER
          =================================================== */}

      <Pressable
        onPress={recenter}
        style={({
          pressed,
        }) => [
          styles.recenterBtn,
          pressed &&
            styles.recenterBtnPressed,
        ]}
        accessibilityLabel="Re-center map"
      >
        <Text
          style={
            styles.recenterIcon
          }
        >
          🎯
        </Text>
      </Pressable>
    </View>
  );

  // =========================================================
  // WebView message handler
  // =========================================================

  function handleWebViewMessage(
    event: any
  ) {
    try {
      const data =
        JSON.parse(
          event.nativeEvent.data
        );

      if (
        data.type ===
        "MAP_READY"
      ) {
        syncMapCenter();

        // Immediately push whatever backend data
        // we currently have. Initially this is [].
        sendMapMessage({
          type: "SET_VEHICLES",
          vehicles: nearbyVehicles.map(
            (vehicle, index) => {
              const position =
                getVehicleCoordinates(
                  vehicle
                );

              if (!position) {
                return null;
              }

              return {
                id:
                  vehicle.id ??
                  vehicle.driver_id ??
                  vehicle.user_id ??
                  `vehicle-${index}`,

                lat:
                  position.latitude,

                lon:
                  position.longitude,

                title:
                  vehicle.full_name ||
                  vehicle.name ||
                  "Nearby Driver",

                vehicleType:
                  vehicle.vehicle_type ||
                  vehicle.vehicleType ||
                  "vehicle",

                distanceKm:
                  typeof vehicle.distance_km ===
                  "number"
                    ? vehicle.distance_km
                    : typeof vehicle.distance ===
                      "number"
                    ? vehicle.distance
                    : null,

                etaMinutes:
                  typeof vehicle.eta_minutes ===
                  "number"
                    ? vehicle.eta_minutes
                    : typeof vehicle.eta ===
                      "number"
                    ? vehicle.eta
                    : null,
              };
            }
          ).filter(Boolean),
        });
      }
    } catch {}
  }
}

const styles = StyleSheet.create({
  container: {
    height: 220,
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    position: "relative",
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },

  mapContainer: {
    flex: 1,
    backgroundColor:
      "transparent",
  },

  map: {
    flex: 1,
    backgroundColor:
      "transparent",
    opacity: 0.99,
  },

  statusPill: {
    position: "absolute",
    top: 12,
    left: 12,

    maxWidth: "78%",

    flexDirection: "row",
    alignItems: "center",

    gap: 8,

    backgroundColor:
      "rgba(255,255,255,0.95)",

    paddingHorizontal: 12,
    paddingVertical: 6,

    borderRadius: 20,

    borderWidth: 1,
    borderColor:
      "rgba(203,213,225,0.8)",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,

    zIndex: 10,
  },

  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1E293B",
    flexShrink: 1,
  },

  recenterBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,

    width: 42,
    height: 42,
    borderRadius: 21,

    backgroundColor: "#FFFFFF",

    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,

    borderWidth: 1,
    borderColor: "#CBD5E1",

    zIndex: 10,
  },

  recenterBtnPressed: {
    backgroundColor: "#F1F5F9",
    transform: [
      {
        scale: 0.94,
      },
    ],
  },

  recenterIcon: {
    fontSize: 20,
  },

  zoomControls: {
    position: "absolute",
    right: 12,
    top: 55,

    backgroundColor:
      "rgba(255,255,255,0.95)",

    borderRadius: 12,

    borderWidth: 1,
    borderColor: "#CBD5E1",

    elevation: 4,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,

    overflow: "hidden",

    zIndex: 10,
  },

  zoomButton: {
    width: 38,
    height: 38,

    justifyContent: "center",
    alignItems: "center",

    backgroundColor:
      "#FFFFFF",
  },

  zoomButtonPressed: {
    backgroundColor:
      "#EFF6FF",
  },

  zoomButtonText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E3A8A",
    lineHeight: 24,
  },

  zoomDivider: {
    height: 1,
    backgroundColor:
      "#E2E8F0",
  },
});