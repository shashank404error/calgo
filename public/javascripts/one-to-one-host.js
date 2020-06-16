// Your web app's Firebase configuration
var firebaseConfig = {
    apiKey: "AIzaSyDcfvNEfMU2kIivbZ6FU-ol65ly09p7PcM",
    authDomain: "calgo-6eaf4.firebaseapp.com",
    databaseURL: "https://calgo-6eaf4.firebaseio.com",
    projectId: "calgo-6eaf4",
    storageBucket: "calgo-6eaf4.appspot.com",
    messagingSenderId: "78361495018",
    appId: "1:78361495018:web:2e6f1407c83f058cbc1e93",
    measurementId: "G-XT5CBV4GPZ"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.analytics();

const configuration = {
    iceServers: [
        {
            urls: [
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
            ],
        },
    ],
    iceCandidatePoolSize: 10,
};

let peerConnection = null;
let localStream = null;
let remoteStream = null;
let localStreamScreen  = null;
let meetingId = null;

function init() {
    openUserMedia()
}

async function createRoom() {
    //getting hidden features on
    document.getElementById("callButton").style.display="none";
    document.getElementById("hangupButton").style.display="block";
    document.getElementById("screenSharingButton").style.display="block";
    document.getElementById("messageBeforeConnecting").innerHTML="<h4>Share the link generated below</h4><br><h5>and wait for others to join...</h5>";
    document.getElementById("shareLinkLabel").style.display="block";

    const db = firebase.firestore();
    const meetingRef = await db.collection('meetings').doc();
    meetingId = meetingRef.id;
    checkForScreenSharing(meetingId);

    console.log('Calgo peer configuration: ', configuration);
    peerConnection = new RTCPeerConnection(configuration);

    registerPeerConnectionListeners(peerConnection);

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Code for collecting ICE candidates below
    const callerCandidatesCollection = meetingRef.collection('callerCandidates');

    peerConnection.addEventListener('icecandidate', event => {
        if (!event.candidate) {
            console.log('Got final candidate!');
            return;
        }
        console.log('Got candidate: ', event.candidate);
        callerCandidatesCollection.add(event.candidate.toJSON());
    });
    // Code for collecting ICE candidates above

    // Code for creating a room below
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    console.log('Created offer:', offer);

    const roomWithOffer = {
        'offer': {
            type: offer.type,
            sdp: offer.sdp,
        },
    };
    await meetingRef.set(roomWithOffer);

    console.log(`Calgo created meeting with SDP offer. Meeting ID: ${meetingRef.id}`);
    //document.querySelector('#meetingIdForChatRoom').innerText = `Meeting ID - ${meetingRef.id}`;

    var meetingLink = "https://calgo1.herokuapp.com/one-to-one-meeting-join?meetingId="+meetingId;
    var hrefLinkText = document.createTextNode(meetingLink);
    var anchorTag = document.createElement("a");
    anchorTag.appendChild(hrefLinkText);

    anchorTag. href = meetingLink;
    document.getElementById("uniqueHrefToMeet").appendChild(anchorTag);
    // Code for creating a room above

    peerConnection.addEventListener('track', event => {
        console.log('Calgo Got remote track:', event.streams[0]);
        event.streams[0].getTracks().forEach(track => {
            console.log('Calgo added remoteStream track:', track);
            remoteStream.addTrack(track);
        });
    });

    // Listening for remote session description below
    meetingRef.onSnapshot(async snapshot => {
        const data = snapshot.data();
        if (!peerConnection.currentRemoteDescription && data && data.answer) {
            console.log('Got remote description: ', data.answer);
            const rtcSessionDescription = new RTCSessionDescription(data.answer);
            await peerConnection.setRemoteDescription(rtcSessionDescription);
            document.getElementById("messageBeforeConnecting").style.display="none";
            document.getElementById("shareLinkLabel").style.display="none";
            document.getElementById("remoteVideo").style.display="block";
        }
    });
    // Listening for remote session description above

    // Listen for remote ICE candidates below
    meetingRef.collection('calleeCandidates').onSnapshot(snapshot => {
        snapshot.docChanges().forEach(async change => {
            if (change.type === 'added') {
                let data = change.doc.data();
                console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
                await peerConnection.addIceCandidate(new RTCIceCandidate(data));
            }
        });
    });
    // Listen for remote ICE candidates above
}

async function openUserMedia(e) {
    const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: {'echoCancellation': true}});
    document.querySelector('#localVideo').srcObject = stream;
    localStream = stream;
    remoteStream = new MediaStream();
    document.querySelector('#remoteVideo').srcObject = remoteStream;

    console.log('Stream:', document.querySelector('#localVideo').srcObject);
    document.getElementById("callButton").style.display="block";
    document.getElementById("vidDisableButton").style.display="block";
    document.getElementById("micDisableButton").style.display="block";
}

