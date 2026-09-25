# SyncroGo — Complete End-to-End Workflow

Canonical product workflow for all five systems. Implementation work (ride + payment state machines) should be validated against this document.

## 1. Top-level flow

Landing page → Login / Sign Up → User Dashboard → **Find a Ride** or **Offer a Ride**.

## 2. Driver verification gate

"Offer a Ride" triggers a verification check first:

- ✅ Verified → proceed to Create Ride (starting point, destination, date, time, seats, pickup points, ride contribution) → Publish.
- ❌ Not verified → Verification page (exists but is NOT in main navigation). Upload documents (Identity, Driving Licence, Vehicle RC) → Submit → Pending → Admin review → Approved (✅ Verified, back to Offer a Ride) or Rejected (resubmit).

Profile always shows: 🛡️ Verification Status.

## 3. Passenger flow

Sign Up/Login → Find a Ride → enter From / To / Date / Time / Carpool or Bikepool → available rides → select driver (view profile, verification, rating, vehicle, pickup points, price) → Request/Book → Driver accepts → Booking confirmed → ride tracking/status → pickup → drop-off → payment → ⭐ rate driver → ride history.

## 4. Driver flow

Sign Up → Complete profile → Driver verification (Identity, Driving Licence, Vehicle RC) → Admin/provider review → ✅ Verified → Offer a Ride → enter route details → Publish → receive requests → accept passenger → ride starts → pickup passengers → drop-off → payment → completed → rating.

## 5. Ride state machine (authoritative)

Only these transitions are allowed:

```
PENDING → ACCEPTED → STARTED → COMPLETED → PAID
PENDING | ACCEPTED → CANCELLED
```

Pickup sequence inside STARTED: Pickup Point 1 → Pickup Point 2 → Pickup Point 3 → Drop-off.

## 6. Payment system

### UPI / digital (per-ride)

```
Ride contribution ₹120 + Platform fee ₹5 = Total ₹125 → [ Pay ₹125 ]
```

Passenger pays after drop-off via gateway (UPI/cards/netbanking/wallet — never store card numbers or CVV; the provider handles credentials).

```
Passenger pays → Payment held/recorded → Ride happens → Ride completed → Driver earnings credited → Driver withdraws
```

This escrow-style flow supports cancellations, refunds, and disputes. On success: Payment Successful screen with Booking ID `SG-XXXXXX`.

### Cash (daily settlement rule)

Passenger pays driver directly. SyncroGo fee (₹10 per cash ride) accumulates during the day (12:00 AM–11:59 PM) and is settled at end of day:

```
Cash Ride Fees
Today's outstanding: ₹30
Cash rides: 3
[ Pay ₹30 ]
```

- **Paid:** outstanding → ₹0, driver remains eligible, new ride assignments available.
- **Unpaid:** next day → 🔒 PAUSED new ride assignments with "Please clear your outstanding cash-ride fees." → [ Pay ] → 🔓 restored.
- **Rule:** never cancel or interrupt an already active ride for unpaid fees; restriction applies to NEW ride assignments only.

## 7. Admin workflow

Dashboard → Users · Drivers (status) · Documents (Pending / Verified / Rejected) · SOS (Active / Resolved) · Payments (Transactions, UPI, Cash, Pending, Completed, Refunded, Failed) · Reports · Settings.

Admin payment view columns: Transaction ID, Booking ID, Passenger, Driver, Amount, Platform fee, Payment status, Refund status, Date/time.

Priority monitoring: document review (approve/reject), payment settlements and driver outstanding fees, active SOS alerts with ride/driver/passenger info and resolution status.

## 8. Five systems

1. 🧑 User System — Login → Profile → Find Ride → Book → Ride → Rating
2. 🚗 Driver System — Verification → Offer Ride → Accept passengers → Complete ride
3. 🔄 Ride System — Matching → Requests → Acceptance → Pickup → Drop-off → Completion
4. 💳 Payment System — UPI/QR post-drop-off; cash fee accumulation → daily settlement → pause on unpaid
5. 🛡️ Safety/Admin System — Verification → SOS → Documents → Payments → Reports → User management

## 9. Implementation priority

Next technical milestone: **ride state machine + payment state machine** — these connect everything else. See ROADMAP.md "Next: MVP hardening".
