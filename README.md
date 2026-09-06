# Remix of Rental Marketplace

📘 Real Estate — Listings & Booking Portal
(A property marketplace platform similar to Airbnb or Booking.com)

1. Goals & Scope
Goal:
To build a full-featured online marketplace where users can list, discover, and book rental properties — with admin moderation, secure payments, and communication tools.
MVP Scope Includes:
User registration/login (email, password, optional social login)
Roles: Admin, Host (property owner), Guest (renter)
Property listings with availability calendars
Search, filters, sorting, and map view
Dynamic pricing and seasonal rates
Secure bookings and payments (Stripe/PayPal/etc.)
Host dashboard (listings, bookings, payouts)
Guest dashboard (bookings, receipts)
Messaging between host & guest
Reviews after checkout
Admin dashboard for moderation, disputes, reports
Notifications (email/in-app)
Multilanguage & multicurrency support
2. Roles & Permissions

Role
Description
Key Permissions
Guest
User who browses and books listings
Search, view listings, book, pay, message host, leave reviews
Host
Property owner or manager
Create/manage listings, prices, calendars, bookings, messages, payouts
Admin
Platform operator
Moderate listings/users, handle payments & refunds, analytics, platform settings

3. Core User Flows
3.1 Guest Booking Flow
Search by location, date range, guest count, filters (price, type, amenities)
View results + map
View listing details (photos, description, amenities, reviews, price breakdown)
Choose property to book 
System validates availability/capacity → creates booking in pending_payment and temporarily locks dates
Complete payment via gateway
Receive confirmation + receipt
Message host, check-in instructions before arrival
Leave review after checkout
3.2 Host Listing Flow
Create listing via guided steps:
 Address → Property type → Photos → Amenities → Rules → Price → Availability → Preview → Publish
Manage calendar & pricing (special dates, min nights)
Review payouts & earnings
Communicate with guests
3.3 Admin Flow
Review new listings for approval
Manage users, disputes, cancellations
Adjust commission rates
Run reports: revenue, occupancy, reviews
Handle refunds or fraud
Edit site content (FAQ, policies)
4. Data Model (Lovable Cloud)
Users
id, role(user|host|admin), email, password_hash, first_name, last_name, phone, avatar_url, verified(bool), kyc_status(pending|verified|rejected), created_at
Host Profiles
user_id, about, payout_method(stripe_account_id/iban), default_currency, rating_avg, rating_count
Listings
id, host_user_id, status(draft|pending|approved|rejected|blocked), title, description_md, type(apartment|villa|room), address, lat, lng, city, country, timezone, base_price, currency, guests_max, bedrooms, beds, bathrooms, size_sqft, checkin_from, checkout_until, min_nights, max_nights, house_rules_md, cancellation_policy(flexible|moderate|strict), security_deposit, cleaning_fee, created_at, updated_at
Media
id, listing_id, url, type(photo|video|vr), is_cover, order_index
Bookings
id, listing_id, guest_user_id, status(pending_payment|confirmed|cancelled_guest|cancelled_host|completed), checkin_date, checkout_date, nights, guests, currency, price_breakdown_json(subtotal, fees, taxes, payout_host, commission_platform), payment_intent_id, cancellation_policy_snapshot, created_at
Transactions
id, booking_id, type(authorization|capture|refund|payout|fee), amount, currency, provider(stripe|paypal), status(pending|succeeded|failed), created_at
Messages
id, thread_id, from_user_id, to_user_id, body_html, attachments[], created_at
Reviews
id, booking_id, author_user_id, target_type(host|listing|guest), rating(1–5), text, is_public, created_at

5. Booking Lifecycle

Stage
Description
pending_payment
Waiting for payment confirmation
confirmed
Booking confirmed and paid
cancelled_guest / cancelled_host
Cancelled by either side
completed
Stay completed, review period starts

6. Price Calculation Logic
Base price * nights
+ cleaning_fee
+ taxes (if applicable)
+ platform_fee (guest side)
= total_guest_price

Host payout = subtotal - host_fee
Modifiers:
Seasonal prices
Weekend/holiday rates
Minimum nights



