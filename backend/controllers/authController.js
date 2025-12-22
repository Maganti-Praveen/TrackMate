const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/constants');

const signToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      role: user.role,
      username: user.username
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

const serializeUser = (user) => ({
  id: user._id,
  username: user.username,
  role: user.role,
  name: user.name,
  assignedBusId: user.assignedBusId,
  assignedStopId: user.assignedStopId
});

// Plain-text login as requested (testing/dev only)
const login = async (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password.trim() : '';

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  let user = await User.findOne({ username });

  if (!user && ['ad1', 'dr1'].includes(username)) {
    await ensureDefaultAccounts();
    user = await User.findOne({ username });
  }

  if (!user || user.password !== password) {
    return res.status(401).json({
      message: 'Invalid credentials. Default admin is ad1/ad1. Run `cd backend && npm run seed` to recreate demo users.'
    });
  }

  const token = signToken(user);
  res.json({
    token,
    user: serializeUser(user)
  });
};

const getProfile = (req, res) => {
  res.json(serializeUser(req.user));
};

// Ensures there is at least one admin and one driver as per spec
const ensureDefaultAccounts = async () => {
  const admin = await User.findOne({ username: 'ad1' });
  if (!admin) {
    await User.create({ username: 'ad1', password: 'ad1', role: 'admin', name: 'Admin One' });
    console.log('Seeded default admin account (ad1/ad1)');
  }

  const driver = await User.findOne({ username: 'dr1' });
  if (!driver) {
    await User.create({ username: 'dr1', password: 'dr1', role: 'driver', name: 'Driver One' });
    console.log('Seeded default driver account (dr1/dr1)');
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, password } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();
    if (password) user.password = password.trim();

    await user.save();
    res.json(serializeUser(user));
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

module.exports = { login, getProfile, updateProfile, ensureDefaultAccounts };
