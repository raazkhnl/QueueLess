const User = require('../models/User');
const Branch = require('../models/Branch');
const Appointment = require('../models/Appointment');
const Organization = require('../models/Organization');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// User CRUD
exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, organization, branch, search, active } = req.query;
    const query = {};
    if (role) query.role = role;
    if (organization) query.organization = organization;
    if (branch) query.branch = branch;
    if (active !== undefined) query.isActive = active === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    if (req.user.role === 'org_admin') query.organization = req.user.organization;

    const users = await User.find(query)
      .populate('organization', 'name')
      .populate('branch', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await User.countDocuments(query);

    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

exports.createUser = async (req, res, next) => {
  try {
    const { name, email, phone, password, role, organization, branch } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password required' });
    }
    const user = await User.create({ name, email, phone, password, role, organization, branch });
    res.status(201).json({ user });
  } catch (error) { next(error); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, phone, role, organization, branch, isActive } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email;
    if (phone !== undefined) update.phone = phone;
    if (role !== undefined) update.role = role;
    if (organization !== undefined) update.organization = organization;
    if (branch !== undefined) update.branch = branch;
    if (isActive !== undefined) update.isActive = isActive;

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (error) { next(error); }
};

exports.deleteUser = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'User deactivated' });
  } catch (error) { next(error); }
};

// Excel upload for batch creation
exports.uploadExcel = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const { type } = req.body;
    const sheet = workbook.worksheets[0];
    const headers = [];
    sheet.getRow(1).eachCell((cell, colNum) => { headers[colNum] = String(cell.value || '').trim(); });
    const data = [];
    sheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      const obj = {};
      row.eachCell((cell, colNum) => { if (headers[colNum]) obj[headers[colNum]] = cell.value; });
      if (Object.keys(obj).length > 0) data.push(obj);
    });

    let results = { created: 0, errors: [] };

    const targetOrg = req.body.organization || req.user.organization;
    const defaultBranch = req.body.branch || undefined;

    if (type === 'users') {
      for (let i = 0; i < data.length; i++) {
        try {
          const row = data[i];
          await User.create({
            name: row.name || row.Name,
            email: row.email || row.Email,
            phone: row.phone || row.Phone,
            password: row.password || row.Password || 'QueueLess@123',
            role: row.role || row.Role || 'staff',
            organization: targetOrg,
            branch: row.branch_id || row.Branch_ID || defaultBranch,
          });
          results.created++;
        } catch (err) {
          results.errors.push({ row: i + 2, error: err.message });
        }
      }
    } else if (type === 'branches') {
      for (let i = 0; i < data.length; i++) {
        try {
          const row = data[i];
          await Branch.create({
            name: row.name || row.Name,
            code: row.code || row.Code,
            address: row.address || row.Address,
            province: row.province || row.Province,
            district: row.district || row.District,
            city: row.city || row.City,
            phone: row.phone || row.Phone,
            email: row.email || row.Email,
            organization: targetOrg,
            location: {
              type: 'Point',
              coordinates: [
                parseFloat(row.longitude || row.Longitude || 85.324),
                parseFloat(row.latitude || row.Latitude || 27.717)
              ]
            }
          });
          results.created++;
        } catch (err) {
          results.errors.push({ row: i + 2, error: err.message });
        }
      }
    }

    // Cleanup uploaded file
    fs.unlink(req.file.path, () => {});
    res.json({ message: `Batch upload complete`, results });
  } catch (error) { next(error); }
};

