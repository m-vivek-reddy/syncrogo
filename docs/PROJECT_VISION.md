# SyncroGo — Project Vision

## Purpose

SyncroGo is a ride-sharing and carpool platform that helps passengers find rides and enables drivers to publish spare seats. The product is designed around a mobile-friendly experience with route-aware discovery, transparent fare calculation, live trip coordination, and safety controls.

## Product principles

- Make ride discovery and offering fast: a user can choose a route, review available rides, and request or publish a trip with minimal steps.
- Give both parties clarity: show route, seats, ride state, fare breakdown, notifications, and trip history.
- Treat safety as a core workflow: identity and document verification, emergency contacts, SOS alerts, ride OTP verification, and live location updates are first-class features.
- Support operations: admins can review users, drivers, documents, analytics, and active SOS alerts.

## Users

**Passengers** find, request, track, pay for after completion, and rate rides. **Drivers** register vehicles, publish rides, manage bookings, share trip location, and complete trips. **Administrators** oversee user roles, documents, drivers, operational metrics, and safety incidents.

## Current product scope

The codebase contains a React frontend and FastAPI backend backed by SQLAlchemy. Current capabilities include authentication with email OTP verification and password reset, vehicle management, versioned ride booking, centralized bike/car pricing, post-completion payments, chat, notifications, ratings, document upload, emergency contacts, SOS alerts, live-trip location updates, and an admin portal.

## Success criteria

The MVP succeeds when a verified user can register, set a role and vehicle where applicable, publish or discover a ride, coordinate during the trip, safely complete it with OTP confirmation, then pay and leave feedback—while administrators can intervene when verification or safety signals require it.
