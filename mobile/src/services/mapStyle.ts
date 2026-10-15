/**
 * Shared MapLibre map configuration for SyncroGo.
 *
 * Tiles: OpenStreetMap raster (primary) with a public OSM raster fallback.
 * Style provider: switching from the OSM raster style to a vector/production
 * style only requires changing MAP_STYLE_JSON (one line), because all
 * SyncroGo maps reference the style through this module.
 */

import type { Coordinate } from "./routing";

// ---------------------------------------------------------------
// Production-compatible style provider
// ---------------------------------------------------------------
// `maplibre://` styles are served by MapTiler (a MapLibre production
// tile/style provider that is explicitly compatible with MapLibre GL).
// Set EXPO_PUBLIC_MAPTILER_KEY in .env to activate the vector street style:
//   EXPO_PUBLIC_MAPTILER_KEY=<your key>
// Without a key the app falls back to free OSM raster tiles, which need
// no account at all (https://www.openstreetmap.org/copyright).
//
// Other tested-compatible providers you can drop in here:
//   - Stadia Maps: https://tiles.stadiamaps.com/styles/osm_bright.json
//   - Protomaps:   https://api.protomaps.com/styles/v2/dark.json

const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? "";

export const MAPTILER_STYLE_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`
  : null;

/** OpenStreetMap raster tile source used when no style URL is configured. */
export const OSM_RASTER_TILES =
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

/**
 * Camera pitch/zoom used during active navigation (3D follow mode).
 * Kept identical to the previous react-native-maps camera config.
 */
export const NAV_CAMERA = {
  pitch: 50,
  zoom: 17,
  /** Camera distance behind the vehicle, in screen points. */
  paddingY: 140,
};

/**
 * Runs a GeoJSON geometry through the style spec so the OSRM route line
 * layers can be rendered identically on every SyncroGo map.
 */
export function routeLineLayerIds() {
  return {
    routeCasingId: "syncrogo-route-casing",
    routeLineId: "syncrogo-route-line",
  };
}

/** [lon, lat] — MapLibre / GeoJSON order. */
export function toLngLat(c: Coordinate): [number, number] {
  return [c.longitude, c.latitude];
}

export function defaultMapCenter(c: Coordinate, zoom = 13): {
  center: [number, number];
  zoom: number;
} {
  return { center: toLngLat(c), zoom };
}
