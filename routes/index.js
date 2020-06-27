'use strict';
var express = require('express');
var router = express.Router();
const admin = require('firebase-admin');
var serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://calgo-6eaf4.firebaseio.com"
});

let db = admin.firestore();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Calgo - An Indigenous Video Calling Solution' });
});


router.get('/host-a-meeting', function(req, res,next){
 var meetingId=getRandomInt();

 res.render('hostMeeting', { title: 'Calgo - An Indigenous Video Calling Solution'
    });
});

router.get('/one-to-one-meeting-host', function(req, res,next){
    var meetingId=getRandomInt();

    res.render('one-to-one-call-host', { title: 'Calgo - One to one video calling Solution'
    });
});

router.get('/one-to-one-meeting-join', function(req, res,next){
    var meetingId=req.query.meetingId;
    res.render('one-to-one-call-join', { title: 'Calgo - One to one video calling Solution',
        meetingId:meetingId
    });
});

router.get('/join-a-meeting', function(req, res,next){
    var meetingId=req.query.meetingId;
    console.log(meetingId);
    let cityRef = db.collection('meetings').doc(meetingId);
    let getDoc = cityRef.get()
        .then(doc => {
            if (!doc.exists) {
                console.log('No such document!');
            } else {
                var peerCount = doc.data().count;
                console.log(peerCount);
                res.render('joinMeeting', { title: 'Calgo - An Indigenous Video Calling Solution',
                    meetingId:meetingId,
                    peerCount : peerCount
                });
            }
        })
        .catch(err => {
            console.log('Error getting document', err);
        });

});


function getRandomInt() {
  return Math.floor(Math.random() * Math.floor(999999));
}


module.exports = router;
