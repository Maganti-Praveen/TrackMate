const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { startTrip, getActiveTrip, deleteDailyHistory } = require('../controllers/tripController');

const router = express.Router();

router.use(authMiddleware, roleMiddleware('driver'));

router.post('/start', startTrip);
router.get('/active', getActiveTrip);
router.delete('/history/today', deleteDailyHistory);

module.exports = router;
