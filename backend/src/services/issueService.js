const mongoose = require('mongoose');
const Issue = require('../models/Issue');
const IssueType = require('../models/IssueType');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { calculateStuckTimeSeconds } = require('../utils/delayTracker');

const isObjectId = (v) => typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v);

const ensureHistory = (issue) => {
  if (!Array.isArray(issue.history)) issue.history = [];
  return issue.history;
};

const lastEventStuckSeconds = (issue) => {
  const h = issue.history || [];
  if (!h.length) return calculateStuckTimeSeconds(issue.createdAt || issue.slaStartTime);
  return calculateStuckTimeSeconds(h[h.length - 1].timestamp);
};

const resolveLinkedAppointment = async (raw) => {
  if (!raw) return null;
  let id = Array.isArray(raw) ? raw[0] : raw;
  if (!id) return null;
  id = String(id);
  const queries = [{ refCode: id }];
  if (isObjectId(id)) queries.push({ _id: id });
  return Appointment.findOne({ $or: queries });
};

exports.createIssue = async (issueData, creatorUser = null) => {
  const typeIdRaw = issueData.issueType || issueData.issueTypeId;
  const typeSlug = issueData.issueTypeSlug;
  let issueType = null;
  if (typeIdRaw && isObjectId(String(typeIdRaw))) {
    issueType = await IssueType.findById(typeIdRaw);
  } else if (typeSlug) {
    issueType = await IssueType.findOne({ slug: String(typeSlug).toLowerCase() });
  }
  if (!issueType || !issueType.isActive) {
    const e = new Error('Invalid or inactive issue type'); e.status = 400; throw e;
  }

  if (!issueData.description || !String(issueData.description).trim()) {
    const e = new Error('Description is required'); e.status = 400; throw e;
  }

  const data = { ...issueData };
  data.organization = issueType.organization;
  data.issueType = issueType._id;
  delete data.issueTypeId;
  delete data.issueTypeSlug;

  // External integration metadata
  if (issueData.externalSubmissionNo) data.externalSubmissionNo = String(issueData.externalSubmissionNo).slice(0, 128);
  if (issueData.sourceSystem) data.sourceSystem = String(issueData.sourceSystem).slice(0, 64);
  if (issueData.sourceChannel) data.sourceChannel = issueData.sourceChannel;
  else if (data.sourceSystem) data.sourceChannel = 'external';

  // Hydrate from linked appointment
  let appt = null;
  if (data.linkedAppointments) {
    appt = await resolveLinkedAppointment(data.linkedAppointments);
    if (appt) {
      data.linkedAppointments = [appt._id];
      if (!data.guestName && appt.guestName) data.guestName = appt.guestName;
      if (!data.guestEmail && appt.guestEmail) data.guestEmail = appt.guestEmail;
      if (!data.guestPhone && appt.guestPhone) data.guestPhone = appt.guestPhone;
      if (!data.citizen && appt.citizen) data.citizen = appt.citizen;
      if (!data.branch && appt.branch) data.branch = appt.branch;
    } else {
      delete data.linkedAppointments;
    }
  }

  // Branch resolution
  if (!data.branch && issueType.defaultBranch) data.branch = issueType.defaultBranch;
  if (data.branch && !isObjectId(String(data.branch))) delete data.branch;

  // Logged-in user takes over guest fields
  if (creatorUser) {
    data.citizen = creatorUser._id;
    if (!data.guestName) data.guestName = creatorUser.name;
    if (!data.guestEmail && creatorUser.email) data.guestEmail = creatorUser.email;
    if (!data.guestPhone && creatorUser.phone) data.guestPhone = creatorUser.phone;
  } else {
    if (!data.guestName || !data.guestEmail) {
      const e = new Error('Name and email are required for guest submissions'); e.status = 400; throw e;
    }
  }

  // Priority + SLA
  data.priority = data.priority || issueType.priority || 'medium';
  data.currentUnit = data.currentUnit || issueType.defaultUnit;

  const slaHours = issueType.slaHours || issueType.estimatedSLA || 48;
  const start = new Date();
  data.slaStartTime = start;
  data.slaDueDate = new Date(start.getTime() + slaHours * 3600 * 1000);
  data.expectedResolutionTime = data.slaDueDate;

  const issue = new Issue(data);
  ensureHistory(issue).push({
    action: 'created',
    toStatus: issue.status,
    actor: creatorUser ? creatorUser._id : null,
    actorName: creatorUser ? creatorUser.name : (data.guestName || 'Guest'),
    reason: data.subject || 'Ticket submitted'
  });

  await issue.save();

  // Bidirectional appointment link
  if (appt) {
    if (!Array.isArray(appt.linkedIssues)) appt.linkedIssues = [];
    if (!appt.linkedIssues.find((x) => String(x) === String(issue._id))) {
      appt.linkedIssues.push(issue._id);
      await appt.save();
    }
  }

  return issue;
};

