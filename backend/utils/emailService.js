const nodemailer = require('nodemailer');
const dns = require('dns');

// Force IPv4-first DNS resolution — Render free tier doesn't support IPv6 outbound
// This prevents ENETUNREACH errors when smtp.gmail.com resolves to IPv6
dns.setDefaultResultOrder('ipv4first');

// Email configuration — explicit SMTP settings
const EMAIL_CONFIG = {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || 'trackmate15@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'sbkh vnco zcuq kyfg'
  },
  connectionTimeout: 30000,
  socketTimeout: 30000
};

// Create reusable transporter
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport(EMAIL_CONFIG);
    // Verify connection on first use (logs to console, doesn't block)
    transporter.verify()
      .then(() => console.log('✅ Email transporter ready (smtp.gmail.com:465 IPv4)'))
      .catch(err => console.error('❌ Email transporter verification failed:', err.message));
  }
  return transporter;
};

/**
 * Send welcome email to new student
 * @param {Object} params - Email parameters
 * @param {string} params.email - Student email address
 * @param {string} params.fullName - Student full name
 * @param {string} params.username - Student username/roll number
 * @param {string} params.busNumber - Assigned bus number
 * @param {string} params.routeName - Route name
 * @param {string} params.stopName - Boarding stop name
 * @returns {Promise<boolean>} Success status
 */
const sendWelcomeEmail = async ({ email, fullName, username, busNumber, routeName, stopName }) => {
  try {
    const mailOptions = {
      from: `"TrackMate Team" <${EMAIL_CONFIG.auth.user}>`,
      to: email,
      subject: 'Welcome to TrackMate – Smart Bus Tracking System',
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .details { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
    .detail-row { margin: 10px 0; }
    .detail-label { font-weight: bold; color: #667eea; }
    .steps { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .step { margin: 15px 0; padding-left: 25px; position: relative; }
    .step:before { content: "✓"; position: absolute; left: 0; color: #667eea; font-weight: bold; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">🚍 Welcome to TrackMate</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px;">Smart Bus Tracking System</p>
    </div>
    
    <div class="content">
      <p>Hello <strong>${fullName}</strong>,</p>
      
      <p>Welcome to <strong>TrackMate – Smart Bus Tracking System</strong>!</p>
      <p>Your account has been successfully created and you are now ready to track your assigned bus in real time.</p>
      
      <div class="details">
        <h3 style="margin-top: 0; color: #667eea;">📋 Your Account Details:</h3>
        <div class="detail-row">
          <span class="detail-label">Username / Roll Number:</span> ${username}
        </div>
        <div class="detail-row">
          <span class="detail-label">Assigned Bus Number:</span> ${busNumber || 'Not assigned yet'}
        </div>
        <div class="detail-row">
          <span class="detail-label">Route:</span> ${routeName || 'Not assigned yet'}
        </div>
        <div class="detail-row">
          <span class="detail-label">Boarding Stop:</span> ${stopName || 'Not assigned yet'}
        </div>
      </div>
      
      <div class="steps">
        <h3 style="margin-top: 0; color: #667eea;">🚀 Getting Started:</h3>
        <div class="step">Login using your roll number as the initial password.</div>
        <div class="step">Change your password after first login for security.</div>
        <div class="step">Track your bus live and check ETA from your dashboard.</div>
        <div class="step">Enable notifications to receive arrival alerts.</div>
      </div>
      
      <div class="warning">
        <h3 style="margin-top: 0; color: #856404;">🔒 Important Security Note:</h3>
        <p style="margin: 0;">For your safety, please update your password immediately after logging in. Your initial password is your roll number (<strong>${username}</strong>).</p>
      </div>
      
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #667eea;">❓ Need Help?</h3>
        <p style="margin: 0;">If your bus/route details are incorrect or you face any issues, please contact the TrackMate administrator.</p>
      </div>
      
      <p>We hope TrackMate makes your daily commute smarter, safer, and more convenient.</p>
      
      <div class="footer">
        <p><strong>Best Regards,</strong><br>
        <strong>TrackMate Team</strong><br>
        Smart Campus Transportation System</p>
      </div>
    </div>
  </div>
</body>
</html>
      `
    };

    const transport = getTransporter();
    await transport.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send welcome email:', error.message);
    return false;
  }
};

/**
 * Send stop arrival notification email (backup for push)
 * @param {Object} params - Email parameters
 * @param {string} params.email - Student email
 * @param {string} params.fullName - Student name
 * @param {string} params.stopName - Stop name
 * @param {number} params.etaMinutes - ETA in minutes
 * @returns {Promise<boolean>} Success status
 */
const sendStopArrivalEmail = async ({ email, fullName, stopName, etaMinutes }) => {
  try {
    const mailOptions = {
      from: `"TrackMate Alerts" <${EMAIL_CONFIG.auth.user}>`,
      to: email,
      subject: `🚍 Bus Arriving at ${stopName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .alert { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px; }
    .content { padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="alert">
      <h2 style="margin: 0;">🚍 Bus Alert</h2>
    </div>
    <div class="content">
      <p>Hi <strong>${fullName}</strong>,</p>
      <p>Your bus is arriving at <strong>${stopName}</strong> in approximately <strong>${etaMinutes} minute${etaMinutes !== 1 ? 's' : ''}</strong>.</p>
      <p>Please be ready at your stop.</p>
      <p style="margin-top: 30px; color: #666; font-size: 14px;">
        Best regards,<br>
        <strong>TrackMate Team</strong>
      </p>
    </div>
  </div>
</body>
</html>
      `
    };

    const transport = getTransporter();
    await transport.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Failed to send stop arrival email:', error.message);
    return false;
  }
};

/**
 * Send password reset email
 * @param {Object} params - Email parameters
 * @param {string} params.email - User email address
 * @param {string} params.fullName - User full name
 * @param {string} params.username - Username/roll number (also the reset password)
 * @returns {Promise<boolean>} Success status
 */
const sendPasswordResetEmail = async ({ email, fullName, username }) => {
  try {
    const mailOptions = {
      from: `"TrackMate Team" <${EMAIL_CONFIG.auth.user}>`,
      to: email,
      subject: 'TrackMate – Password Reset',
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .details { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
    .detail-row { margin: 10px 0; }
    .detail-label { font-weight: bold; color: #667eea; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">🔑 Password Reset</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px;">TrackMate – Smart Bus Tracking</p>
    </div>
    
    <div class="content">
      <p>Hello <strong>${fullName}</strong>,</p>
      
      <p>Your password has been reset successfully. Here are your updated login credentials:</p>
      
      <div class="details">
        <h3 style="margin-top: 0; color: #667eea;">📋 Login Credentials:</h3>
        <div class="detail-row">
          <span class="detail-label">Username:</span> ${username}
        </div>
        <div class="detail-row">
          <span class="detail-label">New Password:</span> ${username}
        </div>
      </div>
      
      <div class="warning">
        <h3 style="margin-top: 0; color: #856404;">🔒 Important:</h3>
        <p style="margin: 0;">Please change your password immediately after logging in. Your password has been reset to your roll number (<strong>${username}</strong>) for security purposes.</p>
      </div>
      
      <p>If you did not request this password reset, please contact the TrackMate administrator immediately.</p>
      
      <div class="footer">
        <p><strong>Best Regards,</strong><br>
        <strong>TrackMate Team</strong><br>
        Smart Campus Transportation System</p>
      </div>
    </div>
  </div>
</body>
</html>
      `
    };

    const transport = getTransporter();
    await transport.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error.message);
    return false;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendStopArrivalEmail,
  sendPasswordResetEmail
};
