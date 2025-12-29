const mongoose = require('mongoose');

const studentAssignmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: true,
      index: true
    },
    stop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stop',
      required: true,
      index: true
    },
    notificationToken: {
      type: String
    }
  },
  { timestamps: true }
);

// Compound index for finding all students on a bus
studentAssignmentSchema.index({ bus: 1, student: 1 });

module.exports = mongoose.model('StudentAssignment', studentAssignmentSchema);
