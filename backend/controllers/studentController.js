const Stop = require('../models/Stop');
const Trip = require('../models/Trip');
const StudentAssignment = require('../models/StudentAssignment');
const calculateEtaMinutes = require('../utils/etaCalculator');

const getAssignment = async (req, res) => {
  const assignment = await StudentAssignment.findOne({ student: req.user._id })
    .populate('bus', 'name numberPlate lastKnownLocation')
    .populate('stop');
  res.json(assignment);
};

const getEta = async (req, res) => {
  const assignment = await StudentAssignment.findOne({ student: req.user._id })
    .populate('stop')
    .populate('bus');
  if (!assignment) {
    return res.status(404).json({ message: 'No assignment found' });
  }

  const trip = await Trip.findOne({ bus: assignment.bus._id, status: 'ONGOING' }).populate('route');
  if (!trip) {
    return res.json({ etaMinutes: null, message: 'Trip not running' });
  }

  const orderedStops = await Stop.find({ route: trip.route }).sort({ sequence: 1 });
  const etaMinutes = calculateEtaMinutes({
    orderedStops,
    currentIndex: trip.currentStopIndex,
    targetStopId: assignment.stop._id,
    defaultMinutes: Number(process.env.DEFAULT_ETA_MINUTES) || 2
  });

  res.json({ etaMinutes });
};

const registerNotificationToken = async (req, res) => {
  const { token } = req.body;
  const assignment = await StudentAssignment.findOneAndUpdate(
    { student: req.user._id },
    { notificationToken: token },
    { new: true }
  );
  res.json(assignment);
};

const getLiveTrip = async (req, res) => {
  const assignment = await StudentAssignment.findOne({ student: req.user._id });
  if (!assignment) {
    return res.status(404).json({ message: 'No assignment found' });
  }

  const trip = await Trip.findOne({ bus: assignment.bus, status: 'ONGOING' })
    .populate('bus', 'name lastKnownLocation')
    .populate('route');
  res.json(trip);
};

module.exports = { getAssignment, getEta, registerNotificationToken, getLiveTrip };
