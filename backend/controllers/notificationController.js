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
        if (error.statusCode === 410) {
            // Subscription expired
            await User.findByIdAndUpdate(user._id, { pushSubscription: null });
        }
    }
};

const testPush = async (req, res) => {
    try {
        // user is attached by authMiddleware
        const user = await User.findById(req.user.id);
        if (!user || !user.pushSubscription) {
            return res.status(400).json({ message: 'No subscription found for this user.' });
        }

        console.log('Sending Test Push to:', user.name);
        await webpush.sendNotification(user.pushSubscription, JSON.stringify({
            title: 'Test Notification',
            body: 'This is a test message from the Debugger.',
            url: '/',
            tag: 'test-push'
        }));

        res.json({ message: 'Test notification sent.' });
    } catch (error) {
        console.error('Test Push Error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { subscribe, sendPush, testPush };
