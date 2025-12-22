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

const sendSOSNotification = async ({ tripId, message }) => {
  console.log(`🚨 SOS BROADCAST | Trip: ${tripId} | Msg: ${message}`);
  // In a real implementation: find bus -> find assignments -> broadcast
  // For now, we log it. The sendPushNotification above handles standard alerts.
  return true;
};

module.exports = { sendPushNotification, sendSOSNotification };
