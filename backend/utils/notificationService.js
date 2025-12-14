const StudentAssignment = require('../models/StudentAssignment');

// Placeholder push notification service that logs the outgoing notifications
const sendPushNotification = async ({ busId, title, body }) => {
  const assignments = await StudentAssignment.find({ bus: busId }).populate('student', 'username');
  assignments.forEach((assignment) => {
    const token = assignment.notificationToken || 'no-token';
    console.log(
      `📣 Push -> Student ${assignment.student.username} | token=${token} | ${title}: ${body}`
    );
  });
  return assignments.length;
};

module.exports = { sendPushNotification };
