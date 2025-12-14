const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const User = require('./models/User');
const Route = require('./models/Route');
const Bus = require('./models/Bus');
const Trip = require('./models/Trip');
const { JWT_SECRET, DEFAULT_SEG_SEC } = require('./config/constants');

const stopsBlueprint = [
  { name: 'North Gate', lat: 17.44712, lng: 78.34883, seq: 0 },
  { name: 'Library Circle', lat: 17.44297, lng: 78.35619, seq: 1 },
  { name: 'Metro Station', lat: 17.4386, lng: 78.36571, seq: 2 },
  { name: 'Tech Park', lat: 17.43122, lng: 78.37302, seq: 3 }
];

const routeGeoJSON = {
  type: 'LineString',
  coordinates: stopsBlueprint.map((stop) => [stop.lng, stop.lat])
};

const buildDefaultSegStats = (stops) =>
  Array(Math.max(stops.length - 1, 0))
    .fill(null)
    .map(() => ({ avgSec: DEFAULT_SEG_SEC, samples: 1 }));

const upsertUser = async (payload) => {
  const result = await User.findOneAndUpdate(
    { username: payload.username },
    payload,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return result;
};

const issueToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

const seed = async () => {
  await connectDB();

  const route = await Route.findOneAndUpdate(
    { name: 'Morning Loop A' },
    {
      name: 'Morning Loop A',
      geojson: routeGeoJSON,
      stops: stopsBlueprint,
      segStats: buildDefaultSegStats(stopsBlueprint)
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const bus = await Bus.findOneAndUpdate(
    { numberPlate: 'BUS-1001' },
    {
      name: 'BlueBird 1001',
      numberPlate: 'BUS-1001',
      route: route._id,
      capacity: 44,
      driver: null
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const admin = await upsertUser({
    username: 'ad1',
    password: 'ad1',
    role: 'admin',
    name: 'Admin One'
  });

  const driver = await upsertUser({
    username: 'dr1',
    password: 'dr1',
    role: 'driver',
    name: 'Driver One',
    assignedBusId: bus._id
  });

  const studentOne = await upsertUser({
    username: '22ME1A0501',
    password: '22ME1A0501',
    role: 'student',
    name: 'Student North',
    assignedBusId: bus._id,
    assignedStopId: stopsBlueprint[1].seq
  });

  const studentTwo = await upsertUser({
    username: '22ME1A0502',
    password: '22ME1A0502',
    role: 'student',
    name: 'Student Metro',
    assignedBusId: bus._id,
    assignedStopId: stopsBlueprint[2].seq
  });

  await Bus.findByIdAndUpdate(bus._id, { driver: driver._id });
  await User.findByIdAndUpdate(driver._id, {
    assignedBusId: bus._id,
    'driverMeta.bus': bus._id
  });
  await Trip.deleteMany({ status: { $ne: 'COMPLETED' } });

  const summary = [admin, driver, studentOne, studentTwo].map((user) => ({
    role: user.role,
    username: user.username,
    assignedBus: user.assignedBusId ? user.assignedBusId.toString() : '-',
    assignedStop: typeof user.assignedStopId === 'number' ? user.assignedStopId : '-'
  }));

  console.log('\n✅ Seed complete. Accounts ensured:');
  console.table(summary);

  console.log('\n🔐 JWT tokens (12h). Copy for quick testing:');
  for (const user of [admin, driver, studentOne, studentTwo]) {
    const token = issueToken(user);
    console.log(`${user.role.toUpperCase()} ${user.username}: ${token}`);
  }

  console.log(`\n🚌 Route '${route.name}' with ${route.stops.length} stops assigned to bus ${bus.numberPlate}.`);
};

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Seeding failed', error);
    process.exit(1);
  });
