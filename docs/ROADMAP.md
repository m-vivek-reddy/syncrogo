# SyncroGo Roadmap

## Completed foundation

- React/Vite client and FastAPI/SQLAlchemy service structure.
- Registration, email OTP verification, JWT login, profile/password management.
- Driver vehicles, ride publishing/search, booking, OTP trip verification, tracking, chat, notifications, ratings, payments, documents, SOS, and admin views.
- Centralized bike/car fare calculation and database migrations for booking, rating, tracking, pricing, wallet, notification, SOS, payment method, and document data.

## Next: MVP hardening

- Complete migration of remaining legacy ride endpoints and clients to the versioned, documented public API. Booking endpoints are now consolidated under `/api/v1/bookings`.
- Deliver and test one complete core journey: driver publishes → passenger books → driver accepts → OTP starts the ride → location updates → driver completes → passenger pays → booking is `PAID`.
- Introduce a shared booking-status enum/state-transition service so only `PENDING → ACCEPTED → STARTED → COMPLETED → PAID` and `PENDING|ACCEPTED → CANCELLED` are possible.
- Replace raw ORM responses with Pydantic response schemas and shared frontend domain types for bookings, rides, payments, and users.
- Add database constraints and transactional seat reservation to prevent invalid fares/coordinates and concurrent overbooking.
- Expand automated backend and frontend tests from booking/payment regression coverage to authentication, pricing, authorization, and SOS access.
- Define validation rules and consistent status enums across the client and API.
- Add production configuration, secrets handling, structured logs, error monitoring, backups, and deployment documentation.
- Complete accessibility, responsive UX, loading/error states, and frontend API integration checks.

## Next: trust and operations

- Integrate a production identity/document-verification provider and reviewer audit trail.
- Establish SOS escalation policy, emergency-contact notifications, incident audit history, and privacy retention rules.
- Add payment-provider webhooks, idempotency, refunds, payout/reconciliation workflow, and receipts.
- Enhance admin permissions, search/filtering, moderation actions, and metrics.

## Later: scale and marketplace quality

- Route optimization, better matching/ranking, scheduled/repeating rides, waitlists, and incentives.
- Native mobile clients or installable PWA enhancements.
- Driver earnings/wallet improvements, promotions/coupons, localization, and accessibility refinements.
- Performance testing, observability dashboards, data retention tooling, and security review.
