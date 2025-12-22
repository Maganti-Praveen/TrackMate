const express = require('express');
const { login, getProfile, updateProfile } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', login);
router.get('/me', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);

module.exports = router;
