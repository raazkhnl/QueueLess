/**
 * Slot Generation Service
 * Generates available booking slots based on branch hours, service hours,
 * holidays, date overrides, and existing bookings (overbooking prevention).
 */
const Branch = require('../models/Branch');
const Appointment = require('../models/Appointment');
const AppointmentType = require('../models/AppointmentType');

const parseTime = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const formatTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const generateSlots = async ({ branchId, appointmentTypeId, date }) => {
  const branch = await Branch.findById(branchId);
  if (!branch || !branch.isActive) throw new Error('Branch not found or inactive');

  const apptType = await AppointmentType.findById(appointmentTypeId);
  if (!apptType || !apptType.isActive) throw new Error('Appointment type not found or inactive');
  if (apptType.isSuspended) return []; // Suspended services return no slots

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  const dayOfWeek = targetDate.getDay();

  // Check holiday
  const isHoliday = branch.holidays.some(h => {
    const hDate = new Date(h.date); hDate.setHours(0, 0, 0, 0);
    return hDate.getTime() === targetDate.getTime();
  });
  if (isHoliday) return [];

  // Check date override on branch
  const override = branch.dateOverrides.find(o => {
    const oDate = new Date(o.date); oDate.setHours(0, 0, 0, 0);
    return oDate.getTime() === targetDate.getTime();
  });

  let openTime, closeTime, breakStart, breakEnd;

  // Determine hours: service custom hours > date override > branch default
  if (apptType.useCustomHours && apptType.customHours?.length > 0) {
    const svcDay = apptType.customHours.find(h => h.day === dayOfWeek);
    if (!svcDay || !svcDay.isOpen) return [];
    openTime = svcDay.openTime;
    closeTime = svcDay.closeTime;
    breakStart = svcDay.breakStart;
    breakEnd = svcDay.breakEnd;
  } else if (override) {
    if (!override.isOpen) return [];
    openTime = override.openTime;
    closeTime = override.closeTime;
  } else {
    const daySchedule = branch.workingHours.find(w => w.day === dayOfWeek);
    if (!daySchedule || !daySchedule.isOpen) return [];
    openTime = daySchedule.openTime;
    closeTime = daySchedule.closeTime;
    breakStart = daySchedule.breakStart;
    breakEnd = daySchedule.breakEnd;
  }

  const startMin = parseTime(openTime);
  const endMin = parseTime(closeTime);
  const duration = apptType.duration;
  const buffer = apptType.bufferTime || 0;
  const slotSize = duration + buffer;
  const breakStartMin = breakStart ? parseTime(breakStart) : null;
  const breakEndMin = breakEnd ? parseTime(breakEnd) : null;

  // Get existing bookings
  const dayStart = new Date(targetDate);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  const existingBookings = await Appointment.find({
    branch: branchId,
    date: { $gte: dayStart, $lte: dayEnd },
    status: { $nin: ['cancelled', 'no_show'] }
  }).lean();

  const bookingCountPerSlot = {};
  existingBookings.forEach(b => {
    bookingCountPerSlot[b.startTime] = (bookingCountPerSlot[b.startTime] || 0) + 1;
  });

  const maxPerSlot = Math.min(
    apptType.maxBookingsPerSlot || 1,
    branch.maxConcurrentBookings || 5
  );

  const slots = [];
  const now = new Date();

  for (let current = startMin; current + duration <= endMin; current += slotSize) {
    // Skip break
    if (breakStartMin !== null && breakEndMin !== null) {
      if (current >= breakStartMin && current < breakEndMin) continue;
      if (current < breakStartMin && current + duration > breakStartMin) continue;
    }

    const slotTime = formatTime(current);
    const slotEndTime = formatTime(current + duration);
    const booked = bookingCountPerSlot[slotTime] || 0;
    const available = booked < maxPerSlot;

    const slotDateTime = new Date(targetDate);
    slotDateTime.setHours(Math.floor(current / 60), current % 60, 0, 0);
    const isPast = slotDateTime <= now;

    slots.push({
      startTime: slotTime, endTime: slotEndTime,
      available: available && !isPast,
      bookedCount: booked, maxBookings: maxPerSlot, isPast,
    });
  }

  return slots;
};

module.exports = { generateSlots };
