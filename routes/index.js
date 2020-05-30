'use strict';
var express = require('express');
var router = express.Router();



/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Calgo - An Indigenous Video Calling Solution' });
});


router.get('/host-a-meeting', function(req, res,next){
 var meetingId=getRandomInt();
 res.render('hostMeeting', { title: 'Calgo - An Indigenous Video Calling Solution',
                              meetingId : meetingId
    });
});

router.get('/join-a-meeting', function(req, res,next){
    res.render('joinMeeting', { title: 'Calgo - An Indigenous Video Calling Solution'
    });
});


function getRandomInt() {
  return Math.floor(Math.random() * Math.floor(999999));
}


module.exports = router;
