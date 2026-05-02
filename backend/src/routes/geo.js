/**
 * Public Nepal geographic vocabulary endpoints.
 * Used by address pickers, branch/org admin forms, and analytics filters.
 */
const express = require('express');
const router = express.Router();
const { listProvinces, listDistricts, findProvinceForDistrict } = require('../utils/nepalGeo');
const { listForAdYear, isHoliday } = require('../utils/nepalHolidays');
const { adToBs, formatBs } = require('../utils/nepaliDate');

router.get('/provinces', (req, res) => res.json({ data: listProvinces() }));

router.get('/districts', (req, res) => {
  const { province } = req.query;
  res.json({ data: listDistricts(province) });
});

router.get('/district/:name/province', (req, res) => {
  const code = findProvinceForDistrict(req.params.name);
  if (!code) return res.status(404).json({ message: 'District not found' });
  res.json({ province: code });
});

// BS / holiday helpers
router.get('/holidays', (req, res) => {
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();
  const list = listForAdYear(year).map((h) => ({
    name: h.name, nameNp: h.nameNp,
    adDate: h.adDate.toISOString().slice(0, 10),
    bsDate: formatBs(h.adDate, { mode: 'short', lang: 'en' }),
  }));
  res.json({ year, count: list.length, data: list });
});

router.get('/today/bs', (req, res) => {
  const now = new Date();
  res.json({
    ad: now.toISOString(),
    bs: adToBs(now),
    formatted: { en: formatBs(now), ne: formatBs(now, { lang: 'ne' }) },
    holiday: isHoliday(now),
  });
});

module.exports = router;
