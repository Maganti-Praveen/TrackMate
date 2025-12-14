const User = require('../models/User');
const StudentAssignment = require('../models/StudentAssignment');

const scrubPassword = (userDoc) => {
  if (!userDoc) return userDoc;
  const obj = userDoc.toObject ? userDoc.toObject() : userDoc;
  delete obj.password;
  return obj;
};

const listStudents = async (_req, res) => {
  const students = await User.find({ role: 'student' }).select('-password');
  res.json(students);
};

const createStudent = async (req, res) => {
  try {
    const { username, password, name, phone } = req.body;
    if (!username) {
      return res.status(400).json({ message: 'username is required' });
    }

    const student = await User.create({
      username: username.trim(),
      password: (password || username).trim(),
      role: 'student',
      name,
      phone
    });

    res.status(201).json(scrubPassword(student));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateStudent = async (req, res) => {
  try {
    const updates = {};
    ['username', 'name', 'phone'].forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = typeof req.body[field] === 'string' ? req.body[field].trim() : req.body[field];
      }
    });

    if (req.body.password) {
      updates.password = req.body.password.trim();
    }

    const student = await User.findOneAndUpdate({ _id: req.params.id, role: 'student' }, updates, {
      new: true,
      runValidators: true
    }).select('-password');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteStudent = async (req, res) => {
  const student = await User.findOneAndDelete({ _id: req.params.id, role: 'student' });
  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }

  await StudentAssignment.deleteMany({ student: student._id });
  res.json({ message: 'Student removed' });
};

module.exports = { listStudents, createStudent, updateStudent, deleteStudent };
