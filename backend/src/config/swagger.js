const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'QueueLess API',
      version: '2.1.0',
      description: 'Dynamic Multi-Branch Appointment Booking System API — production-ready, multi-tenant, with full external system integration support.',
      contact: { name: 'QueueLess', email: 'support@queueless.app', url: 'https://github.com/raazkhnl/queueless' },
      license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
    },
    servers: [
      { url: '/api', description: 'API Server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Enter your JWT token' },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string', format: 'email' },
            phone: { type: 'string' }, role: { type: 'string', enum: ['super_admin','org_admin','branch_manager','staff','citizen'] },
            organization: { type: 'string' }, branch: { type: 'string' },
            specializations: { type: 'array', items: { type: 'string' } }, expertise: { type: 'string' },
            isActive: { type: 'boolean' }, isEmailVerified: { type: 'boolean' }, isPhoneVerified: { type: 'boolean' },
            lastLogin: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Organization: {
          type: 'object',
          properties: {
            _id: { type: 'string' }, name: { type: 'string' }, nameNp: { type: 'string' }, slug: { type: 'string' },
            description: { type: 'string' }, logo: { type: 'string' }, website: { type: 'string' },
            email: { type: 'string' }, phone: { type: 'string' }, address: { type: 'string' },
            category: { type: 'string', enum: ['government','healthcare','education','finance','salon','legal','other'] },
            branding: { type: 'object', properties: { primaryColor: { type: 'string' }, secondaryColor: { type: 'string' }, accentColor: { type: 'string' } } },
            settings: { type: 'object', properties: {
              allowGuestBooking: { type: 'boolean' }, requireApproval: { type: 'boolean' },
              maxAdvanceBookingDays: { type: 'number' }, cancellationPolicyHours: { type: 'number' },
              timezone: { type: 'string' }, currency: { type: 'string' },
            }},
            isActive: { type: 'boolean' },
          },
        },
        Branch: {
          type: 'object',
          properties: {
            _id: { type: 'string' }, organization: { type: 'string' }, name: { type: 'string' }, nameNp: { type: 'string' },
            code: { type: 'string' }, address: { type: 'string' }, province: { type: 'string' },
            district: { type: 'string' }, city: { type: 'string' },
            location: { type: 'object', properties: { type: { type: 'string' }, coordinates: { type: 'array', items: { type: 'number' } } } },
            phone: { type: 'string' }, email: { type: 'string' },
            workingHours: { type: 'array', items: { type: 'object', properties: { day: { type: 'number' }, isOpen: { type: 'boolean' }, openTime: { type: 'string' }, closeTime: { type: 'string' }, breakStart: { type: 'string' }, breakEnd: { type: 'string' } } } },
            maxConcurrentBookings: { type: 'number' }, isActive: { type: 'boolean' },
          },
        },
        AppointmentType: {
          type: 'object',
          properties: {
            _id: { type: 'string' }, organization: { type: 'string' }, name: { type: 'string' }, nameNp: { type: 'string' },
            slug: { type: 'string' }, description: { type: 'string' }, duration: { type: 'number' },
            bufferTime: { type: 'number' }, price: { type: 'number' },
            mode: { type: 'string', enum: ['in_person','virtual','both'] }, color: { type: 'string' },
            customFields: { type: 'array', items: { type: 'object' } },
            maxBookingsPerSlot: { type: 'number' }, requiresApproval: { type: 'boolean' },
            isActive: { type: 'boolean' }, isSuspended: { type: 'boolean' },
            roomNo: { type: 'string' }, roomNoNp: { type: 'string' },
          },
        },
        Appointment: {
          type: 'object',
          properties: {
            _id: { type: 'string' }, refCode: { type: 'string' },
            organization: { type: 'string' }, branch: { type: 'string' }, appointmentType: { type: 'string' },
            citizen: { type: 'string' }, guestName: { type: 'string' }, guestEmail: { type: 'string' }, guestPhone: { type: 'string' },
            date: { type: 'string', format: 'date' }, startTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            endTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' }, duration: { type: 'number' },
            status: { type: 'string', enum: ['pending','confirmed','checked_in','in_progress','completed','cancelled','no_show','rescheduled'] },
            mode: { type: 'string', enum: ['in_person','virtual'] }, tokenNumber: { type: 'number' },
            price: { type: 'number' }, notes: { type: 'string' },
            externalSubmissionNo: { type: 'string', description: 'External system reference for closed-loop integration' },
            sourceSystem: { type: 'string', description: 'Identifier of the external system that created this booking' },
            isGuest: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Slot: {
          type: 'object',
          properties: {
            startTime: { type: 'string' }, endTime: { type: 'string' },
            available: { type: 'boolean' }, bookedCount: { type: 'number' },
            maxBookings: { type: 'number' }, isPast: { type: 'boolean' },
          },
        },
        Feedback: {
          type: 'object',
          properties: {
            _id: { type: 'string' }, appointment: { type: 'string' },
            rating: { type: 'number', minimum: 1, maximum: 5 }, comment: { type: 'string' },
            staffRating: { type: 'number' }, waitTimeRating: { type: 'number' }, serviceRating: { type: 'number' },
            adminReply: { type: 'string' }, adminRepliedAt: { type: 'string', format: 'date-time' },
          },
        },
        Webhook: {
          type: 'object',
          properties: {
            _id: { type: 'string' }, name: { type: 'string' }, url: { type: 'string', format: 'uri' },
            events: { type: 'array', items: { type: 'string' } }, isActive: { type: 'boolean' },
            failCount: { type: 'number' }, maxRetries: { type: 'number' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Error code (e.g. E_VALIDATION, E_NOT_FOUND)' },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      responses: {
        Unauthorized: { description: 'Authentication required or token invalid', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        Forbidden: { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        NotFound: { description: 'Resource not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        ValidationError: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication and user session management' },
      { name: 'Organizations', description: 'Organization management (multi-tenant)' },
      { name: 'Branches', description: 'Branch management with geolocation' },
      { name: 'Appointment Types', description: 'Service type management with custom fields' },
      { name: 'Appointments', description: 'Booking, scheduling, and lifecycle management' },
      { name: 'Admin', description: 'Admin operations, user management, bulk operations' },
      { name: 'Feedback', description: 'Post-appointment reviews and ratings' },
      { name: 'Reports', description: 'Analytics, exports, and dashboards' },
      { name: 'Webhooks', description: 'External event delivery with retry logic' },
      { name: 'Notifications', description: 'Email/SMS notification management' },
      { name: 'Staff', description: 'Staff scheduling and availability' },
      { name: 'Config', description: 'App configuration and audit logs' },
    ],
    paths: {
      // ─── Auth ───────────────────────────────────────
      '/auth/register': { post: { tags: ['Auth'], summary: 'Register new citizen account', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name','email','password'], properties: { name: { type: 'string', minLength: 2 }, email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 6, description: 'Min 6 chars, 1 uppercase, 1 number' }, phone: { type: 'string' } } } } } }, responses: { 201: { description: 'User created, JWT returned' }, 409: { description: 'Email already registered' } } } },
      '/auth/login': { post: { tags: ['Auth'], summary: 'Login with email & password', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email','password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } } } } }, responses: { 200: { description: 'JWT token + user object' }, 401: { description: 'Invalid credentials' } } } },
      '/auth/otp/request': { post: { tags: ['Auth'], summary: 'Request OTP via email or phone', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, phone: { type: 'string' } } } } } }, responses: { 200: { description: 'OTP sent' } } } },
      '/auth/otp/verify': { post: { tags: ['Auth'], summary: 'Verify OTP and get JWT', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, phone: { type: 'string' }, otp: { type: 'string', minLength: 6 } } } } } }, responses: { 200: { description: 'JWT token + user' } } } },
      '/auth/forgot-password': { post: { tags: ['Auth'], summary: 'Request password reset OTP', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } } }, responses: { 200: { description: 'Reset OTP sent if account exists' } } } },
      '/auth/reset-password': { post: { tags: ['Auth'], summary: 'Reset password using OTP', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email','otp','newPassword'], properties: { email: { type: 'string', format: 'email' }, otp: { type: 'string' }, newPassword: { type: 'string', minLength: 6 } } } } } }, responses: { 200: { description: 'Password reset, new JWT returned' } } } },
      '/auth/me': { get: { tags: ['Auth'], summary: 'Get current authenticated user', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Current user object', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } } } },
      '/auth/profile': { put: { tags: ['Auth'], summary: 'Update profile', security: [{ bearerAuth: [] }] } },
      '/auth/change-password': { put: { tags: ['Auth'], summary: 'Change password', security: [{ bearerAuth: [] }] } },

      // ─── Organizations ──────────────────────────────
      '/organizations/public': { get: { tags: ['Organizations'], summary: 'List active organizations (public)', responses: { 200: { description: 'Array of organizations' } } } },
      '/organizations/slug/{slug}': { get: { tags: ['Organizations'], summary: 'Get organization by slug (public)', parameters: [{ in: 'path', name: 'slug', required: true, schema: { type: 'string' } }] } },
      '/organizations': { get: { tags: ['Organizations'], summary: 'List all organizations (admin)', security: [{ bearerAuth: [] }], parameters: [{ in: 'query', name: 'search', schema: { type: 'string' } }, { in: 'query', name: 'category', schema: { type: 'string' } }, { in: 'query', name: 'page', schema: { type: 'number' } }] }, post: { tags: ['Organizations'], summary: 'Create organization (super_admin)', security: [{ bearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Organization' } } } } } },
      '/organizations/{id}': { get: { tags: ['Organizations'], summary: 'Get by ID', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }] }, put: { tags: ['Organizations'], summary: 'Update organization', security: [{ bearerAuth: [] }] }, delete: { tags: ['Organizations'], summary: 'Deactivate organization', security: [{ bearerAuth: [] }] } },

      // ─── Branches ───────────────────────────────────
      '/branches/public/org/{orgId}': { get: { tags: ['Branches'], summary: 'List branches for organization (public)', parameters: [{ in: 'path', name: 'orgId', required: true, schema: { type: 'string' } }] } },
      '/branches/code/{orgSlug}/{code}': { get: { tags: ['Branches'], summary: 'Resolve branch by org slug + branch code (for external integration)', parameters: [{ in: 'path', name: 'orgSlug', required: true, schema: { type: 'string' }, description: 'Organization slug' }, { in: 'path', name: 'code', required: true, schema: { type: 'string' }, description: 'Branch code (e.g. KTM-12)' }], responses: { 200: { description: 'Branch object', content: { 'application/json': { schema: { $ref: '#/components/schemas/Branch' } } } }, 404: { description: 'Branch not found' } } } },
      '/branches/nearest': { get: { tags: ['Branches'], summary: 'Find nearest branches by GPS', parameters: [{ in: 'query', name: 'lat', required: true, schema: { type: 'number' } }, { in: 'query', name: 'lng', required: true, schema: { type: 'number' } }, { in: 'query', name: 'orgId', schema: { type: 'string' } }, { in: 'query', name: 'maxDistance', schema: { type: 'number', default: 50000 } }] } },
      '/branches': { get: { tags: ['Branches'], summary: 'List all (admin)', security: [{ bearerAuth: [] }] }, post: { tags: ['Branches'], summary: 'Create branch', security: [{ bearerAuth: [] }] } },
      '/branches/{id}': { get: { tags: ['Branches'], summary: 'Get by ID' }, put: { tags: ['Branches'], summary: 'Update branch', security: [{ bearerAuth: [] }] }, delete: { tags: ['Branches'], summary: 'Deactivate branch', security: [{ bearerAuth: [] }] } },
      '/branches/{id}/holidays': { post: { tags: ['Branches'], summary: 'Add holiday', security: [{ bearerAuth: [] }] } },
      '/branches/{id}/working-hours': { put: { tags: ['Branches'], summary: 'Update working hours', security: [{ bearerAuth: [] }] } },

      // ─── Appointment Types ──────────────────────────
      '/appointment-types/public/org/{orgId}': { get: { tags: ['Appointment Types'], summary: 'List service types for org (public)', parameters: [{ in: 'path', name: 'orgId', required: true, schema: { type: 'string' } }, { in: 'query', name: 'branch', schema: { type: 'string' } }] } },
      '/appointment-types/slug/{slug}': { get: { tags: ['Appointment Types'], summary: 'Resolve service type by slug (for external integration)', parameters: [{ in: 'path', name: 'slug', required: true, schema: { type: 'string' }, description: 'Service type slug (e.g. tax-clearance)' }], responses: { 200: { description: 'Appointment type', content: { 'application/json': { schema: { $ref: '#/components/schemas/AppointmentType' } } } } } } },
      '/appointment-types': { get: { tags: ['Appointment Types'], summary: 'List all (admin)', security: [{ bearerAuth: [] }] }, post: { tags: ['Appointment Types'], summary: 'Create service type', security: [{ bearerAuth: [] }] } },
      '/appointment-types/{id}': { get: { tags: ['Appointment Types'], summary: 'Get by ID' }, put: { tags: ['Appointment Types'], summary: 'Update', security: [{ bearerAuth: [] }] }, delete: { tags: ['Appointment Types'], summary: 'Deactivate', security: [{ bearerAuth: [] }] } },
      '/appointment-types/{id}/toggle-suspend': { put: { tags: ['Appointment Types'], summary: 'Suspend or activate service', security: [{ bearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { suspend: { type: 'boolean' }, reason: { type: 'string' } } } } } } } },

      // ─── Appointments ───────────────────────────────
      '/appointments/slots': { get: { tags: ['Appointments'], summary: 'Get available time slots', parameters: [{ in: 'query', name: 'branchId', required: true, schema: { type: 'string' } }, { in: 'query', name: 'appointmentTypeId', required: true, schema: { type: 'string' } }, { in: 'query', name: 'date', required: true, schema: { type: 'string', format: 'date' } }], responses: { 200: { description: 'Available slots', content: { 'application/json': { schema: { type: 'object', properties: { slots: { type: 'array', items: { $ref: '#/components/schemas/Slot' } }, date: { type: 'string' } } } } } } } } },
      '/appointments/book': { post: { tags: ['Appointments'], summary: 'Book appointment (auth optional for guests)', description: 'Includes idempotency protection — duplicate requests within 30s return the same appointment.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['organization','branch','appointmentType','date','startTime','endTime'], properties: { organization: { type: 'string' }, branch: { type: 'string' }, appointmentType: { type: 'string' }, date: { type: 'string', format: 'date' }, startTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' }, endTime: { type: 'string' }, guestName: { type: 'string' }, guestEmail: { type: 'string' }, guestPhone: { type: 'string' }, notes: { type: 'string' }, mode: { type: 'string', enum: ['in_person','virtual'] }, externalSubmissionNo: { type: 'string', description: 'External system reference ID' }, sourceSystem: { type: 'string', description: 'Source system identifier' } } } } } }, responses: { 201: { description: 'Appointment created' }, 200: { description: 'Deduplicated — same appointment returned' }, 409: { description: 'Slot no longer available' } } } },
      '/appointments/ref/{refCode}': { get: { tags: ['Appointments'], summary: 'Lookup by reference code (public)', parameters: [{ in: 'path', name: 'refCode', required: true, schema: { type: 'string' } }] } },
      '/appointments/ref/{refCode}/pdf': { get: { tags: ['Appointments'], summary: 'Download PDF by ref code' } },
      '/appointments/my-contact': { get: { tags: ['Appointments'], summary: 'Lookup appointments by email/phone', parameters: [{ in: 'query', name: 'email', schema: { type: 'string' } }, { in: 'query', name: 'phone', schema: { type: 'string' } }] } },
      '/appointments': { get: { tags: ['Appointments'], summary: 'List appointments (filtered by role)', security: [{ bearerAuth: [] }], parameters: [{ in: 'query', name: 'page', schema: { type: 'number' } }, { in: 'query', name: 'limit', schema: { type: 'number' } }, { in: 'query', name: 'status', schema: { type: 'string' } }, { in: 'query', name: 'branch', schema: { type: 'string' } }, { in: 'query', name: 'dateFrom', schema: { type: 'string' } }, { in: 'query', name: 'dateTo', schema: { type: 'string' } }, { in: 'query', name: 'search', schema: { type: 'string' } }] } },
      '/appointments/{id}': { get: { tags: ['Appointments'], summary: 'Get by ID', security: [{ bearerAuth: [] }] } },
      '/appointments/{id}/status': { put: { tags: ['Appointments'], summary: 'Update status (validates transitions)', security: [{ bearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['confirmed','checked_in','in_progress','completed','cancelled','no_show'] }, cancellationReason: { type: 'string' }, assignedStaff: { type: 'string' } } } } } }, responses: { 200: { description: 'Status updated' }, 400: { description: 'Invalid status transition' } } } },
      '/appointments/{id}/cancel': { put: { tags: ['Appointments'], summary: 'Cancel appointment', security: [{ bearerAuth: [] }] } },
      '/appointments/{id}/reschedule': { put: { tags: ['Appointments'], summary: 'Reschedule (citizen or admin)', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['date','startTime','endTime'], properties: { date: { type: 'string' }, startTime: { type: 'string' }, endTime: { type: 'string' } } } } } } } },
      '/appointments/{id}/shift': { put: { tags: ['Appointments'], summary: 'Shift by N days (admin)', security: [{ bearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { shiftDays: { type: 'number', default: 1 }, reason: { type: 'string' } } } } } } } },
      '/appointments/bulk-shift': { post: { tags: ['Appointments'], summary: 'Bulk shift all appointments on a date', security: [{ bearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['branch','fromDate'], properties: { branch: { type: 'string' }, fromDate: { type: 'string' }, shiftDays: { type: 'number' }, reason: { type: 'string' } } } } } } } },
      '/appointments/bulk-cancel': { post: { tags: ['Appointments'], summary: 'Bulk cancel appointments', security: [{ bearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['appointmentIds'], properties: { appointmentIds: { type: 'array', items: { type: 'string' } }, reason: { type: 'string' } } } } } } } },
      '/appointments/bulk-reschedule': { post: { tags: ['Appointments'], summary: 'Bulk reschedule appointments', security: [{ bearerAuth: [] }] } },
      '/appointments/bulk-status': { post: { tags: ['Appointments'], summary: 'Bulk status update', security: [{ bearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['appointmentIds','status'], properties: { appointmentIds: { type: 'array', items: { type: 'string' } }, status: { type: 'string' }, reason: { type: 'string' } } } } } } } },
      '/appointments/{id}/pdf': { get: { tags: ['Appointments'], summary: 'Download appointment PDF' } },
      '/appointments/{id}/ical': { get: { tags: ['Appointments'], summary: 'Download iCal calendar entry' } },
      '/appointments/calendar': { get: { tags: ['Appointments'], summary: 'Calendar events (admin)', security: [{ bearerAuth: [] }] } },
      '/appointments/analytics': { get: { tags: ['Appointments'], summary: 'Appointment analytics', security: [{ bearerAuth: [] }] } },

      // ─── Admin ──────────────────────────────────────
      '/admin/dashboard': { get: { tags: ['Admin'], summary: 'Dashboard stats (role-scoped)', security: [{ bearerAuth: [] }] } },
      '/admin/users': { get: { tags: ['Admin'], summary: 'List users (with filters)', security: [{ bearerAuth: [] }], parameters: [{ in: 'query', name: 'role', schema: { type: 'string' } }, { in: 'query', name: 'search', schema: { type: 'string' } }, { in: 'query', name: 'page', schema: { type: 'number' } }] }, post: { tags: ['Admin'], summary: 'Create user', security: [{ bearerAuth: [] }] } },
      '/admin/users/{id}': { put: { tags: ['Admin'], summary: 'Update user', security: [{ bearerAuth: [] }] }, delete: { tags: ['Admin'], summary: 'Deactivate user', security: [{ bearerAuth: [] }] } },
      '/admin/upload-excel': { post: { tags: ['Admin'], summary: 'Bulk upload via Excel', security: [{ bearerAuth: [] }], requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, type: { type: 'string', enum: ['users','branches'] }, organization: { type: 'string' }, branch: { type: 'string' } } } } } } } },
      '/admin/sample-excel/{type}': { get: { tags: ['Admin'], summary: 'Download sample Excel template', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'type', required: true, schema: { type: 'string', enum: ['users','branches'] } }] } },
      '/admin/export-csv': { get: { tags: ['Admin'], summary: 'Export bookings as CSV', security: [{ bearerAuth: [] }] } },

      // ─── Feedback ───────────────────────────────────
      '/feedback': { post: { tags: ['Feedback'], summary: 'Submit feedback (for completed appointments)', requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Feedback' } } } } } },
      '/feedback/appointment/{appointmentId}': { get: { tags: ['Feedback'], summary: 'Get feedback for appointment' } },
      '/feedback/org/{orgId}': { get: { tags: ['Feedback'], summary: 'Get all feedback for organization (admin)', security: [{ bearerAuth: [] }] } },
      '/feedback/{id}/reply': { put: { tags: ['Feedback'], summary: 'Admin reply to feedback', security: [{ bearerAuth: [] }] } },

      // ─── Reports ────────────────────────────────────
      '/reports/analytics': { get: { tags: ['Reports'], summary: 'Comprehensive analytics with date range', security: [{ bearerAuth: [] }], parameters: [{ in: 'query', name: 'dateFrom', schema: { type: 'string' } }, { in: 'query', name: 'dateTo', schema: { type: 'string' } }, { in: 'query', name: 'branch', schema: { type: 'string' } }] } },
      '/reports/export-excel': { get: { tags: ['Reports'], summary: 'Export detailed Excel report', security: [{ bearerAuth: [] }] } },

      // ─── Webhooks ───────────────────────────────────
      '/webhooks': { get: { tags: ['Webhooks'], summary: 'List webhooks', security: [{ bearerAuth: [] }] }, post: { tags: ['Webhooks'], summary: 'Create webhook', security: [{ bearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['name','url','events'], properties: { name: { type: 'string' }, url: { type: 'string', format: 'uri' }, secret: { type: 'string' }, events: { type: 'array', items: { type: 'string', enum: ['appointment.created','appointment.confirmed','appointment.cancelled','appointment.completed','appointment.rescheduled','appointment.checked_in','appointment.status_changed','appointment.no_show','feedback.created','user.created'] } }, headers: { type: 'object' } } } } } } } },
      '/webhooks/{id}': { put: { tags: ['Webhooks'], summary: 'Update webhook', security: [{ bearerAuth: [] }] }, delete: { tags: ['Webhooks'], summary: 'Delete webhook', security: [{ bearerAuth: [] }] } },
      '/webhooks/{id}/test': { post: { tags: ['Webhooks'], summary: 'Send test webhook', security: [{ bearerAuth: [] }] } },

      // ─── Notifications ──────────────────────────────
      '/notifications': { get: { tags: ['Notifications'], summary: 'List notification history', security: [{ bearerAuth: [] }] } },
      '/notifications/stats': { get: { tags: ['Notifications'], summary: 'Notification stats', security: [{ bearerAuth: [] }] } },
      '/notifications/send': { post: { tags: ['Notifications'], summary: 'Send custom notification', security: [{ bearerAuth: [] }] } },
      '/notification-templates': { get: { tags: ['Notifications'], summary: 'List templates', security: [{ bearerAuth: [] }] }, post: { tags: ['Notifications'], summary: 'Create template', security: [{ bearerAuth: [] }] } },
      '/notification-templates/defaults': { get: { tags: ['Notifications'], summary: 'Get default template examples', security: [{ bearerAuth: [] }] } },
      '/notification-templates/{id}': { put: { tags: ['Notifications'], summary: 'Update template', security: [{ bearerAuth: [] }] }, delete: { tags: ['Notifications'], summary: 'Delete template', security: [{ bearerAuth: [] }] } },

      // ─── Staff ──────────────────────────────────────
      '/staff-availability/staff/{userId}': { get: { tags: ['Staff'], summary: 'Get staff availability', security: [{ bearerAuth: [] }] }, put: { tags: ['Staff'], summary: 'Update staff schedule', security: [{ bearerAuth: [] }] } },
      '/staff-availability/staff/{userId}/override': { post: { tags: ['Staff'], summary: 'Add date override (vacation, sick)', security: [{ bearerAuth: [] }] } },
      '/staff-availability/staff/{userId}/override/{date}': { delete: { tags: ['Staff'], summary: 'Remove date override', security: [{ bearerAuth: [] }] } },
      '/staff-availability/branch/{branchId}': { get: { tags: ['Staff'], summary: 'Get all staff for branch', security: [{ bearerAuth: [] }] } },

      // ─── Config ─────────────────────────────────────
      '/app-config': { get: { tags: ['Config'], summary: 'Get app configuration' }, put: { tags: ['Config'], summary: 'Update app configuration (super_admin)', security: [{ bearerAuth: [] }] } },
      '/audit-logs': { get: { tags: ['Config'], summary: 'View audit logs (super_admin)', security: [{ bearerAuth: [] }], parameters: [{ in: 'query', name: 'action', schema: { type: 'string' } }, { in: 'query', name: 'resource', schema: { type: 'string' } }, { in: 'query', name: 'page', schema: { type: 'number' } }] } },

      // ─── Messages ───────────────────────────────────
      '/messages/appointment/{appointmentId}': { get: { tags: ['Appointments'], summary: 'Get appointment messages' } },
      '/messages': { post: { tags: ['Appointments'], summary: 'Send message on appointment' } },
      '/messages/read/{appointmentId}': { put: { tags: ['Appointments'], summary: 'Mark messages as read' } },

      // ─── Health ─────────────────────────────────────
      '/health': { get: { tags: ['Config'], summary: 'Health check with MongoDB status', responses: { 200: { description: 'Healthy', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['ok','degraded'] }, database: { type: 'string' }, version: { type: 'string' }, uptime: { type: 'number' } } } } } }, 503: { description: 'Degraded — database disconnected' } } } },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
