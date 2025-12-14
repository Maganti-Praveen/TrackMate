const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const Bus = require('../models/Bus');
const Route = require('../models/Route');
const Stop = require('../models/Stop');
const StudentAssignment = require('../models/StudentAssignment');

const seed = async () => {
  await connectDB();

  const admin = await User.findOne({ username: 'ad1' });
  if (!admin) {
    await User.create({ username: 'ad1', password: 'ad1', role: 'admin', name: 'Admin One' });
  }

  let driver = await User.findOne({ username: 'dr1' });
  if (!driver) {
    driver = await User.create({ username: 'dr1', password: 'dr1', role: 'driver', name: 'Driver One' });
  }

  let route = await Route.findOne({ name: 'Route 1' });
  if (!route) {
    route = await Route.create({ name: 'Route 1', description: 'City Center Loop' });
  }

  const stopsData = [
    { name: 'Campus Main Gate', latitude: 17.4451, longitude: 78.3498, sequence: 1 },
    { name: 'Metro Station', latitude: 17.4416, longitude: 78.3912, sequence: 2 },
    { name: 'Hostel Junction', latitude: 17.4253, longitude: 78.4506, sequence: 3 }
  ];

  const stopIds = [];
  for (const stopInfo of stopsData) {
    const stop = await Stop.findOneAndUpdate(
      { route: route._id, sequence: stopInfo.sequence },
      { ...stopInfo, route: route._id },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    stopIds.push(stop._id);
  }

  await Route.findByIdAndUpdate(route._id, { stops: stopIds });

  const bus = await Bus.findOneAndUpdate(
    { numberPlate: 'TS09AB1234' },
    {
      name: 'Blue Bird',
      numberPlate: 'TS09AB1234',
      capacity: 44,
      driver: driver._id,
      route: route._id,
      isActive: true
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await User.findByIdAndUpdate(driver._id, { 'driverMeta.bus': bus._id });

  const student = await User.findOneAndUpdate(
    { username: '22ME1A0501' },
    { username: '22ME1A0501', password: '22ME1A0501', role: 'student', name: 'Sita Raman' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await StudentAssignment.findOneAndUpdate(
    { student: student._id },
    { student: student._id, bus: bus._id, stop: stopIds[2] },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('✅ Seed data ready: Route 1 with 3 stops, bus TS09AB1234, student 22ME1A0501');
};

seed()
  .then(() => {
    console.log('Seeding completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
