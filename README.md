# QueueLess — Public Service, Fast Forward

A comprehensive, production-ready multi-branch appointment booking system with seamless external system integration, stress-handling architecture, and enterprise-grade reliability.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS (code-split, 42 chunks) |
| Backend | Node.js + Express.js + Mongoose + Joi validation |
| Database | MongoDB (14 models, compound indexes, geospatial, TTL indexes) |
| Auth | JWT + Email/Mobile OTP + Password Reset + Password policy (uppercase + number) |
| Docs | Swagger/OpenAPI 3.0 at `/api/docs` (70+ endpoints documented) |
| Logging | Winston (structured, file + console, request IDs) |
| Email | Sender.net SMTP + configurable templates + connection pooling |
| PDF | PDFKit + QR codes |
| Cron | node-cron (automated reminders + auto no-show marking) |
| Webhooks | External event delivery with retry, auto-disable, and delivery logs |
| i18n | English + नेपाली (Nepali) |
| Deploy | Docker Compose + Nginx + CI/CD (GitHub Actions) |

## Quick Start

```bash
# Backend
cd backend && cp .env.example .env   # ← configure your settings
npm install && npm run seed && npm run dev

# Frontend (new terminal)
cd frontend && npm install && npm run dev
```

### Running tests

```bash
# Backend unit/integration (Vitest + mongodb-memory-server, hermetic — no real Mongo)
cd backend && npm test

# Frontend unit/component (Vitest + jsdom + @testing-library/react)
cd frontend && npm test
cd frontend && npm run typecheck

# Frontend end-to-end (Playwright + chromium)
cd frontend && npm run test:e2e:install   # one-time browser install
cd frontend && npm run build              # E2E runs against the production build
cd frontend && npm run test:e2e
```

**Coverage**
- Backend: 29 tests across utils (BS calendar, NP geo, holidays, SMS), models (atomic counters, audit hash chain, ApiToken), services (paymentService, retryQueue, issueService approval chain).
- Frontend: 21 tests across utility helpers, BS converter, the public navbar (logged-in vs logged-out branching), and the citizen sidebar drawer (open/close/links/role-aware sections/logout).
- E2E: 6 Playwright specs covering the home CTAs, navbar visibility states, service catalogue, ticket-tracking error path, transparency board, and the avatar-trigger → drawer flow.

The CI pipeline at `.github/workflows/ci.yml` runs `npm test` on both packages,
type-checks the frontend, and builds the production bundle on every push.

### Docker
```bash
docker-compose up -d --build
docker exec queueless-api node src/seeds/seed.js
# Frontend: http://localhost | API: http://localhost:5000 | Docs: http://localhost:5000/api/docs
```

### Vercel Deployment
The repository is fully configured for Vercel deployment (serverless backend and static frontend). 
Read the [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for a comprehensive setup tutorial, including multi-origin CORS, environment variable lists, and MongoDB Atlas configuration.

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@queueless.app | Admin@123 |
| IRD Org Admin | admin@ird.gov.np | Admin@123 |
| Branch Manager | ram@ird.gov.np | Staff@123 |
| Staff | sita@ird.gov.np | Staff@123 |
| Clinic Admin | admin@ktmmedical.com | Admin@123 |
| Citizen | bikash@gmail.com | User@123 |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | API server port |
| `NODE_ENV` | `development` | Environment mode |
| `MONGO_URI` | — | MongoDB connection string |
| `JWT_SECRET` | — | **Required**. Use `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_EXPIRES_IN` | `7d` | JWT token expiry |
| `SENDER_API_TOKEN` | — | Sender.net SMTP API token |
| `SENDER_FROM_EMAIL` | `noreply@queueless.app` | Email sender address |
| `FRONTEND_URL` | `http://localhost:5173` | Frontend URL for CORS and email links |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min default) |
| `RATE_LIMIT_MAX` | `500` | Max requests per window |
| `LOG_LEVEL` | `info` | Winston log level |
| `NO_SHOW_GRACE_MINUTES` | `30` | Grace period before marking no-show |
| `SMS_PROVIDER` | `console` | `console` (dev) / `sparrow` / `twilio` |
| `SPARROW_SMS_TOKEN`, `SPARROW_SMS_FROM` | — | Sparrow SMS credentials |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | — | Twilio credentials |
| `ESEWA_SECRET`, `ESEWA_CHECKOUT_URL` | — | eSewa HMAC + checkout endpoint |
| `KHALTI_SECRET`, `KHALTI_CHECKOUT_URL` | — | Khalti credentials |
| `IMEPAY_SECRET`, `IMEPAY_CHECKOUT_URL` | — | IME Pay credentials |
| `CONNECTIPS_SECRET`, `CONNECTIPS_CHECKOUT_URL` | — | ConnectIPS credentials |
| `PAYMENT_RETURN_URL` | `FRONTEND_URL` | Where gateways send the citizen back to |
| `NAGARIK_CLIENT_ID`, `NAGARIK_CLIENT_SECRET` | — | Nagarik App OAuth client (issued by DoNICR) |
| `NAGARIK_AUTH_URL`, `NAGARIK_TOKEN_URL`, `NAGARIK_USERINFO_URL`, `NAGARIK_REDIRECT_URI` | — | Nagarik OAuth endpoints |

