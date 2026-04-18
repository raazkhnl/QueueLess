const Appointment = require('../models/Appointment');
// Valid status transitions
const VALID_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled', 'no_show', 'rescheduled'],
  checked_in: ['in_progress', 'completed', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [], // terminal
  cancelled: [], // terminal
  no_show: ['confirmed'], // allow re-confirm
  rescheduled: ['confirmed', 'cancelled'],
};


const AppointmentType = require('../models/AppointmentType');
const Branch = require('../models/Branch');
const Organization = require('../models/Organization');
const { generateSlots } = require('../services/slotService');
const { generateAppointmentPDF } = require('../services/pdfService');
const { sendEmail, emailTemplates } = require('../services/emailService');
const { logAction } = require('../utils/auditLog');
const { triggerWebhooks } = require('../services/webhookService');

exports.getSlots = async (req, res, next) => {
  try {
    const { branchId, appointmentTypeId, date } = req.query;
    if (!branchId || !appointmentTypeId || !date) {
      return res.status(400).json({ message: 'branchId, appointmentTypeId, and date are required' });
    }
    const slots = await generateSlots({ branchId, appointmentTypeId, date });
    res.json({ slots, date });
  } catch (error) { next(error); }
};

exports.book = async (req, res, next) => {
  try {
    const { organization, branch, appointmentType, date, startTime, endTime,
      mode, guestName, guestEmail, guestPhone, notes, customFieldValues, externalSubmissionNo, sourceSystem } = req.body;

    if (!organization || !branch || !appointmentType || !date || !startTime || !endTime) {
      return res.status(400).json({ message: 'Missing required booking fields' });
    }

    // Validate date is not in the past
    const bookingDate = new Date(date);
    bookingDate.setHours(23, 59, 59, 999);
    if (bookingDate < new Date()) {
      return res.status(400).json({ message: 'Cannot book appointments in the past' });
    }

    // Idempotency: prevent duplicate booking within 30s for same user+branch+slot
    const idempotencyWindow = new Date(Date.now() - 30 * 1000);
    const citizenId = req.user?._id;
    const dupeQuery = {
      branch, appointmentType, date: new Date(date), startTime,
      createdAt: { $gte: idempotencyWindow },
      status: { $nin: ['cancelled'] },
    };
    if (citizenId) dupeQuery.citizen = citizenId;
    else if (guestEmail) dupeQuery.guestEmail = guestEmail;
    else if (guestPhone) dupeQuery.guestPhone = guestPhone;
    const duplicate = await Appointment.findOne(dupeQuery);
    if (duplicate) {
      const populated = await Appointment.findById(duplicate._id)
        .populate('branch', 'name address location phone email')
        .populate('appointmentType', 'name duration')
        .populate('organization', 'name email phone');
      return res.status(200).json({ appointment: populated, deduplicated: true });
    }

    const slots = await generateSlots({ branchId: branch, appointmentTypeId: appointmentType, date });
    const slot = slots.find(s => s.startTime === startTime);
    if (!slot || !slot.available) {
      return res.status(409).json({ message: 'Selected slot is no longer available' });
    }

    const apptType = await AppointmentType.findById(appointmentType);
    if (apptType.isSuspended) return res.status(400).json({ message: 'This service is temporarily suspended' });
    const orgDoc = await Organization.findById(organization);
    const branchDoc = await Branch.findById(branch);

    const appointmentData = {
      organization, branch, appointmentType, date: new Date(date),
      startTime, endTime, duration: apptType.duration,
      mode: mode || (apptType.mode === 'both' ? 'in_person' : apptType.mode),
      branchCode: branchDoc?.code || 'XX',
      price: apptType.price, notes,
      customFieldValues: customFieldValues ? new Map(Object.entries(customFieldValues)) : undefined,
      status: (apptType.requiresApproval || orgDoc?.settings?.requireApproval) ? 'pending' : 'confirmed',
      roomNo: apptType.roomNo,
      roomNoNp: apptType.roomNoNp,
      externalSubmissionNo,
      sourceSystem,
    };

    // Check if org allows guest booking
    if (!req.user && orgDoc?.settings?.allowGuestBooking === false) {
      return res.status(403).json({ message: 'This organization does not allow guest bookings. Please create an account.' });
    }

    if (req.user) {
      appointmentData.citizen = req.user._id;
      appointmentData.bookedBy = req.user._id;
      appointmentData.isGuest = false;
    } else {
      if (!guestName || (!guestEmail && !guestPhone)) {
        return res.status(400).json({ message: 'Guest name and email/phone required' });
      }
      appointmentData.guestName = guestName;
      appointmentData.guestEmail = guestEmail;
      appointmentData.guestPhone = guestPhone;
      appointmentData.isGuest = true;
    }

    const appointment = await Appointment.create(appointmentData);
    const populated = await Appointment.findById(appointment._id)
      .populate('branch', 'name address location phone email')
      .populate('appointmentType', 'name duration')
      .populate('organization', 'name email phone');

    const email = req.user?.email || guestEmail;
    if (email) {
      try {
        const template = emailTemplates.bookingConfirmed({
          name: req.user?.name || guestName,
          refCode: appointment.refCode,
          serviceName: populated.appointmentType.name,
          branchName: populated.branch.name,
          date: new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          startTime, endTime, tokenNumber: appointment.tokenNumber,
        });
        await sendEmail({ to: email, subject: template.subject, html: template.html });
      } catch (e) { console.error('Email failed:', e.message); }
    }

    triggerWebhooks(organization, 'appointment.created', populated).catch(() => {});

    res.status(201).json({ appointment: populated });
  } catch (error) { next(error); }
};

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, branch, organization, status, date, dateFrom, dateTo, search, assignedStaff } = req.query;
    const query = {};

    if (req.user.role === 'citizen') query.citizen = req.user._id;
    else if (req.user.role === 'staff') query.assignedStaff = req.user._id;
    else if (req.user.role === 'branch_manager') query.branch = req.user.branch;
    else if (req.user.role === 'org_admin') query.organization = req.user.organization;

    if (branch) query.branch = branch;
    if (organization) query.organization = organization;
    if (status) query.status = { $in: status.split(',') };
    if (assignedStaff) query.assignedStaff = assignedStaff;
    if (date) {
      const d = new Date(date);
      query.date = { $gte: new Date(d.setHours(0,0,0,0)), $lte: new Date(new Date(date).setHours(23,59,59,999)) };
    }
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }
    if (search) {
      query.$or = [
        { refCode: { $regex: search, $options: 'i' } },
        { guestName: { $regex: search, $options: 'i' } },
        { guestEmail: { $regex: search, $options: 'i' } },
        { guestPhone: { $regex: search, $options: 'i' } },
      ];
    }

    const appointments = await Appointment.find(query)
      .populate('organization', 'name email phone')
      .populate('branch', 'name code address location phone email')
      .populate('appointmentType', 'name color icon duration price mode customFields')
      .populate('citizen', 'name email phone')
      .populate('assignedStaff', 'name email')
      .sort({ date: -1, startTime: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    const total = await Appointment.countDocuments(query);

    res.json({ appointments, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

// Public: lookup by email or phone (for logged-in citizen)
exports.getMyByContact = async (req, res, next) => {
  try {
    const { email, phone } = req.query;
    if (!email && !phone) return res.status(400).json({ message: 'Email or phone required' });

    const query = { $or: [] };
    if (email) {
      query.$or.push({ guestEmail: email });
    }
    if (phone) {
      query.$or.push({ guestPhone: phone });
    }
    if (req.user) {
      query.$or.push({ citizen: req.user._id });
    }

    const appointments = await Appointment.find(query)
      .populate('organization', 'name')
      .populate('branch', 'name address phone')
      .populate('appointmentType', 'name color duration price')
      .sort({ date: -1 })
      .limit(50)
      .lean();

    res.json({ appointments });
  } catch (error) { next(error); }
};

exports.getByRefCode = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({ refCode: req.params.refCode })
      .populate('organization', 'name slug branding email phone address')
      .populate('branch', 'name address location phone email')
      .populate('appointmentType', 'name description duration price mode color icon customFields')
      .populate('citizen', 'name email phone')
      .populate('assignedStaff', 'name');
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    res.json({ appointment });
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('organization', 'name slug branding settings email phone address')
      .populate('branch', 'name address location phone email workingHours')
      .populate('appointmentType', 'name description duration price mode color icon customFields')
      .populate('citizen', 'name email phone')
      .populate('assignedStaff', 'name email')
      .populate('bookedBy', 'name');
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    res.json({ appointment });
  } catch (error) { next(error); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status, internalNotes, cancellationReason, assignedStaff } = req.body;
    
    // Validate status transition
    if (status) {
      const current = await Appointment.findById(req.params.id);
      if (!current) return res.status(404).json({ message: 'Appointment not found' });
      const allowed = VALID_TRANSITIONS[current.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({ 
          message: `Cannot change status from "${current.status}" to "${status}". Allowed: ${allowed.join(', ') || 'none (terminal state)'}` 
        });
      }
    }

    const update = {};
    if (status) update.status = status;
    if (internalNotes !== undefined) update.internalNotes = internalNotes;
    if (cancellationReason) update.cancellationReason = cancellationReason;
    if (assignedStaff) update.assignedStaff = assignedStaff;
    if (status === 'cancelled') update.cancelledAt = new Date();
    if (status === 'checked_in') update.checkedInAt = new Date();
    if (status === 'completed') update.completedAt = new Date();

    const appointment = await Appointment.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('branch', 'name').populate('appointmentType', 'name').populate('citizen', 'name email');
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    logAction(req, { action: 'status_change', resource: 'appointment', resourceId: appointment._id, details: `Status → ${status}`, metadata: { oldStatus: req.body._oldStatus, newStatus: status } });

    if (status === 'cancelled') {
      const emailTo = appointment.citizen?.email || appointment.guestEmail;
      if (emailTo) {
        try {
          const template = emailTemplates.bookingCancelled({
            name: appointment.citizen?.name || appointment.guestName,
            refCode: appointment.refCode, serviceName: appointment.appointmentType.name,
            date: new Date(appointment.date).toLocaleDateString(),
            startTime: appointment.startTime, reason: cancellationReason,
          });
          await sendEmail({ to: emailTo, subject: template.subject, html: template.html });
        } catch (e) { console.error('Email failed:', e.message); }
      }
    }

    triggerWebhooks(appointment.organization, 'appointment.status_changed', appointment).catch(() => {});
    if (status === 'completed') triggerWebhooks(appointment.organization, 'appointment.completed', appointment).catch(() => {});
    if (status === 'cancelled') triggerWebhooks(appointment.organization, 'appointment.cancelled', appointment).catch(() => {});
    if (status === 'checked_in') triggerWebhooks(appointment.organization, 'appointment.checked_in', appointment).catch(() => {});

    res.json({ appointment });
  } catch (error) { next(error); }
};

exports.cancel = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    if (req.user && appointment.citizen && appointment.citizen.toString() !== req.user._id.toString()) {
      if (req.user.role === 'citizen') return res.status(403).json({ message: 'Not your appointment' });
    }
    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date();
    appointment.cancellationReason = req.body.reason || 'Cancelled by user';
    await appointment.save();
    
    triggerWebhooks(appointment.organization, 'appointment.cancelled', appointment).catch(() => {});
    
    res.json({ appointment });
  } catch (error) { next(error); }
};

