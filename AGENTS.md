# AGENTS.md

## Project

SyncroGo is a React Native / Expo carpooling application.

Mobile project:
C:\Users\ruthv\Desktop\SyncroGo\mobile

## Mobile Stack

- Expo SDK 54
- React Native
- TypeScript
- Expo Router
- react-native-maps
- react-native-webview
- Axios
- Zustand
- OSRM for road routing where already implemented

## General Rules

- Inspect existing code before modifying it.
- Reuse existing APIs, types, components and utilities.
- Do not create duplicate implementations unnecessarily.
- Do not modify unrelated screens.
- Do not break existing functionality.
- Provide complete replacement files when requested.
- Do not use mock data in production features.
- Do not hardcode real-world coordinates.
- Do not invent backend values.
- Do not invent ratings, fares, passenger counts or vehicle information.
- Use real backend/application state.

## Maps

- Reuse the existing map implementation where possible.
- Do not break src/components/LocationPickerMap.tsx.
- Use real GPS coordinates.
- Use OSRM if the project already uses OSRM.
- Do not introduce paid routing APIs unnecessarily.
- If coordinates are missing, skip the marker instead of inventing coordinates.
- If routing fails, keep valid markers visible and show an error.
- Never use fake fallback coordinates.

## Driver Route Rule

Passenger pickup locations must be on the driver's planned route
or within 300 meters of the driver's actual road route.

Never route the driver to a passenger's home or unrelated location.

Calculate the passenger pickup's distance from the actual road route.

If the pickup is more than 300 meters from the route:
- do not create an unnecessary detour
- do not invent another pickup coordinate
- do not silently replace the location
- show an appropriate warning

The driver's destination must remain the final destination.

## Driver Current Location

Keep these separate:

- Driver Pickup / Start
- Driver Current GPS Location
- Driver Destination

Never replace the driver's original pickup with the current GPS location.

If WebSocket/live location already exists, reuse it.

Clean up:
- WebSocket subscriptions
- GPS watchers
- polling
- timers

when the ride ends or screen unmounts.

## Passenger Management

Only show passengers actually associated with the ride.

Do not show:
- fake passengers
- cancelled passengers as active passengers
- unrelated users
- fake coordinates

Use the backend's actual booking status.

Passenger states must come from the existing backend implementation.

Do not invent new status names if existing ones already exist.

## Passenger Completion

Individual passenger completion is separate from overall ride completion.

Example:

Passenger 1 = COMPLETED
Passenger 2 = PICKED_UP
Passenger 3 = CONFIRMED

Driver Ride = STARTED

Completing one passenger must NOT complete the entire driver ride.

Reuse the existing backend completion/booking endpoint.

Do not fake completion using local state only.

## Driver Ride Completion

The driver must have a separate Complete Ride action.

Before completing:
- verify the real ride status
- use the existing backend endpoint
- show confirmation
- prevent duplicate requests
- show loading state

After successful completion:
- refresh backend data
- stop live tracking
- stop GPS watcher
- stop WebSocket
- stop ETA updates
- stop polling
- show completed state

Never pretend the ride is completed if the backend request fails.

## Performance

Avoid:
- setState during render
- effects that update their own dependencies
- continuous map fitting
- unnecessary route recalculation
- unnecessary full-screen rerenders

Use:
- useMemo
- useCallback
- useRef
- correctly scoped useEffect

Avoid Maximum update depth exceeded.

## Testing

After modifying code, test:

- 0 passengers
- 1 passenger
- 2 passengers
- 3+ passengers
- missing coordinates
- route API failure
- passenger pickup
- passenger completion
- multiple passenger completion
- driver ride completion
- completion API failure
- double-tap completion
- live driver location
- completed ride

## Important Files

Inspect these before changing map functionality:

mobile/src/components/LocationPickerMap.tsx

Also search for:
- ride types
- booking types
- driver ride screens
- passenger ride screens
- API clients
- WebSocket implementation
- GPS implementation
- OSRM implementation
- booking completion
- OTP verification
- ride completion