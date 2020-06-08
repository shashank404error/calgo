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
let meetingId = null;

function init() {
    openUserMedia()
}

async function createRoom() {
    //getting hidden features on
    document.getElementById("callButton").style.display="none";
    document.getElementById("hangupButton").style.display="block";
    document.getElementById("messageBeforeConnecting").innerHTML="<h4>Share the link generated below</h4><br><h5>and wait for others to join...</h5>";
    document.getElementById("shareLinkLabel").style.display="block";

    const db = firebase.firestore();
    const meetingRef = await db.collection('meetings').doc();

    console.log('Calgo peer configuration: ', configuration);
    peerConnection = new RTCPeerConnection(configuration);

    registerPeerConnectionListeners();

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
    meetingId = meetingRef.id;
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

function registerPeerConnectionListeners() {
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