import { useEffect, useState } from 'react';

/**
 * Detects the user's city from their browser location and resolves a
 * dynamic hero image for it.
 *
 * Chain: navigator.geolocation → Google Geocoding API (if a key is set via
 * VITE_GOOGLE_MAPS_API_KEY) → Nominatim fallback → static default.
 */
const GOOGLE_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

const HYDERABAD_IMAGE =
  'https://images.unsplash.com/photo-1713113930278-b3970e95702d?auto=format&fit=crop&w=1600&q=85';
const FALLBACK_IMAGE = HYDERABAD_IMAGE;

/** Curated Unsplash photo per city (id + code used for the hub label). */
const CITY_IMAGES: Record<string, string> = {
  hyderabad: HYDERABAD_IMAGE,
  bengaluru: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=85',
  bangalore: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=85',
  mumbai: 'https://images.unsplash.com/photo-1570168007204-dfb528f6881a?auto=format&fit=crop&w=1200&q=85',
  delhi: 'https://images.unsplash.com/photo-1587135941948-670b381f08ce?auto=format&fit=crop&w=1200&q=85',
  'new delhi': 'https://images.unsplash.com/photo-1587135941948-670b381f08ce?auto=format&fit=crop&w=1200&q=85',
  chennai: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=85',
  pune: 'https://images.unsplash.com/photo-1591117207239-788bf8de6c3b?auto=format&fit=crop&w=1200&q=85',
  kolkata: 'https://images.unsplash.com/photo-1561948955-570b270e7c36?auto=format&fit=crop&w=1200&q=85',
};

export interface UserCity {
  city: string;
  image: string;
  source: 'google' | 'nominatim' | 'default';
}

export function useUserCity(): UserCity {
  const [state, setState] = useState<UserCity>({
    city: 'Hyderabad',
    image: FALLBACK_IMAGE,
    source: 'default',
  });

  useEffect(() => {
    let cancelled = false;

    const apply = (city: string, image: string, source: UserCity['source']) => {
      if (cancelled) return;
      const key = city.toLowerCase().trim();
      const cityKey = key.includes('abdullapurmet') ? 'hyderabad' : key;
      setState({ city, image: CITY_IMAGES[cityKey] || FALLBACK_IMAGE, source });
    };

    if (!('geolocation' in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;
        try {
          if (GOOGLE_KEY) {
            // Preferred: Google Geocoding API (reverse geocoding).
            const res = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_KEY}`,
            );
            const data = await res.json();
            const comps: any[] = data.results?.[0]?.address_components ?? [];
            const locality =
              comps.find((c) => c.types.includes('locality'))?.long_name ||
              comps.find((c) => c.types.includes('administrative_area_level_2'))?.long_name ||
              comps.find((c) => c.types.includes('administrative_area_level_1'))?.long_name;
            if (locality) {
              apply(locality, '', 'google');
              return;
            }
          }
          // Fallback: Nominatim reverse geocoding (no key needed).
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=${latitude}&lon=${longitude}`,
          );
          const data = await res.json();
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.state_district ||
            data.address?.state;
          if (city) apply(city, '', 'nominatim');
        } catch {
          /* keep default */
        }
      },
      () => {
        /* permission denied — keep default */
      },
      { timeout: 8000, maximumAge: 600000 },
    );

    return () => { cancelled = true; };
  }, []);

  return state;
}

export default useUserCity;