// Reschedule: citizen or admin
exports.reschedule = async (req, res, next) => {
  try {
    const { date, startTime, endTime } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    // Citizens can only reschedule their own
    if (req.user.role === 'citizen' && appointment.citizen?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not your appointment' });
    }

    const slots = await generateSlots({ branchId: appointment.branch, appointmentTypeId: appointment.appointmentType, date });
    const slot = slots.find(s => s.startTime === startTime);
    if (!slot || !slot.available) return res.status(409).json({ message: 'Slot not available' });

    const oldDate = appointment.date;
    const oldTime = appointment.startTime;
    appointment.date = new Date(date);
    appointment.startTime = startTime;
    appointment.endTime = endTime;
    appointment.status = 'confirmed';
    await appointment.save();

    logAction(req, { action: 'reschedule', resource: 'appointment', resourceId: appointment._id, details: `Rescheduled from ${oldDate} ${oldTime} to ${date} ${startTime}` });

    const populated = await Appointment.findById(appointment._id)
      .populate('branch', 'name').populate('appointmentType', 'name');
      
    triggerWebhooks(appointment.organization, 'appointment.rescheduled', populated).catch(() => {});

    res.json({ appointment: populated });
  } catch (error) { next(error); }
};

// Shift appointment: move to next day or by interval (admin only)
exports.shiftAppointment = async (req, res, next) => {
  try {
    const { shiftDays = 1, reason } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    const newDate = new Date(appointment.date);
    newDate.setDate(newDate.getDate() + parseInt(shiftDays));

    // Verify the slot on the new date
    const slots = await generateSlots({ branchId: appointment.branch, appointmentTypeId: appointment.appointmentType, date: newDate.toISOString().split('T')[0] });
    const slot = slots.find(s => s.startTime === appointment.startTime);

    if (!slot || !slot.available) {
      // Find next available slot on new date
      const availableSlot = slots.find(s => s.available);
      if (!availableSlot) {
        return res.status(409).json({ message: `No available slots on ${newDate.toLocaleDateString()}. Try a different shift interval.` });
      }
      appointment.startTime = availableSlot.startTime;
      appointment.endTime = availableSlot.endTime;
    }

    const oldDate = appointment.date;
    appointment.date = newDate;
    appointment.status = 'confirmed';
    appointment.internalNotes = `${appointment.internalNotes || ''}\nShifted by ${shiftDays} day(s): ${reason || 'No reason provided'}`.trim();
    await appointment.save();

    logAction(req, { action: 'reschedule', resource: 'appointment', resourceId: appointment._id, details: `Shifted ${shiftDays} days from ${oldDate}`, metadata: { shiftDays, reason } });

    // Notify citizen (guest OR registered user)
    const apt = await Appointment.findById(appointment._id)
      .populate('appointmentType', 'name').populate('branch', 'name').populate('citizen', 'name email');
    const email = apt.citizen?.email || appointment.guestEmail;
    if (email) {
      try {
        const template = emailTemplates.bookingConfirmed({
          name: apt.citizen?.name || appointment.guestName || 'User',
          refCode: appointment.refCode, serviceName: apt.appointmentType?.name || '',
          branchName: apt.branch?.name || '', date: newDate.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }),
          startTime: appointment.startTime, endTime: appointment.endTime, tokenNumber: appointment.tokenNumber,
        });
        template.subject = `Appointment Rescheduled - ${appointment.refCode}`;
        await sendEmail({ to: email, subject: template.subject, html: template.html });
      } catch (e) { console.error('Email failed:', e.message); }
    }

    const populated = await Appointment.findById(appointment._id)
      .populate('branch', 'name address phone')
      .populate('appointmentType', 'name')
      .populate('citizen', 'name email');
      
    triggerWebhooks(appointment.organization, 'appointment.rescheduled', populated).catch(() => {});

    res.json({ appointment: populated });
  } catch (error) { next(error); }
};

