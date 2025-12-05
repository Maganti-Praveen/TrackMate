const Trip = require('../models/Trip');
const Bus = require('../models/Bus');
const Route = require('../models/Route');

const startTrip = async (req, res) => {
  try {
    const driverId = req.user._id;
    const { busId } = req.body;
    if (!busId) {
      return res.status(400).json({ message: 'busId is required' });
    }

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }
    if (bus.driver && bus.driver.toString() !== driverId.toString()) {
      return res.status(403).json({ message: 'You are not assigned to this bus' });
    }
    if (!bus.route) {
      return res.status(400).json({ message: 'Bus has no route assigned' });
    }

    const route = await Route.findById(bus.route);
    if (!route || route.stops.length === 0) {
      return res.status(400).json({ message: 'Route is missing stops' });
    }

    const existingTrip = await Trip.findOne({ bus: bus._id, status: 'ONGOING' });
    if (existingTrip) {
      return res.json(existingTrip);
    }

    const trip = await Trip.create({
      bus: bus._id,
      driver: driverId,
      route: route._id,
      status: 'ONGOING',
      currentStopIndex: 0,
      startedAt: new Date()
    });

    res.status(201).json(trip);
  } catch (error) {
    console.error('startTrip error', error);
    res.status(500).json({ message: 'Failed to start trip', error: error.message });
  }
};

const advanceToNextStop = async (tripId) => {
  const trip = await Trip.findById(tripId);
  if (!trip) {
    return null;
  }
  trip.currentStopIndex += 1;
  await trip.save();
  return trip;
};

const getActiveTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({ driver: req.user._id, status: 'ONGOING' })
      .populate('bus')
      .populate({ path: 'route', populate: { path: 'stops' } });

    if (!trip) {
      return res.status(404).json({ message: 'No active trip' });
    }

    res.json(trip);
  } catch (error) {
    console.error('getActiveTrip error', error);
    res.status(500).json({ message: 'Failed to fetch active trip', error: error.message });
  }
};

module.exports = { startTrip, advanceToNextStop, getActiveTrip };
