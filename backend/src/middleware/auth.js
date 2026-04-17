const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Authenticate JWT token
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer')
      ? req.headers.authorization.split(' ')[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password -otp -otpExpiry');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Optional auth - sets user if token present but doesn't require it
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer')
      ? req.headers.authorization.split(' ')[1]
      : null;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password -otp -otpExpiry');
    }
    next();
  } catch {
    next();
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

// Check organization access
const checkOrgAccess = async (req, res, next) => {
  if (req.user.role === 'super_admin') return next();
  
  const orgId = req.params.orgId || req.body.organization || req.query.organization;
  if (orgId && req.user.organization && req.user.organization.toString() !== orgId.toString()) {
    return res.status(403).json({ message: 'Access denied to this organization' });
  }
  next();
};

// Check branch access
const checkBranchAccess = async (req, res, next) => {
  if (['super_admin', 'org_admin'].includes(req.user.role)) return next();
  
  const branchId = req.params.branchId || req.body.branch || req.query.branch;
  if (branchId && req.user.branch && req.user.branch.toString() !== branchId.toString()) {
    return res.status(403).json({ message: 'Access denied to this branch' });
  }
  next();
};

module.exports = { authenticate, optionalAuth, authorize, checkOrgAccess, checkBranchAccess };
