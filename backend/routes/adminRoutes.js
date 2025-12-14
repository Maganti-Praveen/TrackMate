const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  assignStudent,
  getAssignments,
  updateAssignment,
  deleteAssignment,
  getActiveTrips,
  getEventHistory,
  getDashboardStats,
  fixStudentData
} = require('../controllers/adminController');
const {
  createDriverAccount,
  getDrivers,
  updateDriverAccount,
  deleteDriverAccount
} = require('../controllers/driverController');
const {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent
} = require('../controllers/studentAdminController');

const router = express.Router();

router.get('/fix-data', fixStudentData);

router.use(authMiddleware, roleMiddleware('admin'));

router.get('/dashboard', getDashboardStats);
router.post('/assignments', assignStudent);
router.get('/assignments', getAssignments);
router.put('/assignments/:id', updateAssignment);
router.delete('/assignments/:id', deleteAssignment);
router.get('/trips', getActiveTrips);
router.get('/events', getEventHistory);
router.post('/drivers', createDriverAccount);
router.get('/drivers', getDrivers);
router.put('/drivers/:id', updateDriverAccount);
router.delete('/drivers/:id', deleteDriverAccount);
router.get('/students', listStudents);
router.post('/students', createStudent);
router.put('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);

module.exports = router;
