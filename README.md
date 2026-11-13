# SmartStay · Auberge Le Philo — frontend

React frontend for the AI-Based Hostel Management System, rebuilt from the Figma prototype in
`../AI Hostel Management Prototype` with the same brand (green, gold and cream; EN/FR; FCFA).

## Run

```bash
npm install
npm run dev
```

Build with `npm run build`; type-check with `npm run typecheck`.

## Stack

Vite 6 · React 18 · TypeScript · Tailwind CSS 4 · Radix UI · cmdk · Recharts · Motion · date-fns.
Frontend only: all data is mock data in `src/data/seed.ts`, held in memory by `src/data/store.tsx`.
A full page reload resets it.

## Pages

| Area | Route | Highlights |
|---|---|---|
| Landing | `/` | Live availability search, ask-the-AI box, 2-night packages, experiences, events, getting there |
| Login / Register | `/login`, `/register` | Guest/staff login, SMS 2-step code for staff; guest sign-up with password strength meter, ID details, preferences and SMS/email verification |
| Dashboards | `/dashboard` | A separate view for each of the 6 roles, including the what-if forecast simulator |
| Reservations | `/reservations` | 14-day room timeline, list view, filters, detail drawer with AI room match, CSV export |
| Rooms | `/rooms` | Floor plan for floors 1–4, drag or tap to assign, 30-day heat map, 3D stack view |
| Guests | `/guests` | Directory with filters, profile drawer (stays, spend, loyalty, preferences, notes, messages, blacklist), ID reveal recorded in the audit log, walk-in registration, CSV export |
| Housekeeping | `/housekeeping` | Drag-and-drop status board (to clean → in progress → inspection → ready, plus maintenance), cleaner assignment, lost & found, linen stock, team performance |
| Billing | `/billing` | Printable invoices (PDF via print), charges, discounts and promo codes, split bill, deposits and refunds, simulated Airtel/Moov payments, reconciliation, tax settings |
| AI Forecasting | `/forecasting` | What-if simulator, demand heat map by room type, dynamic pricing recommendations, local events that update the forecast, staffing plan, overbooking alerts, accuracy tracking |
| Reports & BI | `/reports` | Occupancy, ADR, RevPAR and GOPPAR; revenue by day/week/month/year; channels; nationalities; length of stay; custom report builder; scheduled reports; AI executive summary |
| Assistant | `/assistant` | Guests: full-page chat (EN/FR). Staff: inbox for chats handed to a human, reply suggestions, test chat, FAQ knowledge base |
| Notifications | `/notifications` | Notification center, broadcast composer with WhatsApp preview and AI draft, automated messages, integration status; guests set their contact preferences here |
| Security & Access | `/security` | Staff accounts (create, change role, suspend), access requests, guest CSV import/export, editable permission matrix, audit log with filters and export, sessions, anomaly alerts, MFA and data-retention settings |

On every page:
- **⌘K / Ctrl+K**: command bar to search rooms, guests and bookings, run actions, or ask the AI.
- **⌘J / Ctrl+J**: Philo AI copilot panel, with insights for the current page, voice input and answer rating.
- A light/dark toggle, an EN/FR toggle, a notification bell, and a booking wizard.
- The avatar menu switches the demo role.

The sidebar follows the permission matrix in Security → Permissions: changing a cell changes what that role can open.
Every action (bookings, payments, discounts, ID reveals, permission changes…) is written to the audit log.

The AI gives scripted demo answers (`src/components/ai/brain.ts`), worked out from the live mock data. It makes no network calls.

## Values to confirm with the client

- Add-on prices for boat (20 000), quad (15 000) and late checkout (10 000) are placeholders. Transport
  (5 000) and buffet (10 000) come from Le Philo's flyers.
- The 10% tax rate comes from the prototype's invoices.
- The forecast model, its accuracy (94.3%) and the price elasticity (−0.9) are demo values.
- GOPPAR assumes operating costs of 58% of revenue (demo value).
- Promo codes (PHILO10, FIDELE15, TOMBOLA), staff names other than the prototype's, and linen stock levels are demo data.