## Roadmap (Nepal gov & enterprise readiness)
| Phase | Theme | Status |
|---|---|---|
| 1 | Foundations — BS calendar, service requirements/fees/docs, national ID profile, on-behalf submission, honeypot, service catalogue, दर्ता / file numbers | **shipped** |
| 2 | Gov-grade workflow — officer rank hierarchy, multi-step approval chain, token display board, QR check-in, SMS provider abstraction, Province/District vocabulary, BS holiday calendar | **shipped** |
| 3 | Payments & identity — provider-agnostic Payment model + webhook receiver (eSewa / Khalti / IME Pay / ConnectIPS), cash receipt counter, stamped PDF + BS dates, Nagarik App OAuth scaffold | **shipped** |
| 4 | Tenant self-service — public onboarding flow with super-admin review, hashed API tokens with per-token scopes + rate limits, organization logo upload | **shipped** |
| 5 | Scale & ops — in-process retry queue (Mongo-backed) for webhooks/email/SMS, super-admin tenant impersonation with audit trail, SLO dashboard endpoint | **shipped** |
| 6 | Compliance & accessibility — RTI public transparency board, citizen data export + anonymising erasure, tamper-evident audit hash chain | **shipped** |
| Cross | Configurability — feature-flag editor (16 toggles), bulk actions on tickets, admin charts, citizen profile dashboard widget | **shipped** |

## Complete Feature List

### Nepal-Government Fit (Phase 1)
QueueLess is built so any Nepali ministry, department, palika, or private institution can run it as their citizen-facing service portal.

- **Bikram Sambat (BS) calendar** — every appointment date is rendered alongside the AD date in both Roman and Devanagari numerals via a battle-tested converter (`nepali-date-converter`); fiscal-year scoped दर्ता numbers follow the official Shrawan→Ashadh year.
- **दर्ता / file numbers** — every appointment is auto-stamped with `BRANCH/FISCAL-YEAR/SEQ` (e.g. `IRD-10/2082-83/0123`). Citizens can track by either the दर्ता number or the internal refCode.
- **Service catalogue** — `/services` lists every bookable service across organizations with fee breakdown, eligibility, required documents, and processing time displayed up front.
- **Service-level transparency** — each `AppointmentType` carries `requiredDocuments[]`, `eligibility`, `feeBreakdown[]`, `processingTimeDays`, and bilingual `instructions`; surfaced in the booking wizard before slot selection.
- **National identity on user profile** — citizenship number + issued district, National ID, PAN, date of birth, gender, preferred language, and structured Province/District/Municipality/Ward/Tole address.
- **On-behalf submission** — staff at counters can book or file tickets for walk-in citizens; recorded with `bookedBy=staff`, `sourceChannel=in_person`, separable from self-service in analytics.
- **Anti-spam** — every public POST runs through a honeypot middleware (invisible field + form-render-to-submit timing) so bots are 204'd silently without affecting humans.
- **Closed-loop external integration** — query-param deep-links pre-fill citizen data, link bookings ⇄ tickets bidirectionally, and stamp `externalSubmissionNo` + `sourceSystem` for round-trip with originating gov portals.

### Dynamic Issue / Grievance / Ticketing System (DITMS)
A first-class ticketing layer that runs alongside appointment booking — citizens can raise tickets standalone, after an appointment, or be auto-routed into booking from a ticket that requires an office visit.

