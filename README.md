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

### Docker
```bash
docker-compose up -d --build
docker exec queueless-api node src/seeds/seed.js
# Frontend: http://localhost | API: http://localhost:5000 | Docs: http://localhost:5000/api/docs
```

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

## Complete Feature List

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
- `GET /api/appointment-types/slug/:slug` ← **external integration resolver**
- `GET /api/appointments/slots` | `POST /api/appointments/book`
- `GET /api/appointments/ref/:refCode` | `GET /api/appointments/my-contact`

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

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Backend won't start | Check `MONGO_URI` in `.env`, ensure MongoDB is running |
| Email not sending | Verify `SENDER_API_TOKEN` and `SENDER_FROM_EMAIL` in `.env` |
| CORS errors | Ensure `FRONTEND_URL` matches your frontend's actual URL |
| Rate limited | Increase `RATE_LIMIT_MAX` in `.env` or wait for window reset |
| Webhook failing | Check webhook delivery logs in admin panel; auto-disables after 10 failures |
| Health check degraded | MongoDB connection lost — check `GET /api/health` for details |