function registerPeerConnectionListeners(peerConnection) {
    peerConnection.addEventListener('icegatheringstatechange', () => {
        console.log(
            `ICE gathering state changed with Calgo: ${peerConnection.iceGatheringState}`);
    });

    peerConnection.addEventListener('connectionstatechange', () => {
        console.log(`Connection state change with Calgo: ${peerConnection.connectionState}`);
    });

    peerConnection.addEventListener('signalingstatechange', () => {
        console.log(`Signaling state change with Calgo: ${peerConnection.signalingState}`);
    });

    peerConnection.addEventListener('iceconnectionstatechange ', () => {
        console.log(
            `ICE connection state change with Calgo: ${peerConnection.iceConnectionState}`);
    });
}

init();
var w = window.innerWidth;
var h = window.innerHeight;
document.getElementById("remoteVideo").height=h;
document.getElementById("remoteVideo").width=w;

//media control during a call
function videoDisabledByUser(){
    if(localStream==null){
        console.log("no video is streamed!");
    }
    else{
        document.getElementById("vidEnableButton").style.display="block";
        document.getElementById("vidDisableButton").style.display="none";
        localStream.getVideoTracks()[0].enabled = false;
    }
}

function videoEnabledByUser(){
    if(localStream==null){
        console.log("no video is streamed!");
    }
    else{
        document.getElementById("vidDisableButton").style.display="block";
        document.getElementById("vidEnableButton").style.display="none";
        localStream.getVideoTracks()[0].enabled = true;
    }
}

function audioEnabledByUser(){
    if(localStream==null){
        console.log("no audio is streamed!");
    }
    else{
        document.getElementById("micDisableButton").style.display="block";
        document.getElementById("micEnableButton").style.display="none";
        localStream.getAudioTracks()[0].enabled = true;
    }
}

function audioDisabledByUser(){
    if(localStream==null){
        console.log("no audio is streamed!");
    }
    else{
        document.getElementById("micDisableButton").style.display="none";
        document.getElementById("micEnableButton").style.display="block";
        localStream.getAudioTracks()[0].enabled = false;
    }
}

async function hangCall() {
    const stream = document.getElementById('localVideo').srcObject;
    const tracks = stream.getTracks();

    tracks.forEach(function(track) {
        track.stop();
    });

    document.getElementById('localVideo').style.display = "none";

    //deleting the sturcture from call
    const db = firebase.firestore();
    db.collection("meetings").doc(meetingId).delete().then(function() {
        document.getElementById("messageBeforeConnecting").style.display="block";
        document.getElementById("uniqueHrefToMeet").style.display="none";
        document.getElementById("messageBeforeConnecting").innerHTML="<h4>Call disconnected</h4>";
        location.replace("https://calgo1.herokuapp.com");
    }).catch(function(error) {
        console.error("Error removing document: ", error);
    });
}

//code for sharing screensharing below