// Download sample Excel
exports.downloadSampleExcel = async (req, res, next) => {
  try {
    const { type } = req.params;
    const workbook = XLSX.utils.book_new();
    let data;

    if (type === 'users') {
      data = [
        { Name: 'John Doe', Email: 'john@example.com', Phone: '9841000001', Password: 'Pass@123', Role: 'staff', Branch_ID: '' },
        { Name: 'Jane Smith', Email: 'jane@example.com', Phone: '9841000002', Password: 'Pass@123', Role: 'branch_manager', Branch_ID: '' },
      ];
    } else {
      data = [
        { Name: 'Main Branch', Code: 'MB001', Address: 'Kathmandu, Nepal', Province: 'Bagmati', District: 'Kathmandu', City: 'Kathmandu', Phone: '01-4000001', Email: 'main@org.com', Latitude: '27.7172', Longitude: '85.3240' },
        { Name: 'Pokhara Branch', Code: 'PK001', Address: 'Pokhara, Nepal', Province: 'Gandaki', District: 'Kaski', City: 'Pokhara', Phone: '061-500001', Email: 'pokhara@org.com', Latitude: '28.2096', Longitude: '83.9856' },
      ];
    }

    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, type === 'users' ? 'Users' : 'Branches');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=sample-${type}.xlsx`,
    });
    res.send(buffer);
  } catch (error) { next(error); }
};

// Dashboard stats
exports.getDashboardStats = async (req, res, next) => {
  try {
    const orgFilter = {};
    if (req.user.role === 'org_admin') orgFilter.organization = req.user.organization;
    if (req.user.role === 'branch_manager') { orgFilter.branch = req.user.branch; orgFilter.organization = req.user.organization; }

    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [totalBookings, todayBookings, monthBookings, pendingBookings, totalOrgs, totalBranches, totalUsers] = await Promise.all([
      Appointment.countDocuments(orgFilter),
      Appointment.countDocuments({ ...orgFilter, date: { $gte: today, $lt: tomorrow } }),
      Appointment.countDocuments({ ...orgFilter, date: { $gte: monthStart } }),
      Appointment.countDocuments({ ...orgFilter, status: 'pending' }),
      req.user.role === 'super_admin' ? Organization.countDocuments({ isActive: true }) : Promise.resolve(1),
      Branch.countDocuments(orgFilter.organization ? { organization: orgFilter.organization, isActive: true } : { isActive: true }),
      User.countDocuments(orgFilter.organization ? { organization: orgFilter.organization } : {}),
    ]);

    // Status breakdown
    const statusBreakdown = await Appointment.aggregate([
      { $match: orgFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Daily trend (last 30 days)
    const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dailyTrend = await Appointment.aggregate([
      { $match: { ...orgFilter, date: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Per-branch stats
    const branchStats = await Appointment.aggregate([
      { $match: { ...orgFilter, date: { $gte: monthStart } } },
      { $group: { _id: '$branch', count: { $sum: 1 } } },
      { $lookup: { from: 'branches', localField: '_id', foreignField: '_id', as: 'branch' } },
      { $unwind: '$branch' },
      { $project: { branchName: '$branch.name', count: 1 } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      totalBookings, todayBookings, monthBookings, pendingBookings,
      totalOrgs, totalBranches, totalUsers,
      statusBreakdown: statusBreakdown.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
      dailyTrend, branchStats,
    });
  } catch (error) { next(error); }
};

// Export bookings as CSV
exports.exportCSV = async (req, res, next) => {
  try {
    const { branch, organization, status, dateFrom, dateTo } = req.query;
    const query = {};
    if (branch) query.branch = branch;
    if (organization) query.organization = organization;
    if (req.user.role === 'org_admin') query.organization = req.user.organization;
    if (status) query.status = status;
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }

    const appointments = await Appointment.find(query)
      .populate('organization', 'name')
      .populate('branch', 'name code')
      .populate('appointmentType', 'name')
      .populate('citizen', 'name email phone')
      .sort({ date: -1 })
      .lean();

    const rows = appointments.map(a => ({
      RefCode: a.refCode,
      Date: new Date(a.date).toLocaleDateString(),
      Time: `${a.startTime}-${a.endTime}`,
      Service: a.appointmentType?.name,
      Branch: a.branch?.name,
      Organization: a.organization?.name,
      Name: a.citizen?.name || a.guestName,
      Email: a.citizen?.email || a.guestEmail,
      Phone: a.citizen?.phone || a.guestPhone,
      Status: a.status,
      Token: a.tokenNumber,
      Mode: a.mode,
      Price: a.price,
    }));

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Bookings');
    if (rows.length > 0) {
      ws.columns = Object.keys(rows[0]).map(k => ({ header: k, key: k, width: 18 }));
      rows.forEach(r => ws.addRow(r));
      ws.getRow(1).font = { bold: true };
    }
    const buffer = await wb.csv.writeBuffer();

    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=bookings-export-${Date.now()}.csv`,
    });
    res.send(buffer);
  } catch (error) { next(error); }
};