**Public flows**
- **Raise from landing page** — dedicated CTA + `/issue/submit` wizard.
- **Raise from an appointment** — every appointment detail page exposes "Raise related issue" which hydrates the ticket from the appointment (citizen, branch, contact info, link).
- **Raise standalone** — guest or signed-in. Required-fields enforced; logged-in users get name/email/phone pre-filled.
- **External-portal deep-links** — query-param pre-fill (`fullname`, `username`, `detail`, `subject`, `priority`, `org`, `issueTypeSlug`, `externalSubmissionNo`, `sourceSystem`).
- **Hybrid flow** — ticket categories flagged `requiresAppointment` route the citizen straight into `/book` after submission, and the resulting appointment is auto-linked back to the ticket.
- **Track by refCode** — public `/issue/track/:refCode` page with conversation thread, activity timeline, attachments, and linked appointments.
- **Reply, attach, reopen** — owners can post comments, attach more files, and reopen resolved/closed tickets.
- **My Tickets** — `/my-issues` page + Profile tab listing every ticket the signed-in user has raised.

**Staff / admin flows**
- **Admin Tickets dashboard** (`/admin/issues`) — counts, filters (status, priority, branch, category, free-text search), role-scoped listing.
- **Detail drawer** with full reporter info, conversation, internal notes, activity history, SLA banner.
- **Status changes** with reason / resolution note — including resolved → closed and reopen.
- **Forward** to another assignee, branch, or unit (reason mandatory).
- **Assign** to a specific staff member.
- **Comment / internal note** — internal notes are visible to staff only and stripped from the public tracking view.
- **Issue Categories admin tab** — create / edit / deactivate categories, set SLA hours, priority, slug, `requiresAppointment` flag, default branch.

**Workflow & integrity**
- **Statuses**: `open`, `in_progress`, `forwarded`, `escalated`, `awaiting_user`, `resolved`, `closed`, `reopened`.
- **SLA tracker** — every ticket gets a `slaDueDate` derived from the IssueType's SLA hours; an hourly cron promotes overdue active tickets to `escalated` with a system-authored history event.
- **Stuck-time** is computed per state transition and stored on the history event.
- **Bidirectional linking** — `/api/hybrid/link` keeps Issue ⇄ Appointment relationships in sync; merged timeline is exposed via `/api/hybrid/timeline/:type/:id`.
- **Attachments** — Multer-backed multipart upload on submission, replies, and "add more" — served from `/uploads/issues/`.
- **External closed-loop** — `externalSubmissionNo` + `sourceSystem` are stored on the ticket and surfaced in the tracking + admin UIs.

### Public Booking
- **5-step wizard**: Org → Branch → Service → Date/Slot → Confirm
- **Search & filter** on branches and services within the wizard
- **Nearest branch** recommendation via GPS geolocation
- **Guest booking** (no account required)
- **Confirmation page** with: ref code, token, clickable phone dialer, clickable email, Google Maps link, branch address
- **QR code PDF** download for every booking (scannable for status)
- **Ref code tracking** from homepage search
- **Calendar export** (iCal for Google/Outlook)
- **Post-appointment feedback** with 4 star dimensions (overall, staff, wait time, service)
- **Self-service reschedule** by citizens (date + slot picker)
- **Appointment lookup** by email or phone number
- **Multi-language** toggle: English / नेपाली
- **Dark mode** (system preference + manual toggle, persisted)
- **Accessible** (ARIA labels, skip-to-content, focus-visible, reduced-motion)

### Admin Panel

#### Dashboard (fully clickable/navigable)
- Stat cards (total, today, month, pending) → click navigates to filtered bookings
- Trend bars → click navigates to date-filtered bookings
- Status breakdown → click navigates to status-filtered bookings
- Branch stats → click navigates to branch-filtered bookings
- Analytics: completion rate, no-show rate, avg wait time, peak hour, revenue

#### Booking Management (slide-out detail panel)
- Full customer info: name, clickable email, clickable phone
- Service details, custom field values, notes, assigned staff
- Status workflow: Pending → Confirmed → Checked In → In Progress → Completed
- **Shift** appointment by N days (auto-finds slots on new date)
- **Reschedule** with date + slot picker modal
- **Bulk shift** all appointments on a date to next day
- **Bulk cancel** multiple appointments with reason
- **Bulk reschedule** appointments to new dates
- **Bulk status update** — change status for multiple appointments at once
- Cancel with reason (email notifications to both guests and registered users)
- PDF download, public view link
- Feedback display with admin reply

