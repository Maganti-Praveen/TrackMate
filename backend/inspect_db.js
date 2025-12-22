const mongoose = require('mongoose');
const User = require('./models/User');
const Bus = require('./models/Bus');
const Trip = require('./models/Trip');

mongoose.connect('mongodb://localhost:27017/TrackMatev1')
    .then(async () => {
        console.log('--- USERS (Student) ---');
        const student = await User.findOne({ username: '23ME5A0512' });
        console.log(student ? JSON.stringify(student.toObject(), null, 2) : 'Student 23ME5A0512 NOT FOUND');

        console.log('\n--- BUSES ---');
        const buses = await Bus.find({});
        console.log(JSON.stringify(buses, null, 2));

        console.log('\n--- ACTIVE TRIPS ---');
        const trips = await Trip.find({ status: 'ACTIVE' });
        console.log(JSON.stringify(trips, null, 2));

        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