// Bulk shift: move all appointments on a date to next day (admin)
exports.bulkShift = async (req, res, next) => {
  try {
    const { branch, fromDate, shiftDays = 1, reason } = req.body;
    if (!branch || !fromDate) return res.status(400).json({ message: 'branch and fromDate required' });

    const dayStart = new Date(fromDate); dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(fromDate); dayEnd.setHours(23,59,59,999);

    const appointments = await Appointment.find({
      branch, date: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['pending', 'confirmed'] },
    });

    let shifted = 0, failed = 0;
    for (const apt of appointments) {
      try {
        const newDate = new Date(apt.date);
        newDate.setDate(newDate.getDate() + parseInt(shiftDays));
        apt.date = newDate;
        apt.internalNotes = `${apt.internalNotes || ''}\nBulk shifted ${shiftDays} day(s): ${reason || ''}`.trim();
        await apt.save();
        shifted++;
      } catch { failed++; }
    }

    logAction(req, { action: 'reschedule', resource: 'appointment', details: `Bulk shift ${shifted} appointments from ${fromDate} by ${shiftDays} days`, metadata: { branch, fromDate, shiftDays, shifted, failed } });

    res.json({ message: `Shifted ${shifted} appointments, ${failed} failed`, shifted, failed });
  } catch (error) { next(error); }
};

