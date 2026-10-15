import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { StyleSheet, View } from "react-native";
import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map,
  type MapRef,
  Marker,
  type StyleSpecification,
} from "@maplibre/maplibre-react-native";
import type { Coordinate } from "../services/routing";
import {
  MAPTILER_STYLE_URL,
  NAV_CAMERA,
  OSM_RASTER_TILES,
  toLngLat,
} from "../services/mapStyle";

export type SyncroGoMarker = {
  id: string;
  coordinate: Coordinate;
  /** React node rendered in the marker (badge, pin, vehicle, etc). */
  children: React.ReactNode;
};

export type SyncroGoMapHandle = {
  /** Fly the camera to a point; when nav=true uses the 3D navigation pose. */
  animateTo: (center: Coordinate, opts?: { nav?: boolean; zoom?: number; duration?: number }) => void;
  /** Fit every given coordinate with padding. */
  fitBounds: (coords: Coordinate[], padding?: number) => void;
};

export type SyncroGoMapProps = {
  initialCenter: Coordinate;
  initialZoom?: number;
  routeCoordinates?: Coordinate[];
  routeColor?: string;
  markers?: SyncroGoMarker[];
  /** When true the map is in active-navigation mode (3D pitch). */
  navigationMode?: boolean;
  onPanStart?: () => void;
  height?: number;
};

/**
 * OpenStreetMap raster style used when no production style provider is
 * configured (no MapTiler key). Zero-account fallback, ODbL attribution
 * applies — surfaced via the native attribution ornament.
 */
const OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: [OSM_RASTER_TILES],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [{ id: "osm-tiles", type: "raster", source: "osm" }],
};

function boundsOf(
  coords: Coordinate[]
): [number, number, number, number] | null {
  let minLat = Infinity, minLon = Infinity, maxLat = -Infinity, maxLon = -Infinity;
  for (const c of coords) {
    if (!Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) continue;
    minLat = Math.min(minLat, c.latitude);
    maxLat = Math.max(maxLat, c.latitude);
    minLon = Math.min(minLon, c.longitude);
    maxLon = Math.max(maxLon, c.longitude);
  }
  if (!Number.isFinite(minLat)) return null;
  // [west, south, east, north]
  return [minLon, minLat, maxLon, maxLat];
}

export const SyncroGoMap = forwardRef<SyncroGoMapHandle, SyncroGoMapProps>(
  function SyncroGoMap(
    {
      initialCenter,
      initialZoom = 13,
      routeCoordinates = [],
      routeColor = "#2563EB",
      markers = [],
      navigationMode = false,
      onPanStart,
      height = 360,
    },
    ref
  ) {
    const cameraRef = useRef<CameraRef | null>(null);
    const mapRef = useRef<MapRef | null>(null);

    const initialLngLat = useMemo(
      () => toLngLat(initialCenter),
      // Read only on first render, matching the old initialRegion behaviour.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );

    const mapStyle = MAPTILER_STYLE_URL ?? OSM_RASTER_STYLE;
    const baseLayerId = MAPTILER_STYLE_URL ? null : "osm-tiles";

    const routeGeoJSON = useMemo(() => {
      if (routeCoordinates.length < 2) return null;
      return {
        type: "FeatureCollection" as const,
        features: [
          {
            type: "Feature" as const,
            properties: {},
            geometry: {
              type: "LineString" as const,
              coordinates: routeCoordinates.map(toLngLat),
            },
          },
        ],
      };
    }, [routeCoordinates]);

    useImperativeHandle(ref, () => ({
      animateTo: (center, opts) => {
        const nav = opts?.nav ?? false;
        const camera = cameraRef.current;
        if (!camera) return;
        camera.easeTo({
          center: toLngLat(center),
          zoom: opts?.zoom ?? (nav ? NAV_CAMERA.zoom : 15),
          pitch: nav ? NAV_CAMERA.pitch : 0,
          padding: nav
            ? { top: 0, bottom: NAV_CAMERA.paddingY, left: 0, right: 0 }
            : undefined,
          duration: opts?.duration ?? (nav ? 600 : 400),
        });
      },
      fitBounds: (coords, padding = 60) => {
        const b = boundsOf(coords);
        const camera = cameraRef.current;
        if (!b || !camera) return;
        camera.fitBounds(b, {
          padding: {
            top: padding,
            bottom: padding,
            left: padding,
            right: padding,
          },
          duration: 300,
        });
      },
    }));

    return (
      <View style={[styles.container, { height }]}>
        <Map
          ref={mapRef}
          style={styles.map}
          mapStyle={mapStyle}
          compass={false}
          logo={false}
          attribution={true}
          touchRotate={false}
          touchPitch={navigationMode}
          onRegionWillChange={(e) => {
            if (e.nativeEvent.userInteraction) onPanStart?.();
          }}
        >
          {routeGeoJSON && (
            <GeoJSONSource id="syncrogo-route-src" data={routeGeoJSON}>
              <Layer
                id="syncrogo-route-casing"
                type="line"
                source="syncrogo-route-src"
                afterId={baseLayerId ?? undefined}
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{
                  "line-color": "#FFFFFF",
                  "line-width": 7,
                }}
              />
              <Layer
                id="syncrogo-route-line"
                type="line"
                source="syncrogo-route-src"
                afterId="syncrogo-route-casing"
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{
                  "line-color": routeColor,
                  "line-width": 5,
                }}
              />
            </GeoJSONSource>
          )}

          <Camera
            ref={cameraRef}
            initialViewState={{
              center: initialLngLat,
              zoom: initialZoom,
              pitch: navigationMode ? NAV_CAMERA.pitch : 0,
            }}
          />

          {markers.map((m) => (
            <Marker key={m.id} id={m.id} lngLat={toLngLat(m.coordinate)}>
              {m.children as React.ReactElement}
            </Marker>
          ))}
        </Map>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    position: "relative",
  },
  map: { ...StyleSheet.absoluteFillObject },
});
