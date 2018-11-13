
var config = {
    apiKey: "AIzaSyAr-nhQDwleoVncvnPOyaRSdKO05aVRpTw",
    authDomain: "nearby-beacons-ebf80.firebaseapp.com",
    databaseURL: "https://nearby-beacons-ebf80.firebaseio.com",
    projectId: "nearby-beacons-ebf80",
    storageBucket: "nearby-beacons-ebf80.appspot.com",
    messagingSenderId: "650314024527"
};
firebase.initializeApp(config);

var db = firebase.firestore();

const settings = { timestampsInSnapshots: true };
db.settings(settings);

