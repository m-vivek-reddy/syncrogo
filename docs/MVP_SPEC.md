# SyncroGo MVP Specification

## Goal

Deliver an end-to-end shared-ride workflow for passengers and drivers, with practical safeguards and an administrative back office.

## Functional requirements

| Area | MVP behavior |
| --- | --- |
| Accounts | Email/password registration, email OTP verification, sign-in with bearer JWT, profile updates, password reset/change, and role selection. |
| Driver setup | Vehicle registration and editing through **My Vehicles**; online/location state for drivers. |
| Rides | Drivers publish a route, coordinates, vehicle type, seats, preference, distance, and optional discount. Passengers search rides and book seats. |
| Fare | Server-calculated price breakdown for bike and car rides, including base fare, per-km rate, platform fee, MRP, minimum fare, discount, and driver earnings. |
| Trip lifecycle | `PENDING → ACCEPTED → STARTED → COMPLETED → PAID`, plus `CANCELLED`; includes booking acceptance, generated trip OTP, live driver/passenger location updates, and post-completion payment. |
| Communication | Ride chat, conversation/history retrieval, and user notifications. |
| Trust & safety | Document/identity upload and status, emergency contacts, SOS creation/history/resolution, and ratings. |
| Payments | A checkout order can be created only by the passenger of a completed booking. Payment verification is idempotent, records the provider payment, credits the driver once, and changes the booking to `PAID`. |
| Administration | Analytics, user and driver listing, user-role changes, document review, and SOS monitoring. |

## Primary user flows

1. A new user registers, receives an email OTP, verifies the account, then signs in.
2. A driver registers a vehicle and publishes a priced ride offer.
3. A passenger searches by route, reviews price/seats, and creates a booking.
4. Driver and passenger coordinate through chat and location updates. The driver accepts the booking; the passenger supplies the ride OTP at pickup.
5. The ride is completed first. The passenger then makes payment and it is verified; participants can review history and submit ratings.
6. During a trip, either side can use SOS and administrators can review and resolve the alert.

## Non-functional baseline

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, React Router, Zustand, Leaflet, Axios, and Recharts.
- Backend: FastAPI, Pydantic, SQLAlchemy, Alembic, PostgreSQL-compatible `DATABASE_URL`, JWT authentication, and WebSockets.
- Security baseline: hashed passwords, bearer-token-protected routes, role checks for administration, participant-only chat/trip access, user-owned SOS alerts, and server-side price validation.

## Constraints and assumptions

The frontend is a web client and the backend requires environment configuration, including `DATABASE_URL`, `SECRET_KEY`, and email settings where outbound OTP/reset mail is needed. Maps/routing and payment-provider credentials must be configured for their respective integrations. API contracts are described in [API.md](API.md).

## MVP completion gate

SyncroGo is not considered MVP-complete until the canonical workflow has passed both success and failure tests: driver offer, passenger booking, driver acceptance, OTP-verified start, participant-only live tracking, completion, completed-booking checkout, verified payment, and `PAID` receipt. It must also reject self-booking, duplicate/full-seat booking, invalid state transitions, unauthorized location/chat access, pre-completion payment, and duplicate payment callbacks.
