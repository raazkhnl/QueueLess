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
      name: 'Inland Revenue Department', nameNp: 'आन्तरिक राजस्व विभाग', slug: 'ird-nepal',
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
    const branchDataList = [
      { name: 'Internal Revenue Department Main Office, Lazimpat', nameNp: 'आन्तरिक राजस्व विभाग, लाजिम्पाट', code: 'IRD-10', address: 'Lazimpat, Kathmandu', lat: 27.7285, lng: 85.3239 },
      { name: 'Inland Revenue Office, Khumaltar, Chitwan', nameNp: 'आ.रा.का. खुमलटार चितवन', code: 'IRD-100', address: 'Bharatpur, Chitwan', lat: 27.6833, lng: 84.4333 },
      { name: 'Inland Revenue Office, Gangotri', nameNp: 'आ.रा.का. गंगोत्री', code: 'IRD-101', address: 'Gangotri Marg, Biratnagar', lat: 26.4535, lng: 87.2832 },
      { name: 'Inland Revenue Office, Bardiya', nameNp: 'आ.रा.का. बर्दिया', code: 'IRD-102', address: 'Gulariya, Bardiya', lat: 28.1333, lng: 81.3333 },
      { name: 'Inland Revenue Office, Jhatti', nameNp: 'आन्तरिक राजस्व कार्यालय, झट्टी', code: 'IRD-103', address: 'Jhatti, Morang', lat: 26.5000, lng: 87.3500 },
      { name: 'Inland Revenue Office, Kalanki', nameNp: 'आन्तरिक राजस्व कार्यालय, कलंकी', code: 'IRD-104', address: 'Kalanki Chowk, Kathmandu', lat: 27.6931, lng: 85.2902 },
      { name: 'Inland Revenue Office, Kalimati', nameNp: 'आन्तरिक राजस्व कार्यालय, कालिमाटी', code: 'IRD-105', address: 'Kalimati, Kathmandu', lat: 27.7000, lng: 85.3000 },
      { name: 'Inland Revenue Office, Kapan', nameNp: 'आन्तरिक राजस्व कार्यालय, कपन', code: 'IRD-106', address: 'Kapan, Kathmandu', lat: 27.7400, lng: 85.3500 },
      { name: 'Inland Revenue Office, Krishnanagar', nameNp: 'आन्तरिक राजस्व कार्यालय, कृष्णनगर', code: 'IRD-107', address: 'Krishnanagar, Kapilvastu', lat: 27.5200, lng: 83.0500 },
      { name: 'Inland Revenue Office, Kanchanpur', nameNp: 'आन्तरिक राजस्व कार्यालय, कञ्चनपुर', code: 'IRD-108', address: 'Mahendranagar, Kanchanpur', lat: 28.6890, lng: 80.5560 },
      { name: 'Inland Revenue Office, Koteshwor', nameNp: 'आन्तरिक राजस्व कार्यालय, कोटेश्वर', code: 'IRD-109', address: 'Koteshwor, Kathmandu', lat: 27.6859, lng: 85.3451 },
      { name: 'Inland Revenue Office, Chabahil', nameNp: 'आन्तरिक राजस्व कार्यालय, चाबहिल', code: 'IRD-110', address: 'Chabahil, Kathmandu', lat: 27.7176, lng: 85.3440 },
      { name: 'Inland Revenue Office, Janakpur', nameNp: 'आन्तरिक राजस्व कार्यालय, जनकपुर', code: 'IRD-111', address: 'Ramananda Chowk, Janakpur', lat: 26.7280, lng: 85.9240 },
      { name: 'Inland Revenue Office, Jumla', nameNp: 'आन्तरिक राजस्व कार्यालय, जुम्ला', code: 'IRD-112', address: 'Khalanga, Jumla', lat: 29.2800, lng: 82.1830 },
      { name: 'Inland Revenue Office, Tangal', nameNp: 'आन्तरिक राजस्व कार्यालय, टङ्गल', code: 'IRD-113', address: 'Tangal, Kathmandu', lat: 27.7170, lng: 85.3240 },
      { name: 'Inland Revenue Office, Nagarpalika', nameNp: 'आन्तरिक राजस्व कार्यालय, नगरपालिक', code: 'IRD-114', address: 'Municipal Complex, Bhaktapur', lat: 27.6710, lng: 85.4290 },
      { name: 'District Treasury Controller Office, Kolenika', nameNp: 'जिल्ला कोष तथा लेखा नियन्त्रण कार्यालय, कोलेनिका', code: 'IRD-1001', address: 'Kolenika, Lalitpur', lat: 27.6500, lng: 85.3200 }
    ];

    const irdBranches = await Promise.all(branchDataList.map(b => Branch.create({
      organization: irdOrg._id, name: b.name, nameNp: b.nameNp, code: b.code,
      address: b.address,
      location: { type: 'Point', coordinates: [b.lng, b.lat] },
      maxConcurrentBookings: 10,
      phone: '01-4415802', email: 'hello@ird.gov.np',
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
    })));

    const irdKtm = irdBranches[0];
    const irdPkr = irdBranches[1];
    const irdBrt = irdBranches[2];

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
      organization: irdOrg._id, name: 'PAN Registration', nameNp: 'प्यान दर्ता',
      roomNo: 'Room-102', roomNoNp: 'कोठा-१०२',
      description: 'Register for Permanent Account Number', duration: 30,
      bufferTime: 5, price: 0, mode: 'in_person', color: '#2563eb', icon: 'file-text',
      customFields: [
        { name: 'citizenship_no', label: 'Citizenship Number', type: 'text', required: true },
        { name: 'business_type', label: 'Business Type', type: 'select', required: true, options: ['Individual', 'Sole Proprietor', 'Partnership', 'Company'] },
      ],
      sortOrder: 1
    });

    const irdTax = await AppointmentType.create({
      organization: irdOrg._id, name: 'Tax Filing Consultation', nameNp: 'कर दाखिला परामर्श',
      roomNo: 'Section B', roomNoNp: 'खण्ड ख',
      description: 'Consult with tax officer for filing support', duration: 45,
      bufferTime: 10, price: 0, mode: 'both', color: '#059669', icon: 'calculator',
      sortOrder: 2
    });

    const irdClearance = await AppointmentType.create({
      organization: irdOrg._id, name: 'Tax Clearance Certificate', nameNp: 'कर चुक्ता प्रमाणपत्र',
      roomNo: 'Room-101 Service Section', roomNoNp: 'कोठा-१०१ सेवा खण्ड',
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
