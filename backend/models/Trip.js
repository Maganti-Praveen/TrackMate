const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
  {
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: true
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'ONGOING', 'COMPLETED'],
      default: 'PENDING'
    },
    currentStopIndex: {
      type: Number,
      default: 0
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    endedAt: Date,
    lastLocation: {
      lat: Number,
      lng: Number,
      updatedAt: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Trip', tripSchema);
