require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Branch = require('../models/Branch');
const AppointmentType = require('../models/AppointmentType');
const Appointment = require('../models/Appointment');
const AppConfig = require('../models/AppConfig');
const Feedback = require('../models/Feedback');
const AuditLog = require('../models/AuditLog');
const StaffAvailability = require('../models/StaffAvailability');
const Message = require('../models/Message');
const Webhook = require('../models/Webhook');
const NotificationTemplate = require('../models/NotificationTemplate');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/queueless');
    console.log('Connected to MongoDB for seeding...');

    // Clear
    await Promise.all([
      User.deleteMany({}), Organization.deleteMany({}),
      Branch.deleteMany({}), AppointmentType.deleteMany({}),
      Appointment.deleteMany({}),
      AppConfig.deleteMany({}), Feedback.deleteMany({}), AuditLog.deleteMany({}),
      StaffAvailability.deleteMany({}), Message.deleteMany({}),
      Webhook.deleteMany({}), NotificationTemplate.deleteMany({})
    ]);
    console.log('Cleared existing data');

    // Super Admin
    const superAdmin = await User.create({
      name: 'Super Admin', email: 'admin@queueless.app',
      password: 'Admin@123', role: 'super_admin', isEmailVerified: true
    });

    // Organization 1: IRD Nepal
    const irdOrg = await Organization.create({
      name: 'Inland Revenue Department', slug: 'ird-nepal',
      description: 'Government tax service department of Nepal',
      category: 'government', email: 'info@ird.gov.np', phone: '01-4415802',
      address: 'Lazimpat, Kathmandu', createdBy: superAdmin._id,
      branding: { primaryColor: '#1e40af', secondaryColor: '#1e3a5f', accentColor: '#dc2626' },
      settings: { allowGuestBooking: true, requireApproval: false, maxAdvanceBookingDays: 14, cancellationPolicyHours: 2 }
    });

    const irdAdmin = await User.create({
      name: 'IRD Admin', email: 'admin@ird.gov.np',
      password: 'Admin@123', role: 'org_admin',
      organization: irdOrg._id, isEmailVerified: true
    });

    // IRD Branches
    const irdKtm = await Branch.create({
      organization: irdOrg._id, name: 'Kathmandu Main Office', code: 'IRD-KTM',
      address: 'Lazimpat, Kathmandu', province: 'Bagmati', district: 'Kathmandu', city: 'Kathmandu',
      location: { type: 'Point', coordinates: [85.3189, 27.7199] },
      phone: '01-4415802', email: 'ktm@ird.gov.np',
      maxConcurrentBookings: 10,
      workingHours: [
        { day: 0, isOpen: true, openTime: '10:00', closeTime: '15:00' },
        { day: 1, isOpen: true, openTime: '10:00', closeTime: '16:00' },
        { day: 2, isOpen: true, openTime: '10:00', closeTime: '16:00' },
        { day: 3, isOpen: true, openTime: '10:00', closeTime: '16:00' },
        { day: 4, isOpen: true, openTime: '10:00', closeTime: '16:00' },
        { day: 5, isOpen: true, openTime: '10:00', closeTime: '16:00' },
        { day: 6, isOpen: false, openTime: '10:00', closeTime: '13:00' },
      ],
      holidays: [
        { date: new Date('2026-01-01'), name: 'New Year', isRecurring: true },
        { date: new Date('2026-04-14'), name: 'Nepali New Year' },
      ]
    });

    const irdPkr = await Branch.create({
      organization: irdOrg._id, name: 'Pokhara Office', code: 'IRD-PKR',
      address: 'Lakeside, Pokhara', province: 'Gandaki', district: 'Kaski', city: 'Pokhara',
      location: { type: 'Point', coordinates: [83.9856, 28.2096] },
      phone: '061-520001', email: 'pokhara@ird.gov.np',
      maxConcurrentBookings: 5,
    });

    const irdBrt = await Branch.create({
      organization: irdOrg._id, name: 'Biratnagar Office', code: 'IRD-BRT',
      address: 'Main Road, Biratnagar', province: 'Koshi', district: 'Morang', city: 'Biratnagar',
      location: { type: 'Point', coordinates: [87.2718, 26.4525] },
      phone: '021-440001', email: 'brt@ird.gov.np',
      maxConcurrentBookings: 5,
    });

    // IRD Staff
    const irdManager = await User.create({
      name: 'Ram Sharma', email: 'ram@ird.gov.np',
      password: 'Staff@123', role: 'branch_manager',
      organization: irdOrg._id, branch: irdKtm._id, isEmailVerified: true
    });
    const irdStaff1 = await User.create({
      name: 'Sita Thapa', email: 'sita@ird.gov.np',
      password: 'Staff@123', role: 'staff',
      organization: irdOrg._id, branch: irdKtm._id, isEmailVerified: true
    });
    const irdStaff2 = await User.create({
      name: 'Hari Poudel', email: 'hari@ird.gov.np',
      password: 'Staff@123', role: 'staff',
      organization: irdOrg._id, branch: irdKtm._id, isEmailVerified: true
    });

    irdKtm.managers = [irdManager._id];
    await irdKtm.save();

    // IRD Appointment Types
    const irdPAN = await AppointmentType.create({
      organization: irdOrg._id, name: 'PAN Registration',
      description: 'Register for Permanent Account Number', duration: 30,
      bufferTime: 5, price: 0, mode: 'in_person', color: '#2563eb', icon: 'file-text',
      customFields: [
        { name: 'citizenship_no', label: 'Citizenship Number', type: 'text', required: true },
        { name: 'business_type', label: 'Business Type', type: 'select', required: true, options: ['Individual', 'Sole Proprietor', 'Partnership', 'Company'] },
      ],
      sortOrder: 1
    });

    const irdTax = await AppointmentType.create({
      organization: irdOrg._id, name: 'Tax Filing Consultation',
      description: 'Consult with tax officer for filing support', duration: 45,
      bufferTime: 10, price: 0, mode: 'both', color: '#059669', icon: 'calculator',
      sortOrder: 2
    });

    const irdClearance = await AppointmentType.create({
      organization: irdOrg._id, name: 'Tax Clearance Certificate',
      description: 'Apply for tax clearance certificate', duration: 20,
      bufferTime: 5, price: 500, mode: 'in_person', color: '#d97706', icon: 'award',
      customFields: [
        { name: 'pan_number', label: 'PAN Number', type: 'text', required: true },
        { name: 'fiscal_year', label: 'Fiscal Year', type: 'select', required: true, options: ['2081/82', '2082/83', '2083/84'] },
      ],
      sortOrder: 3
    });

    // Organization 2: Health Clinic
    const clinicOrg = await Organization.create({
      name: 'Kathmandu Medical Center', slug: 'kathmandu-medical',
      description: 'Multi-specialty medical center', category: 'healthcare',
      email: 'info@ktmmedical.com', phone: '01-5550001',
      address: 'New Baneshwor, Kathmandu', createdBy: superAdmin._id,
      branding: { primaryColor: '#059669', secondaryColor: '#047857', accentColor: '#0ea5e9' },
      settings: { allowGuestBooking: true, requireApproval: false, maxAdvanceBookingDays: 60, reminderHoursBefore: 12 }
    });

    const clinicAdmin = await User.create({
      name: 'Dr. Anita KC', email: 'admin@ktmmedical.com',
      password: 'Admin@123', role: 'org_admin',
      organization: clinicOrg._id, isEmailVerified: true
    });

    const clinicBranch = await Branch.create({
      organization: clinicOrg._id, name: 'Main Hospital', code: 'KMC-MAIN',
      address: 'New Baneshwor, Kathmandu', province: 'Bagmati', district: 'Kathmandu', city: 'Kathmandu',
      location: { type: 'Point', coordinates: [85.3419, 27.6915] },
      maxConcurrentBookings: 8,
    });

    const clinicBranch2 = await Branch.create({
      organization: clinicOrg._id, name: 'Lalitpur Clinic', code: 'KMC-LAL',
      address: 'Pulchowk, Lalitpur', province: 'Bagmati', district: 'Lalitpur', city: 'Lalitpur',
      location: { type: 'Point', coordinates: [85.3188, 27.6784] },
      maxConcurrentBookings: 4,
    });

    await AppointmentType.create({
      organization: clinicOrg._id, name: 'General Consultation',
      description: 'General physician consultation', duration: 15,
      bufferTime: 5, price: 500, mode: 'both', color: '#059669', icon: 'stethoscope',
      sortOrder: 1
    });
    await AppointmentType.create({
      organization: clinicOrg._id, name: 'Dental Check-up',
      description: 'Routine dental examination', duration: 30,
      bufferTime: 10, price: 1000, mode: 'in_person', color: '#0ea5e9', icon: 'smile',
      sortOrder: 2
    });
    await AppointmentType.create({
      organization: clinicOrg._id, name: 'Eye Examination',
      description: 'Comprehensive eye exam', duration: 25,
      bufferTime: 5, price: 800, mode: 'in_person', color: '#8b5cf6', icon: 'eye',
      sortOrder: 3
    });

    // Organization 3: Salon
    const salonOrg = await Organization.create({
      name: 'Glamour Studio', slug: 'glamour-studio',
      description: 'Premium beauty and wellness salon', category: 'salon',
      email: 'hello@glamourstudio.np', phone: '01-5443322',
      address: 'Thamel, Kathmandu', createdBy: superAdmin._id,
      branding: { primaryColor: '#be185d', secondaryColor: '#9d174d', accentColor: '#f59e0b' },
      settings: { allowGuestBooking: true, maxAdvanceBookingDays: 30 }
    });

    await Branch.create({
      organization: salonOrg._id, name: 'Thamel Studio', code: 'GS-THM',
      address: 'Thamel, Kathmandu', province: 'Bagmati', district: 'Kathmandu', city: 'Kathmandu',
      location: { type: 'Point', coordinates: [85.3103, 27.7150] },
      maxConcurrentBookings: 3,
    });

    await AppointmentType.create({
      organization: salonOrg._id, name: 'Haircut & Styling',
      duration: 45, bufferTime: 10, price: 1500, mode: 'in_person', color: '#be185d', sortOrder: 1
    });
    await AppointmentType.create({
      organization: salonOrg._id, name: 'Facial Treatment',
      duration: 60, bufferTime: 15, price: 2500, mode: 'in_person', color: '#f59e0b', sortOrder: 2
    });

    // Citizen users
    const citizen1 = await User.create({
      name: 'Bikash Tamang', email: 'bikash@gmail.com', phone: '9841000001',
      password: 'User@123', role: 'citizen', isEmailVerified: true
    });
    const citizen2 = await User.create({
      name: 'Priya Magar', email: 'priya@gmail.com', phone: '9841000002',
      password: 'User@123', role: 'citizen', isEmailVerified: true
    });

    // Sample Appointments
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today); dayAfter.setDate(dayAfter.getDate() + 2);
    const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate() + 7);

    await Appointment.create([
      {
        organization: irdOrg._id, branch: irdKtm._id, appointmentType: irdPAN._id,
        citizen: citizen1._id, date: tomorrow, startTime: '10:00', endTime: '10:30',
        duration: 30, status: 'confirmed', tokenNumber: 1,
        customFieldValues: new Map([['citizenship_no', '23-01-76-00001'], ['business_type', 'Individual']])
      },
      {
        organization: irdOrg._id, branch: irdKtm._id, appointmentType: irdTax._id,
        citizen: citizen2._id, date: tomorrow, startTime: '10:35', endTime: '11:20',
        duration: 45, status: 'confirmed', tokenNumber: 2, assignedStaff: irdStaff1._id
      },
      {
        organization: irdOrg._id, branch: irdKtm._id, appointmentType: irdClearance._id,
        guestName: 'Guest User', guestEmail: 'guest@test.com', guestPhone: '9800000001',
        date: tomorrow, startTime: '11:25', endTime: '11:45', duration: 20,
        status: 'pending', tokenNumber: 3, isGuest: true, price: 500
      },
      {
        organization: irdOrg._id, branch: irdKtm._id, appointmentType: irdPAN._id,
        citizen: citizen1._id, date: dayAfter, startTime: '14:00', endTime: '14:30',
        duration: 30, status: 'confirmed', tokenNumber: 1
      },
      {
        organization: irdOrg._id, branch: irdPkr._id, appointmentType: irdTax._id,
        guestName: 'Sunil Gurung', guestEmail: 'sunil@test.com',
        date: nextWeek, startTime: '10:00', endTime: '10:45', duration: 45,
        status: 'confirmed', tokenNumber: 1, isGuest: true
      },
    ]);

    // Staff Availability
    await StaffAvailability.create({
      user: irdStaff1._id,
      branch: irdKtm._id,
      weeklySchedule: [
        { day: 0, isAvailable: false },
        { day: 1, isAvailable: true, startTime: '10:00', endTime: '16:00', maxAppointments: 8 },
        { day: 2, isAvailable: true, startTime: '10:00', endTime: '16:00', maxAppointments: 8 },
        { day: 3, isAvailable: true, startTime: '10:00', endTime: '16:00', maxAppointments: 8 },
        { day: 4, isAvailable: true, startTime: '10:00', endTime: '16:00', maxAppointments: 8 },
        { day: 5, isAvailable: true, startTime: '10:00', endTime: '16:00', maxAppointments: 8 },
        { day: 6, isAvailable: false },
      ],
      dateOverrides: [
        { date: new Date('2026-05-01'), isAvailable: false, reason: 'Labour Day' },
      ],
    });

    await StaffAvailability.create({
      user: irdStaff2._id,
      branch: irdKtm._id,
      weeklySchedule: [0,1,2,3,4,5,6].map(d => ({
        day: d, isAvailable: d >= 1 && d <= 5, startTime: '09:00', endTime: '15:00', maxAppointments: 6,
      })),
    });

    // AppConfig
    await AppConfig.create({
      key: 'global',
      appName: 'QueueLess',
      tagline: 'Public Service, Fast Forward',
      defaultLanguage: 'en',
      supportedLanguages: ['en', 'ne'],
      theme: { primaryColor: '#2563eb', secondaryColor: '#1e40af', accentColor: '#f59e0b', darkMode: false },
      contact: { email: 'support@queueless.app', phone: '+977-1-4000000' },
      features: { guestBooking: true, feedbackEnabled: true, smsEnabled: false, multiLanguage: true },
    });

    // Sample Webhook
    await Webhook.create({
      organization: irdOrg._id,
      name: 'Sample Webhook (Disabled)',
      url: 'https://httpbin.org/post',
      events: ['appointment.created', 'appointment.confirmed', 'appointment.cancelled'],
      isActive: false,
    });

    // Sample Notification Templates
    await NotificationTemplate.insertMany([
      { organization: irdOrg._id, type: 'booking_confirmed', channel: 'email', subject: 'Booking Confirmed - {{refCode}}', bodyTemplate: 'Hello {{name}}, your appointment for {{service}} at {{branch}} on {{date}} at {{time}} is confirmed. Token: #{{token}}.', language: 'en' },
      { organization: irdOrg._id, type: 'booking_confirmed', channel: 'email', subject: 'बुकिङ पुष्टि - {{refCode}}', bodyTemplate: 'नमस्ते {{name}}, {{branch}} मा {{service}} को लागि {{date}} {{time}} मा तपाईंको अपोइन्टमेन्ट पुष्टि भएको छ। टोकन: #{{token}}।', language: 'ne' },
      { organization: irdOrg._id, type: 'booking_cancelled', channel: 'email', subject: 'Booking Cancelled - {{refCode}}', bodyTemplate: 'Hello {{name}}, your appointment {{refCode}} has been cancelled.', language: 'en' },
      { organization: irdOrg._id, type: 'booking_reminder', channel: 'email', subject: 'Reminder: Appointment Tomorrow - {{refCode}}', bodyTemplate: 'Hello {{name}}, reminder: your appointment at {{branch}} for {{service}} is tomorrow at {{time}}.', language: 'en' },
    ]);

    console.log('\n=== SEED DATA CREATED ===');
    console.log('\nLogin Credentials:');
    console.log('------------------------------------------');
    console.log('Super Admin:     admin@queueless.app / Admin@123');
    console.log('IRD Org Admin:   admin@ird.gov.np / Admin@123');
    console.log('IRD Br Manager:  ram@ird.gov.np / Staff@123');
    console.log('IRD Staff:       sita@ird.gov.np / Staff@123');
    console.log('Clinic Admin:    admin@ktmmedical.com / Admin@123');
    console.log('Citizen 1:       bikash@gmail.com / User@123');
    console.log('Citizen 2:       priya@gmail.com / User@123');
    console.log('------------------------------------------');
    console.log(`\nOrganizations: 3 (IRD, Kathmandu Medical, Glamour Studio)`);
    console.log(`Branches: 6`);
    console.log(`Appointment Types: 8`);
    console.log(`Sample Appointments: 5`);
    console.log('=========================\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
