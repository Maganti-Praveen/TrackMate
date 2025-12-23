const webPush = require('web-push');
const StudentAssignment = require('../models/StudentAssignment');

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = require('../config/constants');

webPush.setVapidDetails(
  'mailto:admin@trackmate.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Helper to send push
const sendPush = async (subscription, payload) => {
  try {
    await webPush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error('Push Send Error:', err);
    return false;
  }
};

const sendPushNotification = async ({ busId, title, body }) => {
  // Find all students assigned to this bus
  const assignments = await StudentAssignment.find({ bus: busId }).populate('student', 'username pushSubscription');
  let sentCount = 0;

  for (const assignment of assignments) {
    // Check if student has a web push subscription saved
    const student = assignment.student;
    if (student?.pushSubscription) {
      const payload = { title, body, url: '/student' };
      const success = await sendPush(student.pushSubscription, payload);
      if (success) {
        sentCount++;
        console.log(`📣 Push Sent -> ${student.username}`);
      }
    }
  }
  return sentCount;
};

const sendSOSNotification = async ({ tripId, message, location }) => {
  try {
    const Trip = require('../models/Trip');
    const User = require('../models/User');

    console.log(`🚨 SOS BROADCAST | Trip: ${tripId} | Msg: ${message}`);

    const trip = await Trip.findById(tripId);
    if (!trip || !trip.bus) {
      console.error('SOS Error: Trip or Bus not found');
      return false;
    }

    // Find all students assigned to this bus with a subscription
    const students = await User.find({
      assignedBusId: trip.bus,
      role: 'student',
      pushSubscription: { $ne: null }
    }).select('username pushSubscription');

    console.log(`[SOS] Found ${students.length} students to alert.`);

    let sentCount = 0;
    for (const student of students) {
      const payload = {
        title: '🚨 EMERGENCY ALERT',
        body: `Driver SOS: ${message}`,
        icon: '/icons/sos-alert.png', // Ensure this exists or use default
        data: { url: '/student' },
        tag: 'sos-alert',
        renotify: true,
        requireInteraction: true // Critical for SOS
      };

      const success = await sendPush(student.pushSubscription, payload);
      if (success) sentCount++;
    }

    console.log(`[SOS] Sent push to ${sentCount}/${students.length} students.`);
    return true;
  } catch (err) {
    console.error('SOS Push Error:', err);
    return false;
  }
};

module.exports = { sendPushNotification, sendSOSNotification };