exports.updateStatus = async (issueId, newStatus, actorUser, reason = '') => {
  const issue = await Issue.findById(issueId);
  if (!issue) { const e = new Error('Issue not found'); e.status = 404; throw e; }
  if (!Issue.STATUSES.includes(newStatus)) {
    const e = new Error('Invalid status'); e.status = 400; throw e;
  }

  const fromStatus = issue.status;
  if (fromStatus === newStatus) return issue;

  const stuck = lastEventStuckSeconds(issue);
  issue.status = newStatus;

  if (newStatus === 'resolved') {
    issue.resolvedAt = new Date();
    issue.resolutionNote = reason || issue.resolutionNote;
  }
  if (newStatus === 'closed') {
    issue.closedAt = new Date();
    if (!issue.resolvedAt) issue.resolvedAt = issue.closedAt;
  }
  if (newStatus === 'reopened') {
    issue.reopenCount = (issue.reopenCount || 0) + 1;
    issue.resolvedAt = undefined;
    issue.closedAt = undefined;
  }

  ensureHistory(issue).push({
    action: newStatus === 'reopened' ? 'reopened' : 'status_changed',
    fromStatus,
    toStatus: newStatus,
    stuckTimeSeconds: stuck,
    reason,
    actor: actorUser ? actorUser._id : null,
    actorName: actorUser ? actorUser.name : 'System'
  });

  await issue.save();

  // Hybrid cascade — best-effort, never throws
  try {
    const hybrid = require('./hybridLinkService');
    hybrid.cascadeIssueStatus(issue._id, newStatus, actorUser, reason).catch(() => {});
  } catch { /* swallow */ }

  return issue;
};

exports.forwardIssue = async (issueId, { toAssignee, toUnit, toBranch, reason }, actorUser) => {
  if (!reason || !String(reason).trim()) {
    const e = new Error('Forwarding reason is mandatory'); e.status = 400; throw e;
  }
  const issue = await Issue.findById(issueId);
  if (!issue) { const e = new Error('Issue not found'); e.status = 404; throw e; }

  const fromAssignee = issue.currentAssignee;
  const fromBranch = issue.branch;
  const fromStatus = issue.status;
  const stuck = lastEventStuckSeconds(issue);

  if (toAssignee) {
    if (!isObjectId(String(toAssignee))) { const e = new Error('Invalid assignee'); e.status = 400; throw e; }
    const target = await User.findById(toAssignee);
    if (!target) { const e = new Error('Assignee not found'); e.status = 400; throw e; }
    issue.currentAssignee = target._id;
  }
  if (toBranch && isObjectId(String(toBranch))) issue.branch = toBranch;
  if (toUnit) issue.currentUnit = toUnit;
  issue.status = 'forwarded';

  ensureHistory(issue).push({
    action: 'forwarded',
    fromStatus,
    toStatus: 'forwarded',
    fromAssignee,
    toAssignee: issue.currentAssignee,
    fromBranch,
    toBranch: issue.branch,
    stuckTimeSeconds: stuck,
    reason,
    actor: actorUser ? actorUser._id : null,
    actorName: actorUser ? actorUser.name : 'System'
  });

  await issue.save();
  return issue;
};

exports.assignIssue = async (issueId, assigneeId, actorUser, reason = '') => {
  if (!isObjectId(String(assigneeId))) { const e = new Error('Invalid assignee'); e.status = 400; throw e; }
  const issue = await Issue.findById(issueId);
  if (!issue) { const e = new Error('Issue not found'); e.status = 404; throw e; }
  const target = await User.findById(assigneeId);
  if (!target) { const e = new Error('Assignee not found'); e.status = 400; throw e; }

  const fromAssignee = issue.currentAssignee;
  const fromStatus = issue.status;
  const stuck = lastEventStuckSeconds(issue);

  issue.currentAssignee = target._id;
  if (issue.status === 'open' || issue.status === 'reopened') issue.status = 'in_progress';

  ensureHistory(issue).push({
    action: 'assigned',
    fromStatus,
    toStatus: issue.status,
    fromAssignee,
    toAssignee: target._id,
    stuckTimeSeconds: stuck,
    reason: reason || `Assigned to ${target.name}`,
    actor: actorUser ? actorUser._id : null,
    actorName: actorUser ? actorUser.name : 'System'
  });

  await issue.save();
  return issue;
};

exports.reopenIssue = async (issueId, actorUser, reason) => {
  if (!reason || !String(reason).trim()) {
    const e = new Error('Reopen reason is required'); e.status = 400; throw e;
  }
  return exports.updateStatus(issueId, 'reopened', actorUser, reason);
};

