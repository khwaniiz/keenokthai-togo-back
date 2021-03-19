var admin = require("firebase-admin");

var serviceAccount = require('../config/firebaseAccountKey.json.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://keenok-ecommerce-61f09.firebaseio.com"
});

module.exports = admin;


// https://stackoverflow.com/questions/37482366/is-it-safe-to-expose-firebase-apikey-to-the-public
//bote2534