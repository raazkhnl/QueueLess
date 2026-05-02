/**
 * Utility to calculate elapsed time for tracking issue handling bottlenecks
 */
const calculateStuckTimeSeconds = (fromTime, toTime = Date.now()) => {
  if (!fromTime) return 0;
  return Math.floor((new Date(toTime).getTime() - new Date(fromTime).getTime()) / 1000);
};

const formatStuckTime = (seconds) => {
  const d = Math.floor(seconds / (3600*24));
  const h = Math.floor(seconds % (3600*24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  return `${d}d ${h}h ${m}m`;
};

module.exports = {
  calculateStuckTimeSeconds,
  formatStuckTime
};
