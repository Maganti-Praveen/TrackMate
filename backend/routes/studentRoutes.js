const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  getAssignment,
  getEta,
  registerNotificationToken,
  getLiveTrip
} = require('../controllers/studentController');

const router = express.Router();

router.use(authMiddleware, roleMiddleware('student'));

router.get('/assignment', getAssignment);
router.get('/me', getAssignment);
router.get('/eta', getEta);
router.get('/trip', getLiveTrip);
router.post('/notifications', registerNotificationToken);

module.exports = router;