#### Service Types (with scope control)
- Super Admin: **"Apply to ALL Organizations"** toggle creates service across all orgs
- Org Admin: creates for own org
- **Branch scope**: "All branches" toggle or pick specific branches
- Duration, buffer time, price, mode (in-person/virtual/both)
- Custom fields builder (text, select, email, phone, date, textarea)
- Approval toggle, sort order, color
- **Suspend/Activate** service with reason

#### Branches (with break time)
- Working hours per day with **break time** (start/end) + clear button
- Holiday management with recurring support
- **Date overrides** (special hours for specific dates)
- Map coordinates (lat/lng) for geolocation
- Max concurrent bookings setting
- Province/district/city
- **Branch code resolver** for external integration

#### Staff Scheduling
- Per-staff weekly schedule (available days, hours, max appointments)
- **Date overrides** (vacation, sick leave, special hours)
- Recurring blockouts
- Branch assignment
- Staff specialization tags

#### Bulk Upload (with org/branch selection)
- Super Admin: **must select target organization** before upload
- Optional **default branch** assignment for user uploads
- Downloadable sample Excel templates
- Upload results with error details per row

#### Reports & Analytics
- Comprehensive analytics: no-show rate, peak hours, revenue trends
- Excel export with custom date ranges and filters
- CSV export

#### Feedback & Reviews
- Aggregate stats (avg rating, staff, wait, service ratings)
- Star breakdown (5/4/3/2/1 distribution)
- Admin reply functionality
- Per-branch filtering

#### Calendar View
- Week + month views
- Color-coded by service type
- Clickable events

#### Users & Staff
- CRUD with role assignment
- Organization + branch assignment
- Specializations and expertise tags
- Activation/deactivation

#### Webhooks
- Event-driven: `appointment.created`, `confirmed`, `cancelled`, `completed`, `checked_in`, `status_changed`, `no_show`, `rescheduled`, `feedback.created`, `user.created`
- Custom URL + secret + headers
- **Delivery logs** with response status, duration, and body
- **Auto-disable** after configurable max retries (default: 10)
- Test webhook endpoint

#### Notification Templates
- Per-organization configurable templates
- Template variables: `{{name}}`, `{{refCode}}`, `{{date}}`, `{{time}}`, `{{service}}`, `{{branch}}`, `{{token}}`, `{{orgName}}`
- Template types: booking_confirmed, booking_cancelled, booking_reminder, booking_rescheduled, otp, welcome, feedback_request, password_reset, status_changed
- Email + SMS channels
- Language support (en/ne)

#### Settings
- Per-org: guest booking, approval, advance days, cancellation policy
- Branding colors (primary, secondary, accent)
- Notification toggles
- **Dark mode toggle**

#### App Configuration (Super Admin only)
- App name, tagline, logo
- Default language
- Theme colors
- Feature toggles (guest booking, feedback, SMS)
- Contact info

#### Audit Logs (Super Admin only)
- All admin actions tracked: create, update, delete, status_change, reschedule, bulk_upload
- User, action, resource, details, IP, timestamp

### Authentication & RBAC

| Role | Capabilities |
|------|-------------|
| Super Admin | Everything + app config + audit logs + cross-org service creation |
| Org Admin | Own org: branches, types, bookings, users, feedback, settings, webhooks |
| Branch Manager | Own branch: bookings, calendar, staff scheduling, feedback |
| Staff | Assigned bookings, personal calendar, status updates |
| Citizen | Book, self-reschedule, view/cancel own appointments, submit feedback |
| Guest | Book (name + email/phone), lookup by email/phone |

### Security
- JWT with configurable expiry
- **Password reset** via OTP (forgot password → email code → reset)
- Password policy: min 6 chars, 1 uppercase, 1 number
- RBAC on all admin routes
- **Input sanitization** (HTML tag stripping for XSS prevention)
- Joi schema validation with `stripUnknown` (prevents mass-assignment)
- Rate limiting (configurable via env vars)
- Helmet security headers
- **CORS** with explicit method/header whitelist
- **Request ID tracking** (`X-Request-Id` header on every request)
- Structured error codes (E_VALIDATION, E_DUPLICATE, E_UNAUTHORIZED, etc.)
- Audit trail
- React error boundaries

