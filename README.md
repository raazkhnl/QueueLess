# QueueLess — Public Service, छरितो (Fast Forward)

A comprehensive, production-ready multi-branch appointment booking system.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS (code-split, 42 chunks) |
| Backend | Node.js + Express.js + Mongoose + Joi validation |
| Database | MongoDB (13 models, compound indexes, geospatial) |
| Auth | JWT + Email/Mobile OTP + Password policy (uppercase + number) |
| Docs | Swagger/OpenAPI at `/api/docs` |
| Logging | Winston (structured, file + console) |
| Email | Sender.net SMTP + configurable templates |
| PDF | PDFKit + QR codes |
| Cron | node-cron (automated reminders) |
| Webhooks | External event delivery with retry |
| i18n | English + नेपाली (Nepali) |
| Deploy | Docker Compose + Nginx + CI/CD (GitHub Actions) |

## Quick Start

```bash
# Backend
cd backend && npm install && npm run seed && npm run dev

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
- Status workflow: Pending → Approved → Checked In → In Progress → Completed
- **Shift** appointment by N days (auto-finds slots on new date)
- **Reschedule** with date + slot picker modal
- **Bulk shift** all appointments on a date to next day
- Cancel with reason
- PDF download, public view link
- Feedback display with admin reply

#### Service Types (with scope control)
- Super Admin: **"Apply to ALL Organizations"** toggle creates service across all orgs
- Org Admin: creates for own org
- **Branch scope**: "All branches" toggle or pick specific branches
- Duration, buffer time, price, mode (in-person/virtual/both)
- Custom fields builder (text, select, email, phone, date, textarea)
- Approval toggle, sort order, color

#### Branches (with break time)
- Working hours per day with **break time** (start/end) + clear button
- Holiday management with recurring support
- Map coordinates (lat/lng) for geolocation
- Max concurrent bookings setting
- Province/district/city

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
- Event-driven: appointment.created, confirmed, cancelled, completed, etc.
- Custom URL + secret + headers
- Retry logic with fail count tracking

#### Notification Templates
- Per-organization configurable templates
- Template variables: {{name}}, {{refCode}}, {{date}}, {{time}}, etc.
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
- Password policy: min 6 chars, 1 uppercase, 1 number
- RBAC on all admin routes
- Joi schema validation
- Rate limiting (configurable)
- Helmet security headers
- Structured error codes (E_VALIDATION, E_DUPLICATE, E_UNAUTHORIZED, etc.)
- Audit trail
- React error boundaries

### Performance
- **Code splitting**: 42 lazy-loaded chunks via React.lazy + Suspense
- Main bundle: 234KB (75KB gzip)
- Compression middleware
- MongoDB compound indexes + geospatial index
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

## API (60+ endpoints)

Full interactive docs at **`/api/docs`** (Swagger UI).

### Core Routes
- `POST /api/auth/register|login|otp/request|otp/verify`
- `GET /api/organizations/public` | `GET /api/branches/nearest`
- `GET /api/appointments/slots` | `POST /api/appointments/book`
- `PUT /api/appointments/:id/status|shift|reschedule`
- `POST /api/appointments/bulk-shift`
- `GET /api/appointments/analytics`

### Admin Routes
- CRUD: `/api/organizations`, `/api/branches`, `/api/appointment-types`, `/api/admin/users`
- `/api/reports/analytics` | `/api/reports/export-excel`
- CRUD: `/api/webhooks`, `/api/notification-templates`
- `/api/feedback`, `/api/messages`, `/api/staff-availability`
- `/api/app-config`, `/api/audit-logs`

## Architecture (100+ source files)

```
backend/src/
├── config/     (3)  db, logger, swagger
├── controllers/(15) auth, org, branch, type, appointment, admin, feedback,
│                    appConfig, notification, template, auditLog, webhook, reports,
│                    staffAvailability, message
├── middleware/ (3)  auth (JWT+RBAC), errorHandler (structured codes), validate (Joi)
├── models/    (13) User, Organization, Branch, AppointmentType, Appointment,
│                    Notification, Feedback, AuditLog, AppConfig, Webhook,
│                    NotificationTemplate, StaffAvailability, Message
├── routes/    (15) matching controllers
├── seeds/          comprehensive test data
├── services/  (5)  email, slot, pdf, reminder, webhook
└── utils/          auditLog

frontend/src/
├── components/(10) Navbar, AdminSidebar, AdminLayout, ErrorBoundary, Skeleton...
├── lib/       (3)  api (13 API groups), i18n (EN+NE), utils
├── pages/     (23) 7 public + 16 admin
├── store/     (2)  auth, theme
└── types/          TypeScript interfaces
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

### 2. Auto-Closing the Loop via Webhooks
Because QueueLess captures the `submissionNo`, IRD developers can instantly know when their citizen finishes their verification office visit.

1. Navigate to **Admin Panel → Webhooks**.
2. Add a new hook:
   - Event: `appointment.completed`
   - URL: `https://api.ird.gov.np/v1/queueless/callback`
3. QueueLess will POST back a secure JSON payload heavily typed with the original `submissionNo` to IRD upon completion, enabling automatic tax clearance dispatch!