7. Cancellation Policies
Flexible: Full refund up to 1 day before check-in
Moderate: Full refund up to 5 days before
Strict: 50% refund up to 7 days before
Policy snapshot stored at booking time.
8. API Structure (MVP)
Public
GET /listings?q=&city=&checkin=&checkout=&guests=
GET /listings/:id
GET /listings/:id/calendar?month=YYYY-MM
Guest
 POST /bookings → creates booking in pending_payment and applies a short-lived inventory lock
POST /bookings/:id/pay → completes payment
GET /bookings?me=guest
POST /messages/:thread_id
Host
POST /listings / PATCH /listings/:id
POST /listings/:id/calendar-blocks
GET /bookings?me=host
POST /payout-accounts
Admin
GET /admin/moderation/listings
PATCH /admin/listings/:id
GET /admin/reports/revenue?from=&to=
POST /admin/refunds
9. Pages & UI
Public
Home (search + featured listings)
Search results (list + map)
Listing details
Login / Signup / Forgot password
Guest Dashboard
My Bookings (active/past)
Payments & receipts
Messages
Profile & settings
Host Dashboard
Listings (active, draft)
Bookings & calendar
Payouts
Inbox
Earnings reports
Admin Panel
Overview dashboard (KPIs)
Listings moderation
Users & reviews management
Transactions & refunds
Reports & analytics
10. Notifications
Email: booking confirmations, payment receipts, reminders, cancellations
In-app: new message, booking status, payout updates
11. Security
Payments via PCI-compliant providers (Stripe, PayPal)
JWT authentication
Rate limiting for spam protection
Tenant isolation (org_id scope)
GDPR compliance: data deletion/export
12. Performance & SEO
SSR/SSG for public pages
SEO-friendly URLs (/city/property-title)
JSON-LD schema for structured data
Optimized media (WebP, lazy load)
Lighthouse score ≥ 90
13. Reports & Analytics
Bookings by month/property
Revenue & commission reports
Occupancy rate per host/property
Cancellation rates
Review scores & response times
14. QA Checklist (Test Plan)
Guest:
Booking flow works end-to-end
Price matches breakdown
Cancellation refunds correct
Review available only after checkout
Host:
Listing creation validation
Calendar sync and date blocking
Instant confirmation occurs after successful payment; no approval step is displayed
Correct payout amounts
Admin:
Approvals reflect instantly
Refunds appear in transaction logs
Dispute resolution updates booking status
Non-functional:
100 RPS sustained search
<2 sec booking confirmation
Uptime target 99.9%


15. Acceptance Criteria
✅ Guests can find, book, and pay for a listing successfully
✅ Hosts can create and manage listings and see accurate payouts
✅ Admin can moderate listings and manage financial operations
✅ All email notifications and booking rules work correctly
✅ All transactions and balances are consistent with payment provider data
Userflow extended

1) Guest: Search → Book → Pay → Review
1.1 Swimlane (Guest ↔ System ↔ Host)
Guest opens Home / Search → sets location, dates, guests, filters.
System returns Results + Map with availability + price per night.
Guest opens Listing Detail → sees gallery, amenities, rules, Final price (nights × rate + fees + taxes).
Guest clicks Book now
System validates dates/capacity → creates booking in pending_payment and temporarily locks dates
Guest enters card → Pay.
System/PSP captures/authorizes → booking → confirmed; blocks calendar.
Host auto-notified; Guest sees booking in My Trips.
Before check-in: Host sends instructions via Messages.
After checkout: Guest can leave Reviews.
1.2 Key Screens (Design)
Search (header search, filter sheet, map toggle)
Results list + map (sticky filters, sort, price badges)
Listing detail (gallery, price breakdown, availability calendar, policies)
Checkout (guest info, payment)
Confirmation / Receipt
Messages (thread)
My Trips (active/past)
Write Review modal
1.3 API & Contracts (Dev)
GET /search?loc=&checkin=&checkout=&guests=&filters=...
GET /listings/:id
POST /bookings { listing_id, checkin, checkout, guests } → { booking_id, amount, status }
POST /bookings/:id/pay { payment_method_id } → { status: confirmed }
GET /bookings?me=guest
POST /reviews { booking_id, rating, text }


