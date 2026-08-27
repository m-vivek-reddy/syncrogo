# SyncroGo API Reference

## Service and authentication

The API is implemented with FastAPI. Run the backend and use its interactive contract at `/docs` (Swagger UI) or `/redoc`; it is the authoritative schema for request/response models. `GET /` returns service status and `GET /health` returns a health response.

Unless noted, protected endpoints require `Authorization: Bearer <access_token>`. Obtain a token with `POST /login` using OAuth2 form fields (`username` = email, `password`). JSON is used for normal request bodies.

## Endpoint groups

| Area | Endpoints |
| --- | --- |
| Authentication | `POST /login` |
| Users | `POST /api/v1/users/register`, `POST /api/v1/users/verify-otp`, `POST /api/v1/users/forgot-password`, `POST /api/v1/users/reset-password`, `GET /api/v1/users/me`, `GET /api/v1/users/{user_id}/rating`, `PUT /api/v1/users/change-password` |
| Rides | `POST /api/v1/rides/offer`, `PATCH /api/v1/rides/{ride_id}/price`, `GET /api/v1/rides/search`, `POST /api/v1/rides/{ride_id}/book`, `GET /api/v1/rides/driver/active`, `GET /api/v1/bookings/my-rides`, `GET /api/v1/trips/history` |
| Legacy rides/bookings | `POST /rides/offer`, `GET /rides/search`, `POST /rides/{ride_id}/book`, `GET /bookings/my-rides`, `GET /driver/bookings`, `DELETE /bookings/{booking_id}` |
| Booking trip flow | `POST /api/v1/bookings`, `GET /api/v1/bookings/mine`, `GET /api/v1/bookings/driver/mine`, `POST /api/v1/bookings/{booking_id}/accept`, `POST /api/v1/bookings/{booking_id}/cancel`, `GET /api/v1/bookings/{booking_id}/otp`, `POST /api/v1/bookings/{booking_id}/verify-otp`, `POST /api/v1/bookings/{booking_id}/driver-location`, `POST /api/v1/bookings/{booking_id}/passenger-location`, `GET /api/v1/bookings/{booking_id}/live`, `POST /api/v1/bookings/{booking_id}/complete` |
| Pricing | `POST /pricing/calculate` |
| Vehicles | `POST /vehicles/`, `GET /vehicles/me`, `PUT /vehicles/me` |
| Payments | `POST /payments/create-order` (completed booking only), `POST /payments/verify-payment`, `GET /api/v1/payments/methods`, `POST /api/v1/payments/methods` |
| Messaging | `POST /chat/send`, `GET /chat/history/{ride_id}`, `GET /chat/conversations` |
| Notifications | `POST /notifications/send`, `GET /notifications/user/{user_id}`, `PATCH /notifications/{notification_id}/read` |
| Trust & safety | `POST /api/v1/documents/`, `GET /identity/status`, `POST /identity/upload`, `POST /api/v1/ratings/`, `POST /emergency-contacts/`, `GET /emergency-contacts/`, `DELETE /emergency-contacts/{contact_id}` |
| SOS | `POST /api/v1/sos/trigger`, `GET /api/v1/sos/active-alerts`, `GET /api/v1/sos/{alert_id}`, `PUT /api/v1/sos/{alert_id}/resolve`, `GET /api/v1/sos/history/all` |
| Administration | `GET /admin/analytics`, `GET /admin/users`, `PATCH /admin/users/{target_user_id}/role`, `GET /admin/documents`, `PATCH /admin/documents/{document_id}`, `GET /admin/drivers` |

## Important request contracts

### Registration and verification

`POST /api/v1/users/register` accepts the `UserCreate` schema (account identity and password) and sends an email OTP. Submit the email and six-digit OTP to `POST /api/v1/users/verify-otp`. Password-reset initiation uses `{ "email": "..." }`; reset uses `{ "token": "...", "new_password": "..." }` and passwords must contain at least eight characters.

### Ride offer and pricing

`POST /api/v1/rides/offer` requires `pickup_location`, `pickup_lat`, `pickup_lon`, `dropoff_location`, `dropoff_lat`, `dropoff_lon`, `distance_km`, `vehicle_type`, `available_seats`, and `gender_preference`; `discount` is optional. Distance and seat count must be positive and discount cannot be negative. The server calculates fare fields rather than trusting a client-submitted price.

`POST /pricing/calculate` returns the fare breakdown. The configured rates are: bike — ₹25 base + ₹5/km + ₹5 platform fee, ₹30 minimum; car — ₹40 base + ₹8/km + ₹8 platform fee, ₹50 minimum. A ride price update cannot be below its minimum fare or above its MRP.

### Live trip and safety

Booking endpoints use a booking identifier. Location updates use the `LocationUpdate` schema, OTP verification uses the `VerifyOTP` schema, and access is constrained to the relevant trip participants. SOS alerts can be created, reviewed, resolved, and viewed in history; administration endpoints additionally require an authenticated user with `admin` role.

## Payment timing

Payment must be initiated and verified only after `POST /api/v1/bookings/{booking_id}/complete` has successfully completed the ride. `POST /payments/create-order` accepts only `booking_id`, derives the fare on the server, and is limited to the booking passenger. `POST /payments/verify-payment` requires `booking_id` and an idempotency key; it stores the provider payment and transitions the booking from `COMPLETED` to `PAID`. The client should not present payment as a pre-ride or in-progress-trip action.

## Vehicles and safety authorization

Drivers manage their vehicle through `POST /vehicles/`, `GET /vehicles/me`, and `PUT /vehicles/me`. SOS creation requires authentication and always uses the authenticated user's identity; only the alert owner or an administrator can view an alert, and only administrators can list or resolve alerts.

## Notes

There are overlapping versioned and legacy ride/booking routes in the current service. New clients should prefer the `/api/v1` endpoints where an equivalent exists. Verify precise body fields and response schemas against the running OpenAPI document before integration, since several route modules define their own Pydantic models.

## Canonical booking state machine

The booking status values are uppercase: `PENDING`, `ACCEPTED`, `STARTED`, `COMPLETED`, `PAID`, and `CANCELLED`. Valid transitions are `PENDING → ACCEPTED → STARTED → COMPLETED → PAID`, or cancellation from `PENDING` or `ACCEPTED`. The API must reject every other transition.
