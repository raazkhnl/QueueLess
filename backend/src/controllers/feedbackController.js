const Feedback = require('../models/Feedback');
const Appointment = require('../models/Appointment');
const { logAction } = require('../utils/auditLog');

exports.create = async (req, res, next) => {
  try {
    const { appointment: aptId, rating, comment, staffRating, waitTimeRating, serviceRating } = req.body;
    const apt = await Appointment.findById(aptId);
    if (!apt) return res.status(404).json({ message: 'Appointment not found' });
    if (apt.status !== 'completed') return res.status(400).json({ message: 'Feedback only for completed appointments' });

    const existing = await Feedback.findOne({ appointment: aptId });
    if (existing) return res.status(409).json({ message: 'Feedback already submitted for this appointment' });

    const feedback = await Feedback.create({
      appointment: aptId,
      organization: apt.organization,
      branch: apt.branch,
      citizen: req.user?._id || undefined,
      guestEmail: apt.guestEmail,
      rating, comment, staffRating, waitTimeRating, serviceRating,
    });

    res.status(201).json({ feedback });
  } catch (error) { next(error); }
};

exports.getByAppointment = async (req, res, next) => {
  try {
    const feedback = await Feedback.findOne({ appointment: req.params.appointmentId })
      .populate('citizen', 'name')
      .populate('adminRepliedBy', 'name');
    res.json({ feedback });
  } catch (error) { next(error); }
};

exports.getByOrg = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, branch, rating } = req.query;
    const query = { organization: req.params.orgId };
    if (branch) query.branch = branch;
    if (rating) query.rating = parseInt(rating);

    const feedbacks = await Feedback.find(query)
      .populate('citizen', 'name')
      .populate('branch', 'name')
      .populate('appointment', 'refCode appointmentType date')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Feedback.countDocuments(query);

    // Aggregate stats
    const stats = await Feedback.aggregate([
      { $match: query },
      { $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        avgStaffRating: { $avg: '$staffRating' },
        avgWaitRating: { $avg: '$waitTimeRating' },
        avgServiceRating: { $avg: '$serviceRating' },
        totalReviews: { $sum: 1 },
        star5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        star4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        star3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        star2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        star1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
      }},
    ]);

    res.json({ feedbacks, total, page: parseInt(page), pages: Math.ceil(total / limit), stats: stats[0] || {} });
  } catch (error) { next(error); }
};

exports.adminReply = async (req, res, next) => {
  try {
    const { reply } = req.body;
    const feedback = await Feedback.findByIdAndUpdate(req.params.id, {
      adminReply: reply, adminRepliedAt: new Date(), adminRepliedBy: req.user._id,
    }, { new: true });
    if (!feedback) return res.status(404).json({ message: 'Feedback not found' });
    if (req.user) logAction(req, { action: 'update', resource: 'feedback', resourceId: feedback._id, details: 'Admin replied to feedback' });
    res.json({ feedback });
  } catch (error) { next(error); }
};

exports.remove = async (req, res, next) => {
  try {
    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ message: 'Feedback deleted' });
  } catch (error) { next(error); }
};
