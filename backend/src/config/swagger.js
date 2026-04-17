const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'QueueLess API',
      version: '2.0.0',
      description: 'Dynamic Multi-Branch Appointment Booking System API',
      contact: { name: 'QueueLess', email: 'support@queueless.app' },
    },
    servers: [
      { url: '/api', description: 'API Server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Organizations', description: 'Organization management' },
      { name: 'Branches', description: 'Branch management' },
      { name: 'Appointment Types', description: 'Service type management' },
      { name: 'Appointments', description: 'Booking & appointment management' },
      { name: 'Admin', description: 'Admin operations' },
      { name: 'Feedback', description: 'Reviews & ratings' },
      { name: 'Reports', description: 'Analytics & reports' },
      { name: 'Webhooks', description: 'Webhook management' },
      { name: 'Notifications', description: 'Notification management' },
      { name: 'Config', description: 'App configuration' },
    ],
    paths: {
      '/auth/register': { post: { tags: ['Auth'], summary: 'Register new user', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' } }, required: ['name','email','password'] } } } }, responses: { 201: { description: 'User created' } } } },
      '/auth/login': { post: { tags: ['Auth'], summary: 'Login with email & password', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } } } }, responses: { 200: { description: 'JWT token + user' } } } },
      '/auth/otp/request': { post: { tags: ['Auth'], summary: 'Request OTP via email/phone' } },
      '/auth/otp/verify': { post: { tags: ['Auth'], summary: 'Verify OTP' } },
      '/auth/me': { get: { tags: ['Auth'], summary: 'Get current user', security: [{ bearerAuth: [] }] } },
      '/organizations/public': { get: { tags: ['Organizations'], summary: 'List active organizations (public)' } },
      '/organizations': { get: { tags: ['Organizations'], summary: 'List all (admin)', security: [{ bearerAuth: [] }] }, post: { tags: ['Organizations'], summary: 'Create organization', security: [{ bearerAuth: [] }] } },
      '/branches/public/org/{orgId}': { get: { tags: ['Branches'], summary: 'List branches for org (public)', parameters: [{ in: 'path', name: 'orgId', required: true, schema: { type: 'string' } }] } },
      '/branches/nearest': { get: { tags: ['Branches'], summary: 'Find nearest branches', parameters: [{ in: 'query', name: 'lat', required: true, schema: { type: 'number' } }, { in: 'query', name: 'lng', required: true, schema: { type: 'number' } }] } },
      '/appointment-types/public/org/{orgId}': { get: { tags: ['Appointment Types'], summary: 'List service types (public)' } },
      '/appointments/slots': { get: { tags: ['Appointments'], summary: 'Get available slots', parameters: [{ in: 'query', name: 'branchId', required: true, schema: { type: 'string' } }, { in: 'query', name: 'appointmentTypeId', required: true, schema: { type: 'string' } }, { in: 'query', name: 'date', required: true, schema: { type: 'string' } }] } },
      '/appointments/book': { post: { tags: ['Appointments'], summary: 'Book appointment (auth optional for guests)' } },
      '/appointments/ref/{refCode}': { get: { tags: ['Appointments'], summary: 'Lookup by reference code' } },
      '/appointments/{id}/status': { put: { tags: ['Appointments'], summary: 'Update status (admin)', security: [{ bearerAuth: [] }] } },
      '/appointments/{id}/shift': { put: { tags: ['Appointments'], summary: 'Shift appointment by days (admin)', security: [{ bearerAuth: [] }] } },
      '/appointments/{id}/reschedule': { put: { tags: ['Appointments'], summary: 'Reschedule appointment', security: [{ bearerAuth: [] }] } },
      '/appointments/bulk-shift': { post: { tags: ['Appointments'], summary: 'Bulk shift appointments', security: [{ bearerAuth: [] }] } },
      '/admin/dashboard': { get: { tags: ['Admin'], summary: 'Dashboard stats', security: [{ bearerAuth: [] }] } },
      '/admin/users': { get: { tags: ['Admin'], summary: 'List users', security: [{ bearerAuth: [] }] } },
      '/admin/upload-excel': { post: { tags: ['Admin'], summary: 'Bulk upload via Excel', security: [{ bearerAuth: [] }] } },
      '/admin/export-csv': { get: { tags: ['Admin'], summary: 'Export bookings CSV', security: [{ bearerAuth: [] }] } },
      '/feedback': { post: { tags: ['Feedback'], summary: 'Submit feedback' } },
      '/feedback/org/{orgId}': { get: { tags: ['Feedback'], summary: 'Get org feedback (admin)', security: [{ bearerAuth: [] }] } },
      '/reports/analytics': { get: { tags: ['Reports'], summary: 'Comprehensive analytics', security: [{ bearerAuth: [] }] } },
      '/reports/export-excel': { get: { tags: ['Reports'], summary: 'Export Excel report', security: [{ bearerAuth: [] }] } },
      '/webhooks': { get: { tags: ['Webhooks'], summary: 'List webhooks', security: [{ bearerAuth: [] }] }, post: { tags: ['Webhooks'], summary: 'Create webhook', security: [{ bearerAuth: [] }] } },
      '/notification-templates': { get: { tags: ['Notifications'], summary: 'List templates', security: [{ bearerAuth: [] }] } },
      '/app-config': { get: { tags: ['Config'], summary: 'Get app config' }, put: { tags: ['Config'], summary: 'Update app config', security: [{ bearerAuth: [] }] } },
      '/audit-logs': { get: { tags: ['Config'], summary: 'View audit logs', security: [{ bearerAuth: [] }] } },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