State rules
Booking lifecycle = pending_payment → confirmed → completed
On payment success: block dates in inventory.
Reviews allowed only if booking = completed.
1.4 Mermaid (Guest Happy Path)
flowchart LR
A[Search] --> B[Results + Map]
B --> C[Listing Detail]
C --> D{Book now}
D -- Instant --> E[Create booking: pending_payment]
E --> F[Pay]
F --> G{Payment OK?}
G -- Yes --> H[Confirm booking + Block calendar]
G -- No --> I[Payment error]
H --> J[Messages/Instructions]
J --> K[Stay]
K --> L[Leave Review]


2) Host: Create Listing → Manage Calendar → Handle Bookings → Payout
2.1 Swimlane
Host opens Host Dashboard → Create Listing (wizard).
Steps: Address/Geo → Basics → Amenities → Photos → Price → Availability → Policies → Preview → Submit.
System: listings.status = pending (await admin review).
Admin approves → approved → listing appears in search.
Host manages Calendar (blocks, seasonal prices, min nights).
Payout scheduled after check-in/check-out per policy.
2.2 Screens
Host Home / Listings table (status chips: draft/pending/approved)
Create Listing wizard (stepper)
Calendar & Pricing (range picker, overrides)
Payouts (history, upcoming)
Inbox (guest threads)
2.3 API
POST /listings PATCH /listings/:id
POST /listings/:id/media
POST /listings/:id/pricing-rules
POST /listings/:id/calendar-blocks
GET /bookings?me=host&status=
GET /payouts?me=host
State rules
Listing: draft → pending → approved|rejected|blocked


2.4 Mermaid (Host Listing Wizard)
flowchart TD
A[Start: Create Listing] --> B[Address & Geo]
B --> C[Basics & Capacity]
C --> D[Amenities]
D --> E[Photos/Media]
E --> F[Base Price & Fees]
F --> G[Availability & Min Nights]
G --> H[Policies & Rules]
H --> I[Preview]
I --> J[Submit for Review -> pending]
J --> K{Admin approves?}
K -- Yes --> L[approved -> visible]
K -- No --> M[rejected -> feedback]

3) Admin: Moderation → Disputes → Reports
3.1 Swimlane
Admin opens Moderation Queue (new listings, edits, flagged reviews).
Reviews content → Approve / Reject / Block.
Handles Disputes (cancellation refunds, damages) → creates refund transactions if needed.
Monitors Reports: GMV, take rate, occupancy, cancellations.
3.2 Screens
Admin Dashboard (KPI cards)
Moderation queue (filters, bulk actions)
Listing detail (diff view of edits)
Dispute detail (timeline, evidence, actions)
Reports (date filters, export)
3.3 API
GET /admin/moderation/listings
PATCH /admin/listings/:id { status }
POST /admin/refunds { booking_id, amount }
GET /admin/reports/revenue?from=&to=
GET /admin/reports/occupancy?from=&to=
State rules
Refund posts transactions.type=refund and adjusts booking financials.
Blocked listings hidden from search immediately.
3.4 Mermaid (Admin Moderation)
flowchart LR
A[Moderation Queue] --> B[Open Listing Review]
B --> C{Approve?}
C -- Approve --> D[Status: approved -> live]
C -- Reject --> E[Status: rejected + feedback]
C -- Block --> F[Status: blocked + reason]
4) System: Pricing & Availability
4.1 Swimlane
Guest selects dates, number of people
System checks inventory (blocked ranges, existing bookings).
Load base price + apply pricing rules (seasonal/weekend).
Add fees (cleaning/platform) + taxes → final.
Show price breakdown; on booking, lock dates.
4.2 API
GET /listings/:id/calendar?month=YYYY-MM
GET /listings/:id/pricing?checkin=&checkout=
POST /bookings (re-validates inventory)
Rules
Atomic lock on booking create (prevent race conditions).
Price snapshot stored in booking.price_breakdown_json.
4.3 Mermaid
flowchart LR
A[Dates Selected] --> B[Check Inventory]
B --> C[Compute Base Price]
C --> D[Apply Pricing Rules]
D --> E[Add Fees & Taxes]
E --> F[Show Final Price]
F --> G[Create Booking -> Lock Dates]

