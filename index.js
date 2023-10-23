const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const https = require('https');
const fs = require('fs');

const {RtcTokenBuilder, RtcRole, RtmTokenBuilder, RtmRole} = require('agora-access-token');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const APP_ID = "be7369c2f93a4a24b92fdd2489202253";
const APP_CERTIFICATE = "eb1b896a29bf4e28980566dda9646c86";
const serviceAccount = require('./firebase/qtcare-healthapp-firebase-adminsdk-wytdm-52776e152b.json');
const http = require("http");
const {createServer} = require("http");
// Replace with the path to your Firebase service account key JSON file

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://qtcare-healthapp-default-rtdb.firebaseio.com' // Replace with your Firebase database URL
});
const nocache = (_, resp, next) => {
    resp.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    resp.header('Expires', '-1');
    resp.header('Pragma', 'no-cache');
    next();
}

const ping = (req, resp) => {
    resp.send({message: 'pong'});
}

const generateRTCToken = (req, resp) => {
    // set response header
    resp.header('Access-Control-Allow-Origin', '*');
    // get channel name
    const channelName = req.params.channel;
    if (!channelName) {
        return resp.status(500).json({ 'error': 'channel is required' });
    }
    // get uid
    let uid = req.params.uid;
    if(!uid || uid === '') {
        return resp.status(500).json({ 'error': 'uid is required' });
    }
    // get role
    let role;
    if (req.params.role === 'publisher') {
        role = RtcRole.PUBLISHER;
    } else if (req.params.role === 'audience') {
        role = RtcRole.SUBSCRIBER
    } else {
        return resp.status(500).json({ 'error': 'role is incorrect' });
    }
    // get the expire time
    let expireTime = req.query.expiry;
    if (!expireTime || expireTime === '') {
        expireTime = 3600;
    } else {
        expireTime = parseInt(expireTime, 10);
    }
    // calculate privilege expire time
    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTime + expireTime;
    // build the token
    let token;
    if (req.params.tokentype === 'userAccount') {
        token = RtcTokenBuilder.buildTokenWithAccount(APP_ID, APP_CERTIFICATE, channelName, uid, role, privilegeExpireTime);
    } else if (req.params.tokentype === 'uid') {
        token = RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERTIFICATE, channelName, uid, role, privilegeExpireTime);
    } else {
        return resp.status(500).json({ 'error': 'token type is invalid' });
    }
    // return the token
    return resp.json({ 'rtcToken': token });
}

const generateRTMToken = (req, resp) => {
    // set response header
    resp.header('Access-Control-Allow-Origin', '*');

    // get uid
    let uid = req.params.uid;
    if(!uid || uid === '') {
        return resp.status(500).json({ 'error': 'uid is required' });
    }
    // get role
    let role = RtmRole.Rtm_User;
    // get the expire time
    let expireTime = req.query.expiry;
    if (!expireTime || expireTime === '') {
        expireTime = 3600;
    } else {
        expireTime = parseInt(expireTime, 10);
    }
    // calculate privilege expire time
    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTime + expireTime;
    // build the token
    console.log(APP_ID, APP_CERTIFICATE, uid, role, privilegeExpireTime)
    const token = RtmTokenBuilder.buildToken(APP_ID, APP_CERTIFICATE, uid, role, privilegeExpireTime);
    // return the token
    return resp.json({ 'rtmToken': token });
}

const generateRTEToken = (req, resp) => {
    // set response header
    resp.header('Access-Control-Allow-Origin', '*');
    // get channel name
    const channelName = req.params.channel;
    if (!channelName) {
        return resp.status(500).json({ 'error': 'channel is required' });
    }
    // get uid
    let uid = req.params.uid;
    if(!uid || uid === '') {
        return resp.status(500).json({ 'error': 'uid is required' });
    }
    // get role
    let role;
    if (req.params.role === 'publisher') {
        role = RtcRole.PUBLISHER;
    } else if (req.params.role === 'audience') {
        role = RtcRole.SUBSCRIBER
    } else {
        return resp.status(500).json({ 'error': 'role is incorrect' });
    }
    // get the expire time
    let expireTime = req.query.expiry;
    if (!expireTime || expireTime === '') {
        expireTime = 3600;
    } else {
        expireTime = parseInt(expireTime, 10);
    }
    // calculate privilege expire time
    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTime + expireTime;
    // build the token
    const rtcToken = RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERTIFICATE, channelName, uid, role, privilegeExpireTime);
    const rtmToken = RtmTokenBuilder.buildToken(APP_ID, APP_CERTIFICATE, uid, role, privilegeExpireTime);
    // return the token
    return resp.json({ 'rtcToken': rtcToken, 'rtmToken': rtmToken });



}

app.get('/payement/:uid/:newsubscription', (req, res) => {
    const uid = req.params.uid;
    const newSubscription = req.params.newsubscription; // Convert the newsubscription parameter to a boolean value

    const ref = admin.database().ref(`users/${uid}`);
    ref.update({ subscription: newSubscription })
        .then(() => {
            console.log('Subscription updated successfully.');
            res.sendStatus(200);
        })
        .catch((error) => {
            console.error('Error updating subscription:', error);
            res.sendStatus(500);
        });
});

app.post('/webhook', (req, res) => {
    const data = req.body;
    console.log('Webhook received:', data);

    // Process the data as needed
    const {
        token,
        check_sum,
        payment_status,
        order_id,
        first_name,
        last_name,
        email,
        phone,
        note,
        amount,
        transaction_id,
        received_amount,
        cost
    } = data;

    if (payment_status === true) {
        // Payment successful, update the subscription in Firebase or perform other actions
        // Replace this with your Firebase update logic
        // const userId = '<USER_ID>'; // Replace with the user's ID
        // const newSubscription = '<NEW_SUBSCRIPTION>'; // Replace with the new subscription value
        // UpdateFirebaseSubscription(userId, newSubscription);

        // Example: Log the successful payment details
        console.log('Payment successful:');
        console.log('Token:', token);
        console.log('Order ID:', order_id);
        console.log('Amount:', amount);
        console.log('Transaction ID:', transaction_id);

        // Respond with a success status
        res.sendStatus(200);
    } else {
        // Payment failed or other error occurred
        console.log('Payment failed:');
        console.log('Token:', token);
        console.log('Order ID:', order_id);

        // Respond with a success status
        res.sendStatus(200);
    }
});
const options = {
    key: fs.readFileSync('private.key'),
    cert: fs.readFileSync('certificate.crt')
};

app.options('*', cors(),);
app.get('/ping', nocache, ping)
app.get('/rtc/:channel/:role/:tokentype/:uid', nocache , generateRTCToken);
app.get('/rtm/:uid/', nocache , generateRTMToken);
app.get('/rte/:channel/:role/:tokentype/:uid', nocache , generateRTEToken);



createServer(options, app).listen(PORT, () => {
    console.log(`Webhook server is running on port ${PORT}`);
});