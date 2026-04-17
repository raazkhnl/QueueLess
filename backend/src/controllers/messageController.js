const Message = require('../models/Message');
const Appointment = require('../models/Appointment');

exports.getByAppointment = async (req, res, next) => {
  try {
    const messages = await Message.find({ appointment: req.params.appointmentId })
      .populate('sender', 'name role')
      .sort({ createdAt: 1 });
    res.json({ messages });
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const { appointmentId, content } = req.body;
    const apt = await Appointment.findById(appointmentId);
    if (!apt) return res.status(404).json({ message: 'Appointment not found' });

    const msg = await Message.create({
      appointment: appointmentId,
      sender: req.user?._id,
      senderType: req.user ? (['staff','branch_manager','org_admin','super_admin'].includes(req.user.role) ? 'staff' : 'citizen') : 'citizen',
      senderName: req.user?.name || req.body.senderName || 'Guest',
      content,
    });

    const populated = await Message.findById(msg._id).populate('sender', 'name role');
    res.status(201).json({ message: populated });
  } catch (error) { next(error); }
};

exports.markRead = async (req, res, next) => {
  try {
    await Message.updateMany(
      { appointment: req.params.appointmentId, isRead: false, senderType: { $ne: req.body.readerType || 'staff' } },
      { isRead: true, readAt: new Date() }
    );
    res.json({ message: 'Messages marked as read' });
  } catch (error) { next(error); }
};
