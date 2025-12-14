const webpush = require('web-push');
const fs = require('fs');
const vapidKeys = webpush.generateVAPIDKeys();
fs.writeFileSync('temp_keys.txt', `PUBLIC_KEY=${vapidKeys.publicKey}\nPRIVATE_KEY=${vapidKeys.privateKey}`);
