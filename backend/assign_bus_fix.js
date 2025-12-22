const mongoose = require('mongoose');
const User = require('./models/User');
const Bus = require('./models/Bus');

// Hardcoded from logs
const BUS_ID = '67666ea5a72df888db094770'; // From earlier log "Trip Bus ID: new ObjectId("694...")" - wait, log said 6948f52cba09a9ea44c26fa5. 
// Actually, let me copy the ID from the terminal output log exactly.
// DEBUG: Trip Bus ID: new ObjectId("6948f52cba09a9ea44c26fa5")

const TARGET_BUS_ID = '6948f52cba09a9ea44c26fa5';
const USERNAME = '23ME5A0512'; // From log "Sample Student: 23ME5A0512"

mongoose.connect('mongodb://localhost:27017/TrackMatev1')
    .then(async () => {
        console.log('Connected to DB');

        // update student
        const res = await User.findOneAndUpdate(
            { username: USERNAME },
            {
                $set: {
                    assignedBusId: TARGET_BUS_ID,
                    // Set stop coordinates to roughly where the bus is or where simulation goes
                    // Let's set it to some point near the route start to trigger proximity soon
                    stopCoordinates: { lat: 16.821302, lng: 80.996527 } // Start of route
                }
            },
            { new: true }
        );

        console.log('Updated User:', res ? res.username : 'Not Found', 'Bus:', res ? res.assignedBusId : 'N/A');
        process.exit();
    })
    .catch(err => console.error(err));