5) Payments & Payouts
5.1 Swimlane
Guest pays at checkout; PSP returns authorization/capture.
System writes transactions and sets booking confirmed.
After check-in/out per policy, schedule payout to host’s account.
Handle refunds per cancellation policy; write negative transaction.
5.2 API
POST /bookings/:id/pay { payment_method_id }
POST /payouts/create { booking_id }
POST /refunds { booking_id, amount }
Rules
PCI: cards handled by PSP only.
Idempotency keys on payment and refund routes.
Payout delay window configurable (e.g., T+24h after check-in).
5.3 Mermaid
Sequence Diagram
  participant G as Guest
  participant S as System
  participant P as PSP
  participant H as Host

  G->>S: Pay booking
  S->>P: Create payment intent
  P-->>S: Succeeded
  S->>S: booking=confirmed; write transaction
  S-->>H: Notify upcoming payout
  Note over S,H: After stay completes
  S->>H: Initiate payout
  S->>S: payout transaction recorded


6) Cancellations & Refunds
6.1 Flow
Guest/Host triggers cancellation → System reads booking.cancellation_policy_snapshot + cutoff times → calculates refund.
Creates refund transaction and updates booking status.
6.2 API
POST /bookings/:id/cancel { actor: guest|host }
POST /refunds { booking_id, amount }
Rules
Policies: Flexible / Moderate / Strict.
Fees may be non-refundable; snapshot ensures fairness.


6.3 Mermaid
flowchart TD
A[Cancel Request] --> B[Load Policy Snapshot]
B --> C{Within Free Window?}
C -- Yes --> D[Full refund]
C -- No --> E[Partial per rules]
D --> F[Create refund tx + update status]
E --> F
7) Messaging & Reviews
7.1 Messaging
Thread per guest↔host (listing or booking scoped).
Attachments allowed (images/pdf).
Notifications: in-app + email.
API
POST /threads (on first contact)
POST /messages { thread_id, body_html, attachments[] }
GET /threads?me=current
7.2 Reviews
Available when booking = completed; one per party.
1–5 stars + text; edit window (e.g., 48h).
API
POST /reviews { booking_id, rating, text }
GET /reviews?listing_id=
8) Edge Cases (Design + Dev)
Double booking race: lock on booking create; show “just booked” toast if conflict.
Min nights: enforce per listing and per override.
Max guests: reject at search and booking.
Currency: show user currency, store base listing currency; snapshot both.
KYC for hosts: block payouts until verified.
Blocked dates: manual host blocks and iCal (v1.5).
Accessibility: keyboard support, alt text, contrast ≥ 4.5:1.
......
above are project specs.
and take attached image as in inspiration for design
and these are my questions to product owner:
Hi! I’ve skimmed through the docs and here are my findings along with a few quick clarifications needed regarding no third-party integrations on loveable.dev:
Payments: Since Stripe/PayPal can’t be used, do you want a fully simulated payment flow for MVP? And how should host payouts work—manual or automated internally?
Maps: Interactive maps usually need third-party APIs. Can we relax the no-third-party rule just for maps, or do you prefer static map images or a simple list without maps?
Email Notifications: Sending emails typically requires external SMTP services. Do you have an existing provider, or should we do in-platform simulation or other notification methods for now?
Localization & Currency: What languages and currencies do you want at launch? Should currency conversion be static/manual or dynamic?
Calendar Sync (iCal): Is external calendar syncing mandatory for MVP, or can calendar management be fully internal?
Thanks! Once I have your input, we can plan accordingly.
....
and this is her response:
Your questions are good and very much reasonable. Since no API are possible to be added, we will have to create the template with all these buttons, but without real connection to API, once we have the permission-we will add them.
It's relevant to: 
Payment, however we can use pay at the property feature now.
Maps can be just static by now
email notification- will be only in app (I know it's not user-friendly, but there is nothing we can do 😔)
Localization and currency, we aimed to the US market, so it should be English and USD, however, we should think about each host (property owner) to be able to set his currency
Calendar sync can be fully internal.
Thank you 🌸
............
this is project name: Real Estate — Listings & Booking Portal
Start building on it
also let me if there is any thing you need before start or if something should be asked.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a7b68a66-fbe8-4597-bad2-cd1e629f4db4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
