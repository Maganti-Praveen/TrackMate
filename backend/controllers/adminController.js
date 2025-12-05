const Bus = require('../models/Bus');
const Trip = require('../models/Trip');
const StopEvent = require('../models/StopEvent');
const StudentAssignment = require('../models/StudentAssignment');
const User = require('../models/User');

// Admin: assign or reassign students to bus + stop
const assignStudent = async (req, res) => {
  const { rollNumber, name, busId, stopId, studentId } = req.body;
  if ((!rollNumber && !studentId) || !busId || !stopId) {
    return res.status(400).json({ message: 'rollNumber/studentId, busId and stopId are required' });
  }

  let student = null;
  if (studentId) {
    student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    if (name && name !== student.name) {
      student.name = name;
      await student.save();
    }
  } else {
    const normalizedRoll = rollNumber.trim();
    student = await User.findOne({ username: normalizedRoll });
    if (!student) {
      student = await User.create({
        username: normalizedRoll,
        password: normalizedRoll,
        role: 'student',
        name: name || normalizedRoll
      });
    }
  }

  const assignment = await StudentAssignment.findOneAndUpdate(
    { student: student._id },
    { bus: busId, stop: stopId },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
    .populate('student', 'username name')
    .populate('bus', 'name numberPlate')
    .populate('stop', 'name sequence');

  res.status(201).json(assignment);
};

const getAssignments = async (_req, res) => {
  const assignments = await StudentAssignment.find()
    .populate('student', 'username name')
    .populate('bus', 'name numberPlate')
    .populate('stop', 'name sequence');
  res.json(assignments);
};

const updateAssignment = async (req, res) => {
  try {
    const assignment = await StudentAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const { studentId, busId, stopId } = req.body;
    if (studentId) assignment.student = studentId;
    if (busId) assignment.bus = busId;
    if (stopId) assignment.stop = stopId;

    await assignment.save();

    await assignment.populate([
      { path: 'student', select: 'username name' },
      { path: 'bus', select: 'name numberPlate' },
      { path: 'stop', select: 'name sequence' }
    ]);

    res.json(assignment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteAssignment = async (req, res) => {
  const assignment = await StudentAssignment.findByIdAndDelete(req.params.id);
  if (!assignment) {
    return res.status(404).json({ message: 'Assignment not found' });
  }
  res.json({ message: 'Assignment removed' });
};

const getActiveTrips = async (_req, res) => {
  const trips = await Trip.find({ status: 'ONGOING' })
    .populate('bus', 'name numberPlate')
    .populate('driver', 'username name')
    .populate('route', 'name');
  res.json(trips);
};

const getEventHistory = async (req, res) => {
  const limit = Number(req.query.limit) || 50;
  const events = await StopEvent.find()
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('trip', 'bus driver')
    .populate('stop', 'name sequence');
  res.json(events);
};

const getDashboardStats = async (_req, res) => {
  const [busCount, driverCount, studentCount, activeTrips] = await Promise.all([
    Bus.countDocuments(),
    User.countDocuments({ role: 'driver' }),
    User.countDocuments({ role: 'student' }),
    Trip.countDocuments({ status: 'ONGOING' })
  ]);

  res.json({ busCount, driverCount, studentCount, activeTrips });
};

module.exports = {
  assignStudent,
  getAssignments,
  updateAssignment,
  deleteAssignment,
  getActiveTrips,
  getEventHistory,
  getDashboardStats
};
