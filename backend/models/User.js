const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'driver', 'student'],
      required: true
    },
    name: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    assignedBusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus'
    },
    assignedStopId: {
      type: Number // sequence of stop in route.stops array
    },
    driverMeta: {
      bus: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bus',
        default: null
      }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
