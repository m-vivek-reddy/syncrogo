import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  rating: number;
}

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isDriverMode: boolean;
  
  // 🗺️ Map & Routing State
  currentLocation: [number, number] | null;
  route: [number, number][] | null;
  
  // 📍 NEW: Draggable Pin State
  destinationLocation: [number, number] | null;
  
  login: (userData: User) => void;
  logout: () => void;
  toggleDriverMode: () => void;
  
  // 🗺️ Map Actions
  setCurrentLocation: (loc: [number, number]) => void;
  setRoute: (coords: [number, number][] | null) => void;
  clearRoute: () => void;
  
  // 📍 NEW: Draggable Pin Actions
  setDestinationLocation: (loc: [number, number] | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isAuthenticated: false,
  isDriverMode: false,
  
  currentLocation: null,
  route: null,
  destinationLocation: null, // <-- Starts as null

  login: (userData) => set({ user: userData, isAuthenticated: true }),
  logout: () => set({ 
    user: null, 
    isAuthenticated: false, 
    isDriverMode: false, 
    route: null, 
    destinationLocation: null 
  }),
  toggleDriverMode: () => set((state) => ({ isDriverMode: !state.isDriverMode })),
  
  setCurrentLocation: (loc) => set({ currentLocation: loc }),
  setRoute: (coords) => set({ route: coords }),
  clearRoute: () => set({ route: null }),
  setDestinationLocation: (loc) => set({ destinationLocation: loc }), // <-- Updates the pin
}));