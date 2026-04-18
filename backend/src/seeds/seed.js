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

    // --- 1. Organization: Inland Revenue Department (Government) ---
    const irdOrg = await Organization.create({
      name: 'Inland Revenue Department', nameNp: 'आन्तरिक राजस्व विभाग', slug: 'ird-nepal',
      description: 'Government tax service department of Nepal',
      category: 'government', email: 'info@ird.gov.np', phone: '01-4415802',
      address: 'Lazimpat, Kathmandu', createdBy: superAdmin._id,
      branding: { primaryColor: '#1e40af', secondaryColor: '#1e3a5f', accentColor: '#dc2626' },
      settings: { allowGuestBooking: true, requireApproval: false, maxAdvanceBookingDays: 30 }
    });

    const irdAdmin = await User.create({
      name: 'IRD Admin', email: 'admin@ird.gov.np',
      password: 'Admin@123', role: 'org_admin',
      organization: irdOrg._id, isEmailVerified: true
    });

    // IRD Branches
    const branchDataList = [
      { name: 'IRD Main Office, Lazimpat', nameNp: 'आन्तरिक राजस्व विभाग, लाजिम्पाट', code: 'IRD-10', address: 'Lazimpat, Kathmandu', lat: 27.7285, lng: 85.3239 },
      { name: 'IRO, Khumaltar', nameNp: 'आ.रा.का. खुमलटार', code: 'IRD-100', address: 'Bharatpur, Chitwan', lat: 27.6833, lng: 84.4333 },
      { name: 'IRO, Kalanki', nameNp: 'आन्तरिक राजस्व कार्यालय, कलंकी', code: 'IRD-104', address: 'Kalanki Chowk, Kathmandu', lat: 27.6931, lng: 85.2902 },
      { name: 'IRO, Koteshwor', nameNp: 'आन्तरिक राजस्व कार्यालय, कोटेश्वर', code: 'IRD-109', address: 'Koteshwor, Kathmandu', lat: 27.6859, lng: 85.3451 },
    ];

    const irdBranches = await Promise.all(branchDataList.map(b => Branch.create({
      organization: irdOrg._id, name: b.name, nameNp: b.nameNp, code: b.code,
      address: b.address, location: { type: 'Point', coordinates: [b.lng, b.lat] },
      maxConcurrentBookings: 15,
      workingHours: [
        { day: 0, isOpen: true, openTime: '10:00', closeTime: '15:00' },
        { day: 1, isOpen: true, openTime: '10:00', closeTime: '16:00' },
        { day: 2, isOpen: true, openTime: '10:00', closeTime: '16:00' },
        { day: 3, isOpen: true, openTime: '10:00', closeTime: '16:00' },
        { day: 4, isOpen: true, openTime: '10:00', closeTime: '16:00' },
        { day: 5, isOpen: true, openTime: '10:00', closeTime: '16:00' },
        { day: 6, isOpen: false, openTime: '10:00', closeTime: '13:00' },
      ]
    })));

    const irdKtm = irdBranches[0];

    // IRD Service Types
    const irdPAN = await AppointmentType.create({
      organization: irdOrg._id, name: 'PAN Registration', nameNp: 'प्यान दर्ता', roomNo: 'Room-102', roomNoNp: 'कोठा-१०२',
      duration: 30, color: '#2563eb', customFields: [{ name: 'citizenship', label: 'Citizenship No', type: 'text', required: true }]
    });
    const irdTax = await AppointmentType.create({
      organization: irdOrg._id, name: 'Tax Consultation', nameNp: 'कर परामर्श', roomNo: 'Section B', roomNoNp: 'खण्ड ख',
      duration: 45, color: '#059669'
    });

    // IRD Staff
    const irdStaff = await User.create({
      name: 'Sita Thapa', email: 'sita@ird.gov.np', password: 'Staff@123', role: 'staff',
      organization: irdOrg._id, branch: irdKtm._id, isEmailVerified: true
    });
    await StaffAvailability.create({
      user: irdStaff._id, branch: irdKtm._id,
      weeklySchedule: [0,1,2,3,4,5,6].map(d => ({ day:d, isAvailable:d>=1 && d<=5, startTime:'10:00', endTime:'16:00', maxAppointments:10 }))
    });

    // --- 2. Organization: Kathmandu Medical Center (Healthcare) ---
    const clinicOrg = await Organization.create({
      name: 'Kathmandu Medical Center', nameNp: 'काठमाडौं मेडिकल सेन्टर', slug: 'kmc-health',
      description: 'Multi-specialty private hospital', category: 'healthcare',
      address: 'New Baneshwor, Kathmandu', createdBy: superAdmin._id,
      branding: { primaryColor: '#059669', secondaryColor: '#047857', accentColor: '#0ea5e9' }
    });

    const clinicBranch = await Branch.create({
      organization: clinicOrg._id, name: 'Main Hospital', nameNp: 'मुख्य अस्पताल', code: 'KMC-MAIN',
      address: 'Baneshwor, KTM', location: { type: 'Point', coordinates: [85.3419, 27.6915] },
      maxConcurrentBookings: 10
    });

    const clinicStaff = await User.create({
      name: 'Dr. Anita KC', email: 'anita@kmc.com', password: 'Staff@123', role: 'staff',
      organization: clinicOrg._id, branch: clinicBranch._id, isEmailVerified: true
    });
    await StaffAvailability.create({
      user: clinicStaff._id, branch: clinicBranch._id,
      weeklySchedule: [0,1,2,3,4,5,6].map(d => ({ day:d, isAvailable:d!==6, startTime:'09:00', endTime:'17:00', maxAppointments:20 }))
    });

    const dentalType = await AppointmentType.create({
      organization: clinicOrg._id, name: 'Dental Check-up', nameNp: 'दाँत जाँच',
      duration: 30, price: 1000, color: '#0ea5e9'
    });

    // --- 3. Organization: Everest Bank (Finance) ---
    const bankOrg = await Organization.create({
      name: 'Everest Bank', nameNp: 'एभरेष्ट बैंक', slug: 'everest-bank',
      description: 'Leading commercial bank in Nepal', category: 'finance',
      address: 'Lazimpat, Kathmandu', createdBy: superAdmin._id,
      branding: { primaryColor: '#dc2626', secondaryColor: '#991b1b', accentColor: '#fcd34d' }
    });

    const bankBranch = await Branch.create({
      organization: bankOrg._id, name: 'Lazimpat Branch', nameNp: 'लाजिम्पाट शाखा', code: 'EBL-LAZ',
      address: 'Lazimpat, KTM', location: { type: 'Point', coordinates: [85.3235, 27.7280] },
      maxConcurrentBookings: 5
    });

    const loanType = await AppointmentType.create({
      organization: bankOrg._id, name: 'Home Loan Consultation', nameNp: 'घर कर्जा परामर्श',
      duration: 60, color: '#dc2626'
    });

    // --- 4. Generating Historical & Future Appointments (The "Robust" Part) ---
    console.log('Generating historical appointments for analytics...');
    const citizen = await User.create({
      name: 'Bikash Tamang', email: 'bikash@gmail.com', phone: '9841000001',
      password: 'User@123', role: 'citizen', isEmailVerified: true
    });

    const statuses = ['completed', 'cancelled', 'no_show', 'checked_in', 'confirmed'];
    const times = ['10:00', '11:00', '12:00', '14:00', '15:00'];
    const appointments = [];

    // Past 30 Days
    for (let i = 1; i <= 40; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (i % 30));
        date.setHours(0,0,0,0);
        
        const status = i % 10 === 0 ? 'cancelled' : (i % 7 === 0 ? 'no_show' : 'completed');
        
        appointments.push({
            organization: irdOrg._id,
            branch: irdKtm._id,
            appointmentType: (i % 2 === 0 ? irdPAN._id : irdTax._id),
            citizen: citizen._id,
            date,
            startTime: times[i % 5],
            endTime: '11:00', // simplistic
            duration: 30,
            status,
            bookedBy: citizen._id,
            tokenNumber: (i % 5) + 1,
            branchCode: irdKtm.code,
            refCode: `QL-IRD-${Math.random().toString(36).substring(7).toUpperCase()}`,
            completedAt: status === 'completed' ? date : undefined
        });
    }

    // Upcoming
    for (let i = 1; i <= 10; i++) {
        const date = new Date();
        date.setDate(date.getDate() + (i % 7));
        date.setHours(0,0,0,0);
        
        appointments.push({
            organization: irdOrg._id,
            branch: irdKtm._id,
            appointmentType: irdPAN._id,
            citizen: citizen._id,
            date,
            startTime: '10:00',
            endTime: '10:30',
            duration: 30,
            status: 'confirmed',
            bookedBy: citizen._id,
            tokenNumber: 1,
            branchCode: irdKtm.code,
            refCode: `QL-IRD-FUT${i}`
        });
    }

    await Appointment.insertMany(appointments);

    // --- 5. Global Config & Templates ---
    await AppConfig.create({
      key: 'global', appName: 'QueueLess', tagline: 'Public Service, Fast Forward',
      defaultLanguage: 'en', supportedLanguages: ['en', 'ne'],
      features: { guestBooking: true, feedbackEnabled: true, multiLanguage: true },
    });

    await NotificationTemplate.insertMany([
      { organization: irdOrg._id, type: 'booking_confirmed', channel: 'email', subject: 'Booking Confirmed - {{refCode}}', bodyTemplate: 'Hello {{name}}, your appointment is confirmed for {{date}} at {{time}}.', language: 'en' },
      { organization: irdOrg._id, type: 'booking_confirmed', channel: 'email', subject: 'बुकिङ पुष्टि - {{refCode}}', bodyTemplate: 'नमस्ते {{name}}, तपाईंको बुकिङ {{date}} {{time}} मा सुनिश्चित भएको छ।', language: 'ne' },
    ]);

    console.log('\n=== SEED DATA CREATED ===');
    console.log('Historical Data: 40 appointments created for Admin Charts');
    console.log('Finance Org: Everest Bank added');
    console.log('Healthcare: Kathmandu Medical Center fully bookable');
    console.log('Login: admin@queueless.app / Admin@123');
    console.log('=========================\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
