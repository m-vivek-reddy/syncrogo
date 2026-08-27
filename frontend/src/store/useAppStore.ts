import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  rating: number;
  role: string;
  profile_photo_url?: string;
}

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isDriverMode: boolean;

  // 🗺️ Map & Routing State
  currentLocation: [number, number] | null;
  route: [number, number][] | null;

  // 📍 Search & booking state
  pickupLocation: [number, number] | null;
  pickupLabel: string;
  destinationLocation: [number, number] | null;
  destinationLabel: string;

  login: (userData: User) => void;
  logout: () => void;
  toggleDriverMode: () => void;
  setDriverMode: (value: boolean) => void;

  // 🗺️ Map Actions
  setCurrentLocation: (loc: [number, number]) => void;
  setRoute: (coords: [number, number][] | null) => void;
  clearRoute: () => void;

  // 📍 Search & pin actions
  setPickupLocation: (loc: [number, number] | null, label?: string) => void;
  setDestinationLocation: (loc: [number, number] | null, label?: string) => void;
}

const getInitialDriverMode = (): boolean => {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem('isDriverMode') === 'true';
};

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isAuthenticated: false,
  isDriverMode: getInitialDriverMode(),

  currentLocation: null,
  route: null,
  pickupLocation: null,
  pickupLabel: '',
  destinationLocation: null,
  destinationLabel: '',

  login: (userData) => set({ user: userData, isAuthenticated: true }),
  logout: () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('syncrogo_token');
      localStorage.removeItem('token');
      localStorage.removeItem('verify_email');
      localStorage.removeItem('isDriverMode');
    }
    set({
      user: null,
      isAuthenticated: false,
      isDriverMode: false,
      route: null,
      pickupLocation: null,
      pickupLabel: '',
      destinationLocation: null,
      destinationLabel: ''
    });
  },
  toggleDriverMode: () =>
    set((state) => {
      const next = !state.isDriverMode;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('isDriverMode', String(next));
      }
      return { isDriverMode: next };
    }),
  setDriverMode: (value) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('isDriverMode', String(value));
    }
    set({ isDriverMode: value });
  },

  setCurrentLocation: (loc) => set({ currentLocation: loc }),
  setRoute: (coords) => set({ route: coords }),
  clearRoute: () => set({ route: null }),
  setPickupLocation: (loc, label = '') => set({ pickupLocation: loc, pickupLabel: label }),
  setDestinationLocation: (loc, label = '') => set({ destinationLocation: loc, destinationLabel: label }),
}));
