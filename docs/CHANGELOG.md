# Changelog

All notable repository changes should be documented in this file. This project currently has no prior written release changelog, so the entries below establish the documentation baseline from the codebase.

## Unreleased

### Added

- Core SyncroGo documentation: product vision, MVP specification, API reference, roadmap, and this changelog.

### Changed

- Documented the product rule that payment is made and verified after ride completion.
- Consolidated active booking routes under `/api/v1/bookings` with `PENDING → ACCEPTED → STARTED → COMPLETED → PAID` and `CANCELLED` states.
- Added persistent idempotent payment records and completed-booking checkout handling.
- Added the My Vehicles screen and protected SOS, chat, and document-upload workflows.

### Current implementation

- FastAPI service with SQLAlchemy models and Alembic migrations.
- React/TypeScript/Vite frontend with passenger, driver, safety, profile, payment, and administrator screens.
- Authentication, OTP email verification, password recovery, JWT sessions, ride and booking flows, pricing, live tracking, messaging, ratings, notifications, SOS, documents, payment methods, emergency contacts, and administration endpoints.

## Historical repository commits

- `555ad16` — Update SyncroGo
- `11c0e37` — Remove venv from repository
- `59dc9ee` — Remove virtual environment from repository
- `24e9a6c` — Initial commit
