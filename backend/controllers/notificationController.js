const webpush = require('web-push');
const User = require('../models/User');
const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = require('../config/constants');

// Configure Web Push
webpush.setVapidDetails(
    'mailto:admin@trackmate.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

const subscribe = async (req, res) => {
    try {
        const subscription = req.body;
        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ message: 'Invalid subscription object' });
        }

        // Save to user
        // req.user is set by authMiddleware
        await User.findByIdAndUpdate(req.user.id, { pushSubscription: subscription });

        res.status(201).json({ message: 'Subscription saved' });
    } catch (error) {
        console.error('Sub Error:', error);
        res.status(500).json({ message: 'Failed to save subscription' });
    }
};

const sendPush = async (user, payload) => {
    if (!user.pushSubscription) return;
    try {
        await webpush.sendNotification(user.pushSubscription, JSON.stringify(payload));
    } catch (error) {
        console.error(`Push failed for user ${user.username}:`, error.message);
        // If subscription is invalid (404/410) or keys mismatch (401/400), clear it
        if ([404, 410, 400, 401].includes(error.statusCode)) {
            console.log(`Clearing invalid subscription for ${user.username}`);
            await User.findByIdAndUpdate(user._id, { pushSubscription: null });
        }
    }
};

const fs = require('fs');

const testPush = async (req, res) => {
    try {
        // user is attached by authMiddleware
        const user = await User.findById(req.user.id);
        if (!user || !user.pushSubscription) {
            return res.status(400).json({ message: 'No subscription found for this user.' });
        }

        console.log('Sending Test Push to:', user.name);
        try {
            await webpush.sendNotification(user.pushSubscription, JSON.stringify({
                title: 'Test Notification',
                body: 'This is a test message from the Debugger.',
                url: '/',
                tag: 'test-push'
            }));
            res.json({ message: 'Test notification sent.' });
        } catch (pushErr) {
            // Write to file so we can read it via tool
            const logMsg = `[PUSH ERROR] ${new Date().toISOString()} - ${pushErr.message} - Code: ${pushErr.statusCode}\nStack: ${pushErr.stack}\n`;
            fs.appendFileSync('debug.log', logMsg);

            console.error('Test Push Failed:', pushErr);
            // If failed, assume invalid subscription and clear it so frontend knows to re-subscribe
            if ([404, 410, 400, 401].includes(pushErr.statusCode)) {
                await User.findByIdAndUpdate(user._id, { pushSubscription: null });
                return res.status(400).json({ message: 'Subscription invalid or expired. Please toggle notifications OFF then ON.' });
            }
            throw pushErr;
        }
    } catch (error) {
        console.error('Test Push Error:', error);
        res.status(500).json({
            message: error.message || 'Internal Server Error',
            code: error.statusCode || 'UNKNOWN',
            details: error.body || error.stack
        });
    }
};

module.exports = { subscribe, sendPush, testPush };
