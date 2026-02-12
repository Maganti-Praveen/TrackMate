const express = require('express');
const { login, getProfile, updateProfile, registerStudent, forgotPassword } = require('../controllers/authController');
const { getBusesWithRoutes } = require('../controllers/studentController');
const authMiddleware = require('../middleware/authMiddleware');
const { sanitizeInput } = require('../middleware/validateMiddleware');

const router = express.Router();

router.post('/login', sanitizeInput, login);
router.post('/register', sanitizeInput, registerStudent);
router.post('/forgot-password', sanitizeInput, forgotPassword);
router.get('/me', authMiddleware, getProfile);
router.put('/profile', authMiddleware, sanitizeInput, updateProfile);

// Public — no auth required (used by registration form)
router.get('/buses', getBusesWithRoutes);

module.exports = router;

