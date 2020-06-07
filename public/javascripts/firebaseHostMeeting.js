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
var meetingMetaId=null;
let localStream = null;
let remoteStream2 = null;
let meetingId = null;

function init() {
    openUserMedia()
}

async function createRoom() {
    //getting hidden features on
    document.getElementById("screenSharingButton").style.display="none";
    document.getElementById("hangupButton").style.display="block";
    document.getElementById("messageBeforeConnecting").innerHTML="<h4>Share the link generated below</h4><br><h5>and wait for others to join...</h5>";

    //media handling buttons
    document.getElementById("callButton").style.display="none";
    document.getElementById("vidDisableButton").style.display="block";
    document.getElementById("micDisableButton").style.display="block";

    const db = firebase.firestore();
    const meetingRef = await db.collection('meetings').doc();

    var setWithMerge = meetingRef.set({
        count : 1
    }, { merge: true });


    meetingId = meetingRef.id;
    meetingMetaId = meetingId;
    connectNewPeer(meetingMetaId);
    console.log(`Calgo created meeting with SDP offer. Meeting ID: ${meetingRef.id}`);
    //document.querySelector('#meetingIdForChatRoom').innerText = `Meeting ID - ${meetingRef.id}`;

    var meetingLink = "https://calgo1.herokuapp.com/join-a-meeting?meetingId="+meetingId;
    var hrefLinkText = document.createTextNode(meetingLink);
    var anchorTag = document.createElement("a");
    anchorTag.appendChild(hrefLinkText);
    anchorTag.id="linkToJoinCall";

    anchorTag. href = meetingLink;
    document.getElementById("uniqueHrefToMeet").appendChild(anchorTag);
    // Code for creating a room above


}

async function openUserMedia(e) {

    const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: {'echoCancellation': true}});
    document.querySelector('#localVideo').srcObject = stream;
    localStream = stream;
    document.getElementById("callButton").style.display="block";
    document.getElementById("screenSharingButton").style.display="block";
    console.log('Stream:', document.querySelector('#localVideo').srcObject);
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


//document.getElementById("monu").height=h;
//document.getElementById("golu").height=h;

//connecting peer2
async function connectNewPeer(meetingMetaId){
    const db = firebase.firestore();
    var meetRef = db.collection('meetings').doc(meetingMetaId);
    var offerRef = meetRef.collection("OfferByName");
    var answerRef = meetRef.collection("answerByName");
    var IceCandidateRef = meetRef;

    meetRef.collection("peersByName").doc("names")
        .onSnapshot(function(doc) {
            if(doc.data()) {
                var peerName=doc.data().peerName;
                var RTCPeerObjName = peerName+"PeerConnection";
                console.log("New peer added with name : ", peerName);
                //add new peer meta func
                addNewPeer(RTCPeerObjName,offerRef,answerRef,IceCandidateRef,peerName);
            }
        });
}

async function addNewPeer(RTCPeerObjName,offerRef,answerRef,IceCandidateRef,peerName){


    var newVideoTag = document.createElement("video");
    newVideoTag.classList.add("w3-round-large");
    newVideoTag.classList.add("w3-blue-grey");
     newVideoTag.autoplay = true;
    newVideoTag.id=peerName;
    newVideoTag.style.width="300px";
    newVideoTag.style.height="100%";


    var peerNameToDisplayText = document.createTextNode(peerName);
    var peerNameToDisplay = document.createElement("h6");
    peerNameToDisplay.appendChild(peerNameToDisplayText);
    peerNameToDisplay.classList.add("w3-text-black");
    peerNameToDisplay.classList.add("w3-white");
    peerNameToDisplay.classList.add("w3-center");
    peerNameToDisplay.style.width="300px";
    peerNameToDisplay.classList.add("w3-round-large");

    var newVideoCell = document.createElement("div");
    newVideoCell.classList.add("p-0");
    newVideoCell.style.width="300px";

    newVideoCell.appendChild(peerNameToDisplay);
    newVideoCell.appendChild(newVideoTag);

    document.getElementById("addAllVideoDiv").appendChild(newVideoCell);
    //creating a video section for new peer adding above

    document.getElementById("messageBeforeConnecting").style.display="none";
    document.getElementById("linkToJoinCall").style.display="none";
    document.getElementById("layerTwoForFortyHeight").style.display="block";

    console.log('Calgo peer configuration: ', configuration);
    peerConnectionNew = new RTCPeerConnection(configuration);

    registerPeerConnectionListeners(peerConnectionNew);

    localStream.getTracks().forEach(track => {
        peerConnectionNew.addTrack(track, localStream);
    });

    remoteStream2 = new MediaStream();
    document.getElementById(peerName).srcObject = remoteStream2;

    // Code for collecting ICE candidates below
    const callerCandidatesCollection = IceCandidateRef.collection('HostTo'+peerName);

    peerConnectionNew.addEventListener('icecandidate', event => {
        if (!event.candidate) {
            console.log('Got final candidate!');
            return;
        }
        console.log('Got candidate of Host: ', event.candidate);
        callerCandidatesCollection.add(event.candidate.toJSON());
    });
    // Code for collecting ICE candidates above

    //code for setting remote track
    peerConnectionNew.addEventListener('track', event => {
        console.log('Got remote track from New Peer:', event.streams[0]);
        event.streams[0].getTracks().forEach(track => {
            console.log('Add a track to the remoteStream:', track);
            remoteStream2.addTrack(track);
        });
    });

    // Code for creating an offer and setting local discription below
    const offer = await peerConnectionNew.createOffer();
    await peerConnectionNew.setLocalDescription(offer);
    console.log('Created offer:', offer);

    const roomWithOffer = {
        'offer': {
            type: offer.type,
            sdp: offer.sdp,
        },
    };
    await offerRef.doc('HostTo'+peerName).set(roomWithOffer,{ merge: true });
    // Code for creating an offer and setting local discription above



    // Listening for remote session description below
    answerRef.doc(peerName+'ToHost').onSnapshot(async snapshot => {
        const data = snapshot.data();
        if (!peerConnectionNew.currentRemoteDescription && data && data.answer) {
            console.log('Got remote description from New Peer: ', data.answer);
            const rtcSessionDescription = new RTCSessionDescription(data.answer);
            await peerConnectionNew.setRemoteDescription(rtcSessionDescription);
        }
    });
    // Listening for remote session description above

    // Listen for remote ICE candidates below
    IceCandidateRef.collection(peerName+'ToHost').onSnapshot(snapshot => {
        snapshot.docChanges().forEach(async change => {
            if (change.type === 'added') {
                let data = change.doc.data();
                console.log(`Got new remote ICE candidate from New peer: ${JSON.stringify(data)}`);
                await peerConnectionNew.addIceCandidate(new RTCIceCandidate(data));
            }
        });
    });
    // Listen for remote ICE candidates above
}

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

///screen capturing functions
async function allowScreenCapturing(){
       document.getElementById("screenSharingButton").style.display="none";
       document.getElementById("callButton").style.display="none";
        var displayMediaOptions = {
            video: {
                cursor: "motion"
            },
            audio: true
        };
        const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
        document.getElementById('localVideo').srcObject = stream;
        localStream = stream;
        await createRoom();
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

/**async function hangCallForAll() {
    const db = firebase.firestore();
    db.collection("meetings").doc(meetingId).set({
        IsDisconnected: true
    })
        .then(function() {
            hangCall();
        })
        .catch(function(error) {
            console.error("Error writing document: ", error);
        });
}**/

