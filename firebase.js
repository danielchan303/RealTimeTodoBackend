// config firebase-admin
var admin = require('firebase-admin');
var serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://todo-list-danielchan.firebaseio.com"
});

module.exports = admin;