async function screenShare() {

    if(meetingId) {

        document.getElementById("ResumeVidCallButton").style.display="block";
        document.getElementById("screenSharingButton").style.display="none";
        document.getElementById('localScreen').style.display = "block";
        document.getElementById("localVideo").style.display="none";
        localStream.getVideoTracks()[0].enabled = false;
        var displayMediaOptions = {
            video: {
                cursor: "motion"
            },
            audio: true
        };
        const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
        document.getElementById('localScreen').srcObject = stream;
        localStreamScreen = stream;

        //make the connection
        const db = firebase.firestore();
        const meetingRef = db.collection('meetings').doc(meetingId);
        const ssRef = meetingRef.collection('SchreenSharing').doc("connection");

        console.log('Calgo peer configuration: ', configuration);
        const screenPeerConnection = new RTCPeerConnection(configuration);

        registerPeerConnectionListeners(screenPeerConnection);

        localStreamScreen.getTracks().forEach(track => {
            screenPeerConnection.addTrack(track, localStreamScreen);
        });

        // Code for collecting ICE candidates below
        const callerCandidatesCollection = ssRef.collection('callerCandidates');

        screenPeerConnection.addEventListener('icecandidate', event => {
            if (!event.candidate) {
                console.log('Got final candidate!');
                return;
            }
            console.log('Got candidate: ', event.candidate);
            callerCandidatesCollection.add(event.candidate.toJSON());
        });
        // Code for collecting ICE candidates above

        // Code for creating a room below
        const offer = await screenPeerConnection.createOffer();
        await screenPeerConnection.setLocalDescription(offer);
        console.log('Created offer:', offer);

        const roomWithOffer = {
            'offer': {
                type: offer.type,
                sdp: offer.sdp,
            },
        };
        await ssRef.set(roomWithOffer);
        meetingId = meetingRef.id;
        console.log(`Calgo shared screen with SDP offer. Meeting ID: ${meetingRef.id}`);

        screenPeerConnection.addEventListener('track', event => {
            console.log('Calgo Got remote track:', event.streams[0]);
            event.streams[0].getTracks().forEach(track => {
                console.log('Calgo added remoteStream track:', track);
                localStreamScreen.addTrack(track);
            });
        });

        // Listening for remote session description below
        ssRef.onSnapshot(async snapshot => {
            const data = snapshot.data();
            if (!screenPeerConnection.currentRemoteDescription && data && data.answer) {
                console.log('Got remote description: ', data.answer);
                const rtcSessionDescription = new RTCSessionDescription(data.answer);
                await screenPeerConnection.setRemoteDescription(rtcSessionDescription);
                document.getElementById("messageBeforeConnecting").style.display="none";
                document.getElementById("shareLinkLabel").style.display="none";
                document.getElementById("remoteVideo").style.display="block";
            }
        });
        // Listening for remote session description above

        // Listen for remote ICE candidates below
        ssRef.collection('calleeCandidates').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(async change => {
                if (change.type === 'added') {
                    let data = change.doc.data();
                    console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
                    await screenPeerConnection.addIceCandidate(new RTCIceCandidate(data));
                }
            });
        });
        // Listen for remote ICE candidates above

        //code for making connection above

        var setWithMerge = meetingRef.collection('SchreenSharing').doc("status").set({
            ssEnabled: true
        }, {merge: true});
    }
    else{
        alert("Let others join first!");
    }
}
//code for sharing screen to remote peer above


//resume video call
function videoCallResume(){
    localStream.getVideoTracks()[0].enabled = true;
    const stream = document.getElementById('localScreen').srcObject;
    const tracks = stream.getTracks();

    tracks.forEach(function(track) {
        track.stop();
    });

    const db = firebase.firestore();
    const meetingRef = db.collection('meetings').doc(meetingId);
    var setWithMerge = meetingRef.collection('SchreenSharing').doc("status").set({
        ssEnabled: false
    }, {merge: true});

    document.getElementById('localScreen').style.display = "none";
    document.getElementById('localVideo').style.display = "block";
    document.getElementById("ResumeVidCallButton").style.display="none";
    document.getElementById("screenSharingButton").style.display="block";
}
//code for resuming video call above

