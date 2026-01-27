const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/constants');

const SALT_ROUNDS = 10;

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

// Hash a password
const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

// Verify password against hash
const verifyPassword = async (password, hash) => {
  // Handle legacy plain-text passwords (migrate on successful login)
  if (!hash.startsWith('$2')) {
    return password === hash;
  }
  return bcrypt.compare(password, hash);
};

// Secure login with bcrypt password verification
const login = async (req, res) => {
  try {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password.trim() : '';

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    let user = await User.findOne({ username });

    if (!user && username === 'ad1') {
      await ensureDefaultAccounts();
      user = await User.findOne({ username });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Migrate legacy plain-text password to bcrypt hash on successful login
    if (!user.password.startsWith('$2')) {
      user.password = await hashPassword(password);
      await user.save();
    }

    const token = signToken(user);
    res.json({
      token,
      user: serializeUser(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
};

const getProfile = (req, res) => {
  res.json(serializeUser(req.user));
};

// Ensures there is at least one admin as per spec
const ensureDefaultAccounts = async () => {
  const admin = await User.findOne({ username: 'ad1' });
  if (!admin) {
    const hashedPassword = await hashPassword('ad1');
    await User.create({ username: 'ad1', password: hashedPassword, role: 'admin', name: 'TrackMate Admin' });
    console.log('Seeded default admin account (ad1/ad1)');
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, password, currentPassword } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();

    // Password change requires current password verification
    if (password) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to change password' });
      }

      const isValid = await verifyPassword(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      user.password = await hashPassword(password.trim());
    }

    await user.save();
    res.json(serializeUser(user));
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

// Register student account (students only - no admin/driver self-registration)
const registerUser = async (req, res) => {
  try {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password.trim() : '';
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: 'Username already taken' });
    }

    // Create student account
    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      username,
      password: hashedPassword,
      role: 'student',
      name: name || username,
      phone
    });

    // Auto-login after registration
    const token = signToken(user);
    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: serializeUser(user)
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
};

module.exports = { login, getProfile, updateProfile, ensureDefaultAccounts, hashPassword, registerStudent: registerUser };


