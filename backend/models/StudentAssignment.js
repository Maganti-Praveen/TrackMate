const mongoose = require('mongoose');

const studentAssignmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: true
    },
    stop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stop',
      required: true
    },
    notificationToken: {
      type: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudentAssignment', studentAssignmentSchema);