// Bulk cancel appointments (admin)
exports.bulkCancel = async (req, res, next) => {
  try {
    const { appointmentIds, reason } = req.body;
    if (!appointmentIds?.length) return res.status(400).json({ message: 'appointmentIds required' });
    
    let cancelled = 0, failed = 0;
    for (const id of appointmentIds) {
      try {
        const apt = await Appointment.findById(id);
        if (!apt || ['cancelled','completed','no_show'].includes(apt.status)) { failed++; continue; }
        apt.status = 'cancelled';
        apt.cancelledAt = new Date();
        apt.cancellationReason = reason || 'Bulk cancelled by admin';
        await apt.save();
        cancelled++;
        
        // Non-blocking email notification (guest OR registered user)
        const populated = await Appointment.findById(id).populate('appointmentType', 'name').populate('citizen', 'name email');
        const email = populated?.citizen?.email || apt.guestEmail;
        if (email) {
          const template = emailTemplates.bookingCancelled({
            name: populated?.citizen?.name || apt.guestName || 'User', refCode: apt.refCode,
            serviceName: populated?.appointmentType?.name || '', date: new Date(apt.date).toLocaleDateString(),
            startTime: apt.startTime, reason: reason || 'Cancelled by admin',
          });
          sendEmail({ to: email, subject: template.subject, html: template.html }).catch(() => {});
        }
      } catch { failed++; }
    }
    
    logAction(req, { action: 'cancel', resource: 'appointment', details: `Bulk cancelled ${cancelled} appointments`, metadata: { cancelled, failed, reason } });
    res.json({ message: `Cancelled ${cancelled}, failed ${failed}`, cancelled, failed });
  } catch (error) { next(error); }
};

