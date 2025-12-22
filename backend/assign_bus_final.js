const mongoose = require('mongoose');
const User = require('./models/User');

const TARGET_BUS_ID = '6948f52cba09a9ea44c26fa5';
const USERNAME = '23ME5A0512';

mongoose.connect('mongodb://localhost:27017/TrackMatev1')
    .then(async () => {
        console.log('Connected to DB');
        const res = await User.findOneAndUpdate(
            { username: USERNAME },
            {
                $set: {
                    assignedBusId: TARGET_BUS_ID,
                    stopCoordinates: { lat: 16.821302, lng: 80.996527 }
                }
            },
            { new: true }
        );
        console.log('SUCCESS: Assigned', res ? res.username : 'Unknown', 'to Bus', res ? res.assignedBusId : 'None');
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
