const express = require('express');
const router = express.Router();
const hybridLinkService = require('../services/hybridLinkService');
const { authenticate, optionalAuth } = require('../middleware/auth');

// POST /api/hybrid/link  body { issueId, appointmentId }
router.post('/link', authenticate, async (req, res, next) => {
  try {
    const { issueId, appointmentId } = req.body;
    if (!issueId || !appointmentId) {
      return res.status(400).json({ success: false, message: 'issueId and appointmentId are required' });
    }
    const result = await hybridLinkService.linkEntities(issueId, appointmentId, req.user._id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// Legacy path-style
router.post('/:issueId/link/:appointmentId', authenticate, async (req, res, next) => {
  try {
    const result = await hybridLinkService.linkEntities(req.params.issueId, req.params.appointmentId, req.user._id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.get('/timeline/:type/:id', optionalAuth, async (req, res, next) => {
  try {
    const timeline = await hybridLinkService.getUnifiedTimeline(req.params.id, req.params.type);
    res.json({ success: true, data: timeline });
  } catch (err) { next(err); }
});

router.get('/:issueId/timeline', optionalAuth, async (req, res, next) => {
  try {
    const timeline = await hybridLinkService.getUnifiedTimeline(req.params.issueId, 'issue');
    res.json({ success: true, data: timeline });
  } catch (err) { next(err); }
});

module.exports = router;