// Bulk reschedule appointments (admin)
exports.bulkReschedule = async (req, res, next) => {
  try {
    const { appointmentIds, shiftDays = 1, reason } = req.body;
    if (!appointmentIds?.length) return res.status(400).json({ message: 'appointmentIds required' });
    
    let shifted = 0, failed = 0;
    for (const id of appointmentIds) {
      try {
        const apt = await Appointment.findById(id);
        if (!apt || ['cancelled','completed','no_show'].includes(apt.status)) { failed++; continue; }
        
        const newDate = new Date(apt.date);
        newDate.setDate(newDate.getDate() + parseInt(shiftDays));
        apt.date = newDate;
        apt.internalNotes = (apt.internalNotes || '') + `\nBulk shifted ${shiftDays}d: ${reason || ''}`.trim();
        await apt.save();
        shifted++;
        
        // Non-blocking notification (guest OR registered user)
        const populated = await Appointment.findById(id).populate('appointmentType', 'name').populate('branch', 'name').populate('citizen', 'name email');
        const email = populated?.citizen?.email || apt.guestEmail;
        if (email) {
          const template = emailTemplates.bookingConfirmed({
            name: populated?.citizen?.name || apt.guestName || 'User', refCode: apt.refCode,
            serviceName: populated?.appointmentType?.name || '', branchName: populated?.branch?.name || '',
            date: newDate.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }),
            startTime: apt.startTime, endTime: apt.endTime, tokenNumber: apt.tokenNumber,
          });
          template.subject = 'Appointment Rescheduled - ' + apt.refCode;
          sendEmail({ to: email, subject: template.subject, html: template.html }).catch(() => {});
        }
      } catch { failed++; }
    }
    
    logAction(req, { action: 'reschedule', resource: 'appointment', details: `Bulk shifted ${shifted} by ${shiftDays}d`, metadata: { shifted, failed, shiftDays, reason } });
    res.json({ message: `Shifted ${shifted}, failed ${failed}`, shifted, failed });
  } catch (error) { next(error); }
};

exports.downloadPDF = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id).lean();
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    const [org, branch, apptType] = await Promise.all([
      Organization.findById(appointment.organization).lean(),
      Branch.findById(appointment.branch).lean(),
      AppointmentType.findById(appointment.appointmentType).lean(),
    ]);
    const pdfBuffer = await generateAppointmentPDF(appointment, org, branch, apptType);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename=appointment-${appointment.refCode}.pdf`, 'Content-Length': pdfBuffer.length });
    res.send(pdfBuffer);
  } catch (error) { next(error); }
};

exports.downloadPDFByRef = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({ refCode: req.params.refCode }).lean();
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    const [org, branch, apptType] = await Promise.all([
      Organization.findById(appointment.organization).lean(),
      Branch.findById(appointment.branch).lean(),
      AppointmentType.findById(appointment.appointmentType).lean(),
    ]);
    const pdfBuffer = await generateAppointmentPDF(appointment, org, branch, apptType);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename=appointment-${appointment.refCode}.pdf`, 'Content-Length': pdfBuffer.length });
    res.send(pdfBuffer);
  } catch (error) { next(error); }
};

exports.getCalendarEvents = async (req, res, next) => {
  try {
    const { start, end, branch } = req.query;
    const query = { status: { $nin: ['cancelled'] } };
    if (start) query.date = { $gte: new Date(start) };
    if (end) query.date = { ...query.date, $lte: new Date(end) };
    if (req.user.role === 'staff') query.assignedStaff = req.user._id;
    else if (req.user.role === 'branch_manager') query.branch = req.user.branch;
    else if (req.user.role === 'org_admin') query.organization = req.user.organization;
    if (branch) query.branch = branch;

    const appointments = await Appointment.find(query)
      .populate('appointmentType', 'name color duration')
      .populate('citizen', 'name').populate('branch', 'name').lean();

    const events = appointments.map(a => ({
      id: a._id, title: `${a.appointmentType?.name} - ${a.citizen?.name || a.guestName || 'Guest'}`,
      start: `${new Date(a.date).toISOString().split('T')[0]}T${a.startTime}:00`,
      end: `${new Date(a.date).toISOString().split('T')[0]}T${a.endTime}:00`,
      color: a.appointmentType?.color || '#2563eb',
      extendedProps: { refCode: a.refCode, status: a.status, tokenNumber: a.tokenNumber, branchName: a.branch?.name, mode: a.mode },
    }));
    res.json({ events });
  } catch (error) { next(error); }
};

