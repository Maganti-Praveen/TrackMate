const StopEvent = require('../models/StopEvent');

const createEventRecord = async ({ trip, stop, status, etaMinutes }) => {
  return StopEvent.create({ trip, stop, status, etaMinutes });
};

const listEvents = async (_req, res) => {
  const events = await StopEvent.find()
    .sort({ timestamp: -1 })
    .limit(100)
    .populate('trip', 'bus driver')
    .populate('stop', 'name sequence');
  res.json(events);
};

const listEventsForTrip = async (req, res) => {
  const { tripId } = req.params;
  const events = await StopEvent.find({ trip: tripId })
    .sort({ timestamp: -1 })
    .populate('stop', 'name sequence');
  res.json(events);
};

module.exports = {
  createEventRecord,
  listEvents,
  listEventsForTrip
};