//code for getting remote screen sharing below

async function checkForScreenSharing(meetingId){
    const db = firebase.firestore();
    const meet = db.collection("meetings").doc(meetingId);
    meet.collection("SchreenSharing").doc("statusRemote").onSnapshot(function(doc) {
        if(doc.data().ssEnabled==true) {
            console.log("Current state of screen sharing: ", doc.data().ssEnabled);
            connectPeerScreen(meetingId);
        }
        if(doc.data().ssEnabled==false) {
            console.log("Current state of screen sharing: ", doc.data().ssEnabled);
            connectPeerVideo(meetingId);
        }
    });
}

async function connectPeerScreen(meetingId){
    document.getElementById("remoteScreen").style.display = "block";
    document.getElementById("remoteVideo").style.display = "none";
    const db = firebase.firestore();
    const roomRef = db.collection('meetings').doc(meetingId);
    const ssRef = roomRef.collection('SchreenSharing').doc("connectionRemote");
    const roomSnapshot = await ssRef.get();

    const remoteStreamScreen = new MediaStream();

    document.getElementById("remoteScreen").srcObject = remoteStreamScreen;
    console.log('Got screen:', roomSnapshot.exists);

    if (roomSnapshot.exists) {
        console.log('Create PeerConnection with configuration: ', configuration);
        const peerConnectionScreen = new RTCPeerConnection(configuration);
        registerPeerConnectionListeners(peerConnectionScreen);

        /**localStream.getTracks().forEach(track => {
            peerConnectionScreen.addTrack(track, localStream);
        });**/

            // Code for collecting ICE candidates below
        const calleeCandidatesCollection = ssRef.collection('calleeCandidates');
        peerConnectionScreen.addEventListener('icecandidate', event => {
            if (!event.candidate) {
                console.log('Got final candidate!');
                return;
            }
            console.log('Got candidate: ', event.candidate);
            calleeCandidatesCollection.add(event.candidate.toJSON());
        });
        // Code for collecting ICE candidates above

        peerConnectionScreen.addEventListener('track', event => {
            console.log('Got remote track:', event.streams[0]);
            event.streams[0].getTracks().forEach(track => {
                console.log('Add a track to the remoteStreamScreen:', track);
                remoteStreamScreen.addTrack(track);
            });
        });

        // Code for creating SDP answer below
        const offer = roomSnapshot.data().offer;
        console.log('Got offer:', offer);
        await peerConnectionScreen.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnectionScreen.createAnswer();
        console.log('Created answer:', answer);
        await peerConnectionScreen.setLocalDescription(answer);

        const roomWithAnswer = {
            answer: {
                type: answer.type,
                sdp: answer.sdp,
            },
        };
        await ssRef.update(roomWithAnswer);
        // Code for creating SDP answer above

        // Listening for remote ICE candidates below
        ssRef.collection('callerCandidates').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(async change => {
                if (change.type === 'added') {
                    let data = change.doc.data();
                    console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
                    await peerConnectionScreen.addIceCandidate(new RTCIceCandidate(data));
                }
            });
        });
        // Listening for remote ICE candidates above
    }
}

async function connectPeerVideo() {
    const stream = document.getElementById('remoteScreen').srcObject;
    const tracks = stream.getTracks();

    tracks.forEach(function(track) {
        track.stop();
    });

    document.getElementById('remoteScreen').style.display="none";
    document.getElementById('remoteVideo').style.display="block";
}

//code for getting remote screen above

var w = window.innerWidth;
var h = window.innerHeight;
document.getElementById("remoteScreen").height=h;
document.getElementById("remoteScreen").width=w;