exports.exportICal = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('appointmentType', 'name').populate('branch', 'name address').lean();
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    const dateStr = new Date(appointment.date).toISOString().split('T')[0].replace(/-/g, '');
    const startStr = appointment.startTime.replace(':', '') + '00';
    const endStr = appointment.endTime.replace(':', '') + '00';
    const ical = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//QueueLess//EN\r\nBEGIN:VEVENT\r\nDTSTART:${dateStr}T${startStr}\r\nDTEND:${dateStr}T${endStr}\r\nSUMMARY:${appointment.appointmentType.name} - ${appointment.refCode}\r\nLOCATION:${appointment.branch.name}, ${appointment.branch.address}\r\nDESCRIPTION:Token #${appointment.tokenNumber}. Ref: ${appointment.refCode}\r\nEND:VEVENT\r\nEND:VCALENDAR`;
    res.set({ 'Content-Type': 'text/calendar', 'Content-Disposition': `attachment; filename=appointment-${appointment.refCode}.ics` });
    res.send(ical);
  } catch (error) { next(error); }
};

// Enhanced analytics for admin
exports.getAnalytics = async (req, res, next) => {
  try {
    const orgFilter = {};
    if (req.user.role === 'org_admin') orgFilter.organization = req.user.organization;
    if (req.user.role === 'branch_manager') orgFilter.branch = req.user.branch;

    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [noShowRate, peakHours, revenueData, avgWaitTime] = await Promise.all([
      // No-show rate
      Appointment.aggregate([
        { $match: { ...orgFilter, date: { $gte: thirtyDaysAgo } } },
        { $group: {
          _id: null,
          total: { $sum: 1 },
          noShows: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        }},
      ]),
      // Peak hours
      Appointment.aggregate([
        { $match: { ...orgFilter, date: { $gte: thirtyDaysAgo }, status: { $nin: ['cancelled'] } } },
        { $group: { _id: '$startTime', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      // Revenue
      Appointment.aggregate([
        { $match: { ...orgFilter, date: { $gte: thirtyDaysAgo }, status: 'completed', price: { $gt: 0 } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, revenue: { $sum: '$price' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      // Avg time from check-in to completion
      Appointment.aggregate([
        { $match: { ...orgFilter, status: 'completed', checkedInAt: { $exists: true }, completedAt: { $exists: true } } },
        { $project: { waitMinutes: { $divide: [{ $subtract: ['$completedAt', '$checkedInAt'] }, 60000] } } },
        { $group: { _id: null, avgWait: { $avg: '$waitMinutes' } } },
      ]),
    ]);

    res.json({
      noShowRate: noShowRate[0] || { total: 0, noShows: 0, completed: 0, cancelled: 0 },
      peakHours,
      revenueData,
      avgWaitTime: avgWaitTime[0]?.avgWait || 0,
    });
  } catch (error) { next(error); }
};

// Bulk status update (admin)
exports.bulkStatusUpdate = async (req, res, next) => {
  try {
    const { appointmentIds, status, reason } = req.body;
    if (!appointmentIds?.length || !status) {
      return res.status(400).json({ message: 'appointmentIds and status required' });
    }

    let updated = 0, failed = 0;
    for (const id of appointmentIds) {
      try {
        const apt = await Appointment.findById(id);
        if (!apt) { failed++; continue; }
        const allowed = VALID_TRANSITIONS[apt.status] || [];
        if (!allowed.includes(status)) { failed++; continue; }

        apt.status = status;
        if (status === 'cancelled') { apt.cancelledAt = new Date(); apt.cancellationReason = reason || 'Bulk status update'; }
        if (status === 'checked_in') apt.checkedInAt = new Date();
        if (status === 'completed') apt.completedAt = new Date();
        await apt.save();
        updated++;
      } catch { failed++; }
    }

    logAction(req, { action: 'status_change', resource: 'appointment', details: `Bulk status → ${status}: ${updated} updated`, metadata: { status, updated, failed, reason } });
    res.json({ message: `Updated ${updated}, failed ${failed}`, updated, failed });
  } catch (error) { next(error); }
};