### Stress Handling & Production Hardening
- **Graceful shutdown** — SIGTERM/SIGINT handlers properly close HTTP server and MongoDB connections
- **Booking idempotency** — duplicate requests within 30s return the same appointment (prevents double-click issues)
- **Auto no-show marking** — cron job auto-marks confirmed appointments as `no_show` after slot time + configurable grace period
- **Enhanced health check** — `/api/health` reports MongoDB connectivity, uptime, version, and environment
- **Email connection pooling** — singleton SMTP transporter with persistent connections
- **Webhook auto-disable** — automatically deactivates webhooks after N consecutive failures
- **Webhook delivery logs** — every delivery attempt recorded with status, body, duration (auto-expire after 30 days via TTL index)
- **Request correlation** — unique request IDs for distributed tracing across logs

### Performance
- **Code splitting**: 42 lazy-loaded chunks via React.lazy + Suspense
- Main bundle: 234KB (75KB gzip)
- Compression middleware
- MongoDB compound indexes + geospatial index + TTL indexes
- Nginx static caching in production

### Accessibility
- Skip-to-content link
- ARIA labels on all forms and interactive elements
- Focus-visible indicators
- `prefers-reduced-motion` media query support
- Keyboard navigation support
- Screen reader friendly status announcements

### Ref Code Format
`QL-{BRANCHCODE}-{TIMESTAMP}{UUID}` — e.g. `QL-IRD-KTM-M2P1A8B9CD`
~20 characters, unique, scannable, branch-identifiable.

## API (70+ endpoints)

Full interactive docs at **`/api/docs`** (Swagger UI with complete request/response schemas).

### Auth & Password Management
- `POST /api/auth/register` | `POST /api/auth/login`
- `POST /api/auth/otp/request` | `POST /api/auth/otp/verify`
- `POST /api/auth/forgot-password` | `POST /api/auth/reset-password`
- `GET /api/auth/me` | `PUT /api/auth/profile` | `PUT /api/auth/change-password`

### Public Booking & Status
- `GET /api/organizations/public` | `GET /api/organizations/slug/:slug`
- `GET /api/branches/public/org/:orgId` | `GET /api/branches/nearest`
- `GET /api/branches/code/:orgSlug/:code` ← **external integration resolver**
- `GET /api/appointment-types/public/org/:orgId`
- `GET /api/appointment-types/public/catalogue` ← **cross-org service browse** (`?search=`, `?category=`)
- `GET /api/appointment-types/slug/:slug` ← **external integration resolver**
- `GET /api/appointments/slots` | `POST /api/appointments/book` (honeypot-gated; `onBehalf=true` for staff walk-in bookings)
- `GET /api/appointments/ref/:refCode` ← also accepts gov-style file (दर्ता) numbers
- `GET /api/appointments/my-contact`

### Appointment Management
- `PUT /api/appointments/:id/status|shift|cancel|reschedule`
- `POST /api/appointments/bulk-shift|bulk-cancel|bulk-reschedule|bulk-status`
- `GET /api/appointments/:id/pdf` | `GET /api/appointments/:id/ical`
- `GET /api/appointments/calendar` | `GET /api/appointments/analytics`

### Admin Routes
- CRUD: `/api/organizations`, `/api/branches`, `/api/appointment-types`, `/api/admin/users`
- `PUT /api/appointment-types/:id/toggle-suspend`
- `/api/reports/analytics` | `/api/reports/export-excel`
- CRUD: `/api/webhooks` | `POST /api/webhooks/:id/test`
- CRUD: `/api/notification-templates`
- `/api/feedback`, `/api/messages`, `/api/staff-availability`
- `/api/app-config`, `/api/audit-logs`
- `POST /api/admin/upload-excel` | `GET /api/admin/export-csv`

### Ticketing & Hybrid Flows (DITMS)
- `GET /api/issue-types` (public, optional `?organization=`) | `GET /api/issue-types/slug/:slug` ← **external integration resolver**
- `GET /api/issue-types/admin` | `POST /api/issue-types` | `PUT /api/issue-types/:id` | `DELETE /api/issue-types/:id`
- `POST /api/issues` (multipart, public+auth) — accepts `issueType` or `issueTypeSlug`, plus `externalSubmissionNo` + `sourceSystem`
- `GET /api/issues/track/:refCode` (public; redacts internal notes for non-owners)
- `GET /api/issues/my` (citizen) | `GET /api/issues` (admin/staff, role-scoped, with filters) | `GET /api/issues/:id`
- `PUT /api/issues/:id/status` | `PUT /api/issues/:id/forward` | `PUT /api/issues/:id/assign` | `PUT /api/issues/:id/reopen`
- `POST /api/issues/:id/comments` (multipart; `isInternal` flag for staff) | `POST /api/issues/:id/attachments`
- `POST /api/hybrid/link` (`{ issueId, appointmentId }`) | `GET /api/hybrid/timeline/:type/:id`