exports.addComment = async (issueId, { body, isInternal = false, attachments = [] }, actorUser) => {
  if (!body || !String(body).trim()) { const e = new Error('Comment body is required'); e.status = 400; throw e; }
  const issue = await Issue.findById(issueId);
  if (!issue) { const e = new Error('Issue not found'); e.status = 404; throw e; }

  const isStaff = actorUser && actorUser.role && actorUser.role !== 'citizen';
  const internal = isStaff ? !!isInternal : false;

  issue.comments.push({
    body: String(body).trim(),
    author: actorUser ? actorUser._id : null,
    authorName: actorUser ? actorUser.name : (issue.guestName || 'Guest'),
    isInternal: internal,
    attachments
  });

  ensureHistory(issue).push({
    action: internal ? 'internal_note' : 'comment_added',
    actor: actorUser ? actorUser._id : null,
    actorName: actorUser ? actorUser.name : (issue.guestName || 'Guest'),
    reason: internal ? 'Internal note added' : 'Comment added'
  });

  // Re-engage workflow
  if (issue.status === 'awaiting_user' && (!actorUser || actorUser.role === 'citizen')) {
    issue.status = 'in_progress';
  }

  await issue.save();
  return issue;
};

exports.addAttachments = async (issueId, attachments, actorUser) => {
  const issue = await Issue.findById(issueId);
  if (!issue) { const e = new Error('Issue not found'); e.status = 404; throw e; }
  if (!attachments || !attachments.length) return issue;

  const stamped = attachments.map((a) => ({ ...a, uploadedBy: actorUser ? actorUser._id : null }));
  issue.attachments.push(...stamped);

  ensureHistory(issue).push({
    action: 'attachments_added',
    actor: actorUser ? actorUser._id : null,
    actorName: actorUser ? actorUser.name : (issue.guestName || 'Guest'),
    reason: `${stamped.length} file(s) attached`
  });

  await issue.save();
  return issue;
};

exports.startApprovalChain = async (issueId, steps, actorUser) => {
  const issue = await Issue.findById(issueId);
  if (!issue) { const e = new Error('Issue not found'); e.status = 404; throw e; }
  if (!Array.isArray(steps) || steps.length === 0) {
    const e = new Error('At least one approval step is required'); e.status = 400; throw e;
  }
  issue.approvalChain = steps.map((s, i) => ({
    step: i + 1,
    requiredRankLevel: Number(s.requiredRankLevel) || 0,
    approver: s.approver || null,
    decision: 'pending',
  }));
  issue.currentApprovalStep = 1;
  ensureHistory(issue).push({
    action: 'approval_chain_started',
    actor: actorUser ? actorUser._id : null,
    actorName: actorUser ? actorUser.name : 'System',
    reason: `${steps.length}-step approval chain initiated`,
  });
  await issue.save();
  return issue;
};

exports.decideApprovalStep = async (issueId, { decision, note }, actorUser) => {
  if (!['approved', 'rejected'].includes(decision)) {
    const e = new Error('decision must be approved or rejected'); e.status = 400; throw e;
  }
  const issue = await Issue.findById(issueId);
  if (!issue) { const e = new Error('Issue not found'); e.status = 404; throw e; }
  const step = (issue.approvalChain || []).find((s) => s.step === issue.currentApprovalStep && s.decision === 'pending');
  if (!step) { const e = new Error('No pending approval step'); e.status = 400; throw e; }
  if (step.requiredRankLevel > 0 && (actorUser?.rankLevel || 0) < step.requiredRankLevel) {
    const e = new Error(`This step requires rank level ${step.requiredRankLevel}`); e.status = 403; throw e;
  }
  step.approver = actorUser ? actorUser._id : step.approver;
  step.decision = decision;
  step.note = note;
  step.decidedAt = new Date();

  if (decision === 'rejected') {
    issue.status = 'closed';
    issue.closedAt = new Date();
    issue.resolutionNote = note || 'Rejected during approval';
  } else {
    const next = (issue.approvalChain || []).find((s) => s.step === issue.currentApprovalStep + 1);
    if (next) issue.currentApprovalStep = next.step;
    else { issue.status = 'resolved'; issue.resolvedAt = new Date(); issue.resolutionNote = note || 'All approvals complete'; }
  }

  ensureHistory(issue).push({
    action: decision === 'approved' ? 'approval_step_approved' : 'approval_step_rejected',
    fromStatus: issue.status,
    toStatus: issue.status,
    actor: actorUser ? actorUser._id : null,
    actorName: actorUser ? actorUser.name : 'System',
    reason: note || `Step ${step.step} ${decision}`,
  });
  await issue.save();
  return issue;
};

exports.canViewIssue = (issue, user) => {
  if (!issue) return false;
  if (!user) return false;
  if (['super_admin'].includes(user.role)) return true;
  if (user.role === 'org_admin') {
    return user.organization && String(user.organization) === String(issue.organization);
  }
  if (['branch_manager', 'staff'].includes(user.role)) {
    if (user.organization && String(user.organization) !== String(issue.organization)) return false;
    if (user.branch && issue.branch && String(user.branch) !== String(issue.branch)) {
      return String(issue.currentAssignee) === String(user._id);
    }
    return true;
  }
  if (user.role === 'citizen') {
    return issue.citizen && String(issue.citizen) === String(user._id);
  }
  return false;
};
