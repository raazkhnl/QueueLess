const Appointment = require('../models/Appointment');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Organization = require('../models/Organization');
const ExcelJS = require('exceljs');
const { generateSlots } = require('../services/slotService');

// Comprehensive analytics
exports.getAnalytics = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, branch, organization } = req.query;
    const match = {};
    if (req.user.role === 'org_admin') match.organization = req.user.organization;
    if (req.user.role === 'branch_manager') match.branch = req.user.branch;
    if (organization) match.organization = require('mongoose').Types.ObjectId.createFromHexString(organization);
    if (branch) match.branch = require('mongoose').Types.ObjectId.createFromHexString(branch);

    const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = dateTo ? new Date(dateTo) : new Date();
    match.date = { $gte: from, $lte: to };

    const [overview, statusBreakdown, hourlyDistribution, serviceBreakdown,
           weekdayDistribution, dailyTrend, revenueByService, feedbackStats] = await Promise.all([
      // Overview
      Appointment.aggregate([
        { $match: match },
        { $group: {
          _id: null, total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          noShow: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$price', 0] } },
          guests: { $sum: { $cond: ['$isGuest', 1, 0] } },
          virtual: { $sum: { $cond: [{ $eq: ['$mode', 'virtual'] }, 1, 0] } },
        }},
      ]),
      // Status breakdown
      Appointment.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      // Hourly distribution (peak hours)
      Appointment.aggregate([
        { $match: { ...match, status: { $nin: ['cancelled'] } } },
        { $group: { _id: '$startTime', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // By service type
      Appointment.aggregate([
        { $match: match },
        { $group: { _id: '$appointmentType', count: { $sum: 1 }, revenue: { $sum: '$price' } } },
        { $lookup: { from: 'appointmenttypes', localField: '_id', foreignField: '_id', as: 'type' } },
        { $unwind: { path: '$type', preserveNullAndEmptyArrays: true } },
        { $project: { name: '$type.name', color: '$type.color', count: 1, revenue: 1 } },
        { $sort: { count: -1 } },
      ]),
      // By weekday
      Appointment.aggregate([
        { $match: { ...match, status: { $nin: ['cancelled'] } } },
        { $group: { _id: { $dayOfWeek: '$date' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      // Daily trend
      Appointment.aggregate([
        { $match: match },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, count: { $sum: 1 }, revenue: { $sum: '$price' } } },
        { $sort: { _id: 1 } },
      ]),
      // Revenue by service
      Appointment.aggregate([
        { $match: { ...match, status: 'completed', price: { $gt: 0 } } },
        { $group: { _id: '$appointmentType', revenue: { $sum: '$price' }, count: { $sum: 1 } } },
        { $lookup: { from: 'appointmenttypes', localField: '_id', foreignField: '_id', as: 'type' } },
        { $unwind: { path: '$type', preserveNullAndEmptyArrays: true } },
        { $project: { name: '$type.name', revenue: 1, count: 1 } },
        { $sort: { revenue: -1 } },
      ]),
      // Feedback stats
      Feedback.aggregate([
        { $match: { organization: match.organization || { $exists: true }, createdAt: { $gte: from, $lte: to } } },
        { $group: {
          _id: null, avgRating: { $avg: '$rating' }, avgStaff: { $avg: '$staffRating' },
          avgWait: { $avg: '$waitTimeRating' }, avgService: { $avg: '$serviceRating' },
          total: { $sum: 1 },
        }},
      ]),
    ]);

    res.json({
      overview: overview[0] || {},
      statusBreakdown: statusBreakdown.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
      hourlyDistribution,
      serviceBreakdown,
      weekdayDistribution,
      dailyTrend,
      revenueByService,
      feedbackStats: feedbackStats[0] || {},
      dateRange: { from, to },
    });
  } catch (error) { next(error); }
};

// Export report as Excel
exports.exportExcelReport = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, branch } = req.query;
    const match = {};
    if (req.user.role === 'org_admin') match.organization = req.user.organization;
    if (branch) match.branch = branch;
    if (dateFrom || dateTo) {
      match.date = {};
      if (dateFrom) match.date.$gte = new Date(dateFrom);
      if (dateTo) match.date.$lte = new Date(dateTo);
    }

    const appointments = await Appointment.find(match)
      .populate('organization', 'name')
      .populate('branch', 'name code')
      .populate('appointmentType', 'name price')
      .populate('citizen', 'name email phone')
      .populate('assignedStaff', 'name')
      .sort({ date: -1 }).lean();

    const wb = new ExcelJS.Workbook();

    // Sheet 1: Bookings
    const ws1 = wb.addWorksheet('Bookings');
    ws1.columns = [
      { header: 'Ref Code', key: 'ref', width: 22 }, { header: 'Date', key: 'date', width: 14 },
      { header: 'Time', key: 'time', width: 12 }, { header: 'Service', key: 'service', width: 22 },
      { header: 'Branch', key: 'branch', width: 18 }, { header: 'Organization', key: 'org', width: 22 },
      { header: 'Customer', key: 'customer', width: 20 }, { header: 'Email', key: 'email', width: 22 },
      { header: 'Phone', key: 'phone', width: 15 }, { header: 'Status', key: 'status', width: 12 },
      { header: 'Token', key: 'token', width: 8 }, { header: 'Mode', key: 'mode', width: 10 },
      { header: 'Price', key: 'price', width: 10 }, { header: 'Staff', key: 'staff', width: 18 },
      { header: 'Guest', key: 'guest', width: 6 }, { header: 'Created', key: 'created', width: 20 },
    ];
    appointments.forEach(a => ws1.addRow({
      ref: a.refCode, date: new Date(a.date).toLocaleDateString(),
      time: a.startTime + '-' + a.endTime, service: a.appointmentType?.name,
      branch: a.branch?.name, org: a.organization?.name,
      customer: a.citizen?.name || a.guestName, email: a.citizen?.email || a.guestEmail,
      phone: a.citizen?.phone || a.guestPhone, status: a.status,
      token: a.tokenNumber, mode: a.mode, price: a.price,
      staff: a.assignedStaff?.name || '', guest: a.isGuest ? 'Yes' : 'No',
      created: new Date(a.createdAt).toLocaleString(),
    }));
    ws1.getRow(1).font = { bold: true };

    // Sheet 2: Summary
    const ws2 = wb.addWorksheet('Summary');
    ws2.columns = [{ header: 'Status', key: 'status', width: 18 }, { header: 'Count', key: 'count', width: 12 }];
    const statusCounts = {};
    appointments.forEach(a => { statusCounts[a.status] = (statusCounts[a.status] || 0) + 1; });
    Object.entries(statusCounts).forEach(([s, cnt]) => ws2.addRow({ status: s, count: cnt }));
    ws2.addRow({ status: 'TOTAL', count: appointments.length });
    ws2.addRow({ status: 'Total Revenue', count: appointments.filter(a => a.status === 'completed').reduce((s, a) => s + (a.price || 0), 0) });
    ws2.getRow(1).font = { bold: true };

    const buffer = await wb.xlsx.writeBuffer();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=report-${Date.now()}.xlsx`,
    });
    res.send(buffer);
  } catch (error) { next(error); }
};
