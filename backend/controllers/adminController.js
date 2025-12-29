const Bus = require('../models/Bus');
const Trip = require('../models/Trip');
const StopEvent = require('../models/StopEvent');
const StudentAssignment = require('../models/StudentAssignment');
const User = require('../models/User');
const { hashPassword } = require('./authController');

// Admin: assign or reassign students to bus + stop
const assignStudent = async (req, res) => {
  try {
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
        const hashedPassword = await hashPassword(normalizedRoll);
        student = await User.create({
          username: normalizedRoll,
          password: hashedPassword,
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
      .populate({
        path: 'bus',
        select: 'name numberPlate driver',
        populate: { path: 'driver', select: 'name username' }
      })
      .populate('stop', 'name sequence');

    res.status(201).json(assignment);
  } catch (error) {
    console.error('assignStudent error:', error);
    res.status(500).json({ message: 'Failed to assign student', error: error.message });
  }
};

const getAssignments = async (_req, res) => {
  try {
    const assignments = await StudentAssignment.find()
      .populate('student', 'username name')
      .populate({
        path: 'bus',
        select: 'name numberPlate driver',
        populate: { path: 'driver', select: 'name username' }
      })
      .populate('stop', 'name sequence');
    res.json(assignments);
  } catch (error) {
    console.error('getAssignments error:', error);
    res.status(500).json({ message: 'Failed to fetch assignments', error: error.message });
  }
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
      {
        path: 'bus',
        select: 'name numberPlate driver',
        populate: { path: 'driver', select: 'name username' }
      },
      { path: 'stop', select: 'name sequence' }
    ]);

    res.json(assignment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteAssignment = async (req, res) => {
  try {
    const assignment = await StudentAssignment.findByIdAndDelete(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    res.json({ message: 'Assignment removed' });
  } catch (error) {
    console.error('deleteAssignment error:', error);
    res.status(500).json({ message: 'Failed to delete assignment', error: error.message });
  }
};

const getActiveTrips = async (_req, res) => {
  try {
    const trips = await Trip.find({ status: 'ONGOING' })
      .populate('bus', 'name numberPlate')
      .populate('driver', 'username name')
      .populate('route', 'name');
    res.json(trips);
  } catch (error) {
    console.error('getActiveTrips error:', error);
    res.status(500).json({ message: 'Failed to fetch active trips', error: error.message });
  }
};

const getEventHistory = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const events = await StopEvent.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('trip', 'bus driver')
      .populate('stop', 'name sequence');
    res.json(events);
  } catch (error) {
    console.error('getEventHistory error:', error);
    res.status(500).json({ message: 'Failed to fetch event history', error: error.message });
  }
};

const getDashboardStats = async (_req, res) => {
  try {
    const [busCount, driverCount, studentCount, activeTrips] = await Promise.all([
      Bus.countDocuments(),
      User.countDocuments({ role: 'driver' }),
      User.countDocuments({ role: 'student' }),
      Trip.countDocuments({ status: 'ONGOING' })
    ]);

    res.json({ busCount, driverCount, studentCount, activeTrips });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: error.message });
  }
};

const fixStudentData = async (req, res) => {
  res.status(501).json({ message: 'Legacy fixStudentData is disabled.' });
};

const clearEvents = async (req, res) => {
  try {
    const result = await StopEvent.deleteMany({});
    res.json({ message: `Cleared ${result.deletedCount} events`, deletedCount: result.deletedCount });
  } catch (error) {
    console.error('clearEvents error:', error);
    res.status(500).json({ message: 'Failed to clear events', error: error.message });
  }
};

module.exports = {
  assignStudent,
  getAssignments,
  updateAssignment,
  deleteAssignment,
  getActiveTrips,
  getEventHistory,
  getDashboardStats,
  fixStudentData,
  clearEvents
};