### Public Citizen Surfaces
- `GET /api/transparency` ← public RTI dashboard (anonymised aggregates)
- `GET /api/display/branch/:code` ← waiting-room token-board snapshot
- `GET /api/geo/provinces` | `/api/geo/districts` | `/api/geo/holidays?year=` | `/api/geo/today/bs`

### Tenant & Identity
- `POST /api/tenants/onboard` ← public self-service org registration → pending_review
- `PUT /api/tenants/:id/activate|suspend` (super_admin)
- `PUT /api/tenants/:id/logo` (multipart) — org logo upload
- `GET|POST /api/tenants/:orgId/tokens` | `DELETE /api/tenants/tokens/:tokenId` — per-tenant API keys (`X-API-Key`)
- `GET /api/oauth/nagarik/login` | `GET /api/oauth/nagarik/callback` — Nagarik App OAuth (env-gated)

### Payments
- `POST /api/payments/intent` ← create payment + redirect URL (eSewa/Khalti/IME Pay/ConnectIPS-ready)
- `POST /api/payments/callback/:provider` ← gateway webhook receiver (HMAC-verified when secret configured)
- `POST /api/payments/cash` (staff) ← record over-the-counter payment with receipt number
- `GET /api/payments/my` | `GET /api/payments` | `GET /api/payments/:refCode`

### Ticketing — bulk + analytics
- `POST /api/issues/bulk/status|assign|forward` — bulk operations
- `GET /api/issues/stats/summary` — counts by status / priority / day / category
- `POST /api/issues/:id/approval-chain` (start) | `PUT /api/issues/:id/approval-chain/decide` — multi-step approval

### Ops & Compliance
- `GET /api/admin/slo` (super_admin) — DB / queue / webhook health snapshot
- `POST /api/admin/impersonate/:targetUserId` (super_admin) — short-lived JWT, fully audited
- `GET /api/me/export` ← data portability JSON dump
- `POST /api/me/erase` (`{ confirm: "ERASE" }`) ← anonymising right-to-erasure

### Health & Monitoring
- `GET /api/health` → MongoDB status, uptime, version, environment

## Architecture (100+ source files)

```
backend/src/
├── config/     (3)  db, logger, swagger (OpenAPI 3.0)
├── controllers/(15) auth, org, branch, type, appointment, admin, feedback,
│                    appConfig, notification, template, auditLog, webhook, reports,
│                    staffAvailability, message
├── middleware/ (3)  auth (JWT+RBAC), errorHandler (structured codes), validate (Joi+sanitization)
├── models/    (14) User, Organization, Branch, AppointmentType, Appointment,
│                    Notification, Feedback, AuditLog, AppConfig, Webhook, WebhookLog,
│                    NotificationTemplate, StaffAvailability, Message
├── routes/    (15) matching controllers
├── seeds/          comprehensive test data
├── services/  (6)  email, slot, pdf, reminder, webhook, noShow
└── utils/          auditLog

frontend/src/
├── components/(10) Navbar, AdminSidebar, AdminLayout, ErrorBoundary, Skeleton...
├── lib/       (3)  api (14 API groups), i18n (EN+NE), utils
├── pages/     (23) 7 public + 16 admin
├── store/     (2)  auth, theme
└── types/          TypeScript interfaces (all 14 models)
```

## External Systems Integration (e.g., IRD Integration)

QueueLess acts as an omni-channel central appointment hub built specifically for integrating easily with massive governmental portals, strictly enabling fluent, closed-loop communications.

### 1. Booking Redirect (Frontend Intercept)
External systems can redirect users needing office visits to the QueueLess `/book` sub-route holding specific parameters context.

**Crafting the Portal URL Redirect:**
```text
https://queueless.gov.np/book?orgCode=IRD
    &offcode=KTM-12
    &serviceTypeCode=TAX_CLEAR
    &submissionNo=TAX-2026-X8FA
    &sourceSystem=IRD-TAX
    &fullname=Bikash+Thapa
    &username=9800000000
    &detail=Requesting+Clearance+Validation
```

