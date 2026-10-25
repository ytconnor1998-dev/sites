# DART — product spec

Source: written by the DART founder. This is the reference for everything built in `dart/`.

## Why DART exists

Dart was created to solve a simple problem: sometimes you need to get something across the city, but you don't have a car, the time, or an easy way to do it. Maybe you just moved to Rome and don't know how to get heavy items home. Maybe you spotted a great deal on Facebook Marketplace, but the seller lives on the other side of the city. Or maybe your business needs to send documents, supplies, or products quickly to another location.

That's where Dart comes in. We're building a local delivery network that helps individuals and businesses move things easily, without the hassle of traditional couriers. From second-hand finds to shop purchases to business-to-business deliveries, Dart makes it possible to get what you need, when you need it, without the stress.

## Platform

1. Customer app (individuals and businesses share one app and account)
2. Courier app
3. Website (same customer features, no app needed)
4. Business features (optional, activated in account settings)
5. Subscription system (optional monthly delivery plans for businesses)
6. Admin portal
7. Delivery, pricing and payment system
8. Messenger (per delivery, customer ↔ assigned courier)
9. Invoice and billing system (invoices for every customer)

## Customer app

- Register / log in: email and password, Google, existing DART account. Optional choice of individual or business at sign-up; can change later.
- Settings: name, email, password, phone, saved addresses, payment methods, notifications, delivery history, invoices, preferences, activate business features, business info, view / subscribe / manage / cancel business plans.
- Home: new delivery, active and previous deliveries, tracking, messenger, notifications, invoices, settings, business features.
- Create a delivery: pickup address, delivery address, item type, pictures, measurements, weight, instructions, price review, confirm, pay or choose billing option.
- Item types: letters, documents, small / medium / large / heavy parcels, furniture, other permitted items.
- Pictures + measurements (L, W, H, weight, number of items, description) are used to estimate the parcel category, vehicle needed, special handling, suitability and price. Customer reviews the classification before confirming; the system asks for more info when unsure.
- Furniture and large items: chairs, tables, desks, sofas, beds, mattresses, cabinets, wardrobes, shelving, large packages. May need larger vehicles, extra handling, multiple couriers, special instructions, extra fees. Customer sees whether the item is suitable before booking.
- Pricing: distance-based with a minimum fee, plus size, weight, number of items, furniture class, vehicle, handling, optional services and other admin-set fees. Price and breakdown shown before confirming.
- Tracking statuses: requested, awaiting courier, courier assigned, travelling to pickup, arrived at pickup, item collected, in transit, travelling to destination, delivered, cancelled, delivery issue. Notifications on important changes.
- Messenger tied to each delivery, only for that customer and courier: text, pictures, history, new-message notifications. Admins can investigate reported conversations.
- History: all previous deliveries with details, price, payment status, invoice, proof of delivery; repeat a previous delivery.
- Invoices for every customer (deliveries, extra charges, subscriptions): view, download, number, customer and delivery info, breakdown, taxes, payment status, dates, reference.

## Courier app

- Register: email/password or social login; name, contact, address, profile, vehicle, registration details, documents, verification, payout details. Must complete before accepting deliveries.
- Vehicles (admin-configurable): bicycle, motorcycle, scooter, small car, standard car, van, large van, cargo van, others. Details: type, model, registration, capacity, dimensions, max parcel size, max weight, loading space, documents.
- The registered vehicle decides which deliveries a courier can receive (dimensions, weight, number of items, furniture, capacity, handling). Never offer deliveries beyond capacity.
- Dashboard: online/offline, requests, assigned and active deliveries, history, earnings, notifications, messenger, settings, vehicle.
- Requests show pickup, destination, distance, item type, size, weight, furniture info, instructions, estimated earnings, handling. Accept or reject.
- Delivery steps: accept, navigate to pickup, confirm arrival, confirm collection, update status, navigate to destination, confirm arrival, complete, upload proof, report problems.
- Messenger with the customer once assigned.
- Earnings: completed deliveries, earnings, history, pending and paid, references, payment history.
- Vehicle management: view, update, upload documents, request changes, update capacity, approval status (changes may need admin approval).

## Website

Public pages (home, about, how it works, services, parcel and furniture info, pricing, courier and customer registration, login, contact, help, terms, privacy) plus the full customer experience: same account as the app, booking with the same pricing and classification, dashboard, messenger, invoices, payment history, settings, saved addresses, business and subscription settings.

## Business features and subscriptions

- No separate business app or account. Activate during registration or later in Settings → Business account; enter business name, address, contact, email, ID / VAT details, billing and invoice details.
- Business delivery management and bulk deliveries (multiple requests, CSV / Excel import, multiple recipients, tracking), which can be included in selected plans.
- Optional monthly plans with a delivery allowance. Plans, allowances, included delivery types, extra fees, renewal and cancellation rules are set by admins. Track allowance, used, remaining, renewal date, status, extra charges, invoices. Upgrade, downgrade, cancel. Non-subscribers pay per delivery.
- Extra charges (over allowance, large parcels, furniture, handling, special requirements) are shown before confirming.

## Admin portal

Dashboard (customers, couriers, active couriers, vehicles, active / completed / cancelled deliveries, delivery and subscription revenue, outstanding payments, recent activity, issues); customer management (including business activation review); courier management and approval; vehicle management and eligibility; delivery management (photos, measurements, classification, courier, status, price, payment, invoice, issues, cancel); delivery assignment and matching rules; pricing administration (minimum fee, per km, distance rules, size, weight, furniture, large items, handling, vehicle, special, business and subscription charges) without code changes; distance configuration (minimum charge, per km, minimum billable distance, calculation method, category rates); parcel category configuration (max dimensions, weight, eligible vehicles, fees, handling, restrictions); furniture rules; business management; subscription plan administration; invoice administration; payment administration (payments, failed, outstanding, refunds, revenue); messenger administration limited to support and moderation; reports and analytics.

## Notifications and support

Customer, courier and admin notifications for every key event. Help section, FAQ, contact support, and issue reporting for deliveries, payments, couriers and customers, reviewed by admins.

## Standard flows

Delivery: account → log in → addresses → pictures → measurements → classification → vehicle → distance → price → review → confirm → pay → find eligible courier → courier accepts → customer gets courier info → messenger → collection → status updates → delivered → proof → completed → confirmation → invoice → history.

Business subscription: account → (individual, business or Google sign-up) → use DART normally → Settings → activate business → business info → plans appear → choose plan → pay → active → allowance → used on eligible deliveries → usage tracked → remaining shown → extra charges per rules → subscription invoice → manage or cancel.

## Revenue

Individual deliveries, business pay-per-delivery, business subscriptions, and extra charges for large, heavy, furniture, oversized, handling, over-allowance and other admin-configured services.