**Parameters Parsed:**
- `orgCode` & `offcode` & `serviceTypeCode`: Safely triggers the system to auto-bypass the branch & service selection steps.
- `submissionNo` & `sourceSystem`: Identifiers bound natively to the backend appointment Mongo document.
- `fullname`, `username` (email/phone), `detail` (notes): Instantly pre-populate on the User Form.

**Backend Resolvers for External Integration:**
- `GET /api/branches/code/:orgSlug/:code` → resolves `offcode` to a branch ID
- `GET /api/appointment-types/slug/:slug` → resolves `serviceTypeCode` to a service type ID

### 2. Auto-Closing the Loop via Webhooks
Because QueueLess captures the `submissionNo`, IRD developers can instantly know when their citizen finishes their verification office visit.

1. Navigate to **Admin Panel → Webhooks**.
2. Add a new hook:
   - Events: `appointment.completed`, `appointment.status_changed`
   - URL: `https://api.ird.gov.np/v1/queueless/callback`
   - Secret: `your-hmac-secret` (for signature verification)
3. QueueLess will POST back a secure JSON payload heavily typed with the original `submissionNo` to IRD upon completion, enabling automatic tax clearance dispatch!

**Webhook payload example:**
```json
{
  "event": "appointment.completed",
  "timestamp": "2026-04-18T10:30:00Z",
  "data": {
    "refCode": "QL-IRD-KTM-M2P1A8B9CD",
    "status": "completed",
    "externalSubmissionNo": "TAX-2026-X8FA",
    "sourceSystem": "IRD-TAX",
    "completedAt": "2026-04-18T10:30:00Z"
  }
}
```

**Webhook headers:**
- `X-QueueLess-Event`: Event name
- `X-QueueLess-Signature`: HMAC-SHA256 signature for payload verification
- `X-QueueLess-Delivery`: Unique delivery ID

### 3. Ticket / Grievance Deep-Link (External Portal → Issue)
External systems can also redirect citizens directly into the QueueLess ticket flow with all required context pre-filled:

```text
https://queueless.gov.np/issue/submit?org=ird-nepal
    &issueTypeSlug=portal-technical-error
    &subject=Cannot+complete+OTP
    &detail=The+OTP+page+returned+500+at+11:42
    &priority=high
    &fullname=Bikash+Thapa
    &username=bikash@example.com
    &phone=9800000000
    &externalSubmissionNo=IRD-COMP-2026-091
    &sourceSystem=IRD-PORTAL
    &linkApt=QL-IRD-KTM-AB12CD34
```

**Parameters parsed:**
- `org` / `orgCode` — organization id or slug; auto-selects the organization.
- `issueType` (id) **or** `issueTypeSlug` — pre-selects the category. The slug is resolved against `GET /api/issue-types/slug/:slug` so external systems never need to ship an internal id.
- `subject`, `detail` (or `description`), `priority` — pre-fill the form.
- `fullname`, `username` (email or phone), `phone` — pre-fill contact fields. If the user is logged in these are still merged in.
- `linkApt` — appointment refCode (or id); the ticket is bidirectionally linked to that appointment on creation.
- `externalSubmissionNo` + `sourceSystem` — stored on the ticket for closed-loop follow-up; surfaced in both the public tracking page and the admin drawer.

**Closed-loop on the ticket side:** subscribe to a ticket-status webhook (or poll `/api/issues/track/:refCode`) to receive notifications keyed by `externalSubmissionNo` whenever the ticket changes status, gets forwarded, or is resolved.

**Hybrid loop:** if the chosen `issueTypeSlug` is flagged `requiresAppointment`, the wizard submits the ticket and forwards the citizen to `/book?org=…&linkIssue=…` — the appointment, once booked, is auto-linked back to the original ticket so both portals stay in sync.

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Backend won't start | Check `MONGO_URI` in `.env`, ensure MongoDB is running |
| Email not sending | Verify `SENDER_API_TOKEN` and `SENDER_FROM_EMAIL` in `.env` |
| CORS errors | Ensure `FRONTEND_URL` matches your frontend's actual URL |
| Rate limited | Increase `RATE_LIMIT_MAX` in `.env` or wait for window reset |
| Webhook failing | Check webhook delivery logs in admin panel; auto-disables after 10 failures |
| Health check degraded | MongoDB connection lost — check `GET /api/health` for details |
