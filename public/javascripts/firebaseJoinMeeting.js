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

//constants
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let remoteStream2 = null;
let remoteStream3 = null;

function init() {
    openUserMedia();
}

function joinRoom(meetingId) {
    document.getElementById("joinCallButton").style.display="none";
    //media handling buttons
    document.getElementById("vidDisableButton").style.display="block";
    document.getElementById("micDisableButton").style.display="block";
    document.getElementById("messageBeforeConnecting").style.display="none";
    document.getElementById("showPeerIsLive").style.display="block";
    console.log('Joined Calgo Meeting: ', meetingId);
    joinMeetingById(meetingId);
}

async function joinMeetingById(roomId) {
    const db = firebase.firestore();
    const roomRef = db.collection('meetings').doc(`${roomId}`);

    const roomSnapshot = await roomRef.get();
    console.log('Got room:', roomSnapshot.exists);

    if (roomSnapshot.exists) {

        //multi peer codes
        if(document.getElementById("peerCountHidden").textContent=="1"){

            //connecting peer2 to peer1
            document.getElementById("remoteVideo").style.display="block";
            document.getElementById("hostNameLabel").style.display="block";

            var peerName = prompt("Please enter your Meeting name - ", 1234);

            roomRef.collection("peersByName").doc("names").set({
                peerName: peerName
            })
                .then(async function() {
                    var peerNameList = roomRef.collection('nameList').doc(peerName);
                    var setWithMergepeerNameList = peerNameList.set({
                        name : peerName
                    }, { merge: true });
                    console.log(peerName+" Added to Calgo Meeting");
                    await connectNewPeer(roomId,peerName);
                    /***var RTCPeerConnectionObj = peerName+"RTCPeerConnection";
                    var answerRef = roomRef.collection("answerByName").doc(peerName+'ToHost');
                    roomRef.collection("OfferByName").doc('HostTo'+peerName)
                        .onSnapshot(function(doc) {
                            if(doc.data()) {
                                var offerData=doc.data().offer;
                                peerToHostConnect(RTCPeerConnectionObj,offerData,answerRef,roomRef,peerName);
                            }
                        });***/

                })
                .catch(function(error) {
                    console.error("Error writing document: ", error);
                });
        }
    }
}

async function openUserMedia(e) {
    const stream = await navigator.mediaDevices.getUserMedia(
        {video: true,
                    audio: {'echoCancellation': true}});
    document.querySelector('#localVideo').srcObject = stream;
    localStream = stream;

    document.getElementById("joinCallButton").style.display="block";
    document.getElementById("hangupButton").style.display="block";
    //peer1 added media track
    remoteStream = new MediaStream();
    document.querySelector('#remoteVideo').srcObject = remoteStream;

    console.log('Stream:', document.querySelector('#localVideo').srcObject);
}


function registerPeerConnectionListeners(peerConnection) {
    peerConnection.addEventListener('icegatheringstatechange', () => {
        console.log(
            `ICE gathering state changed: ${peerConnection.iceGatheringState}`);
    });

    peerConnection.addEventListener('connectionstatechange', () => {
        console.log(`Connection state change: ${peerConnection.connectionState}`);
    });

    peerConnection.addEventListener('signalingstatechange', () => {
        console.log(`Signaling state change: ${peerConnection.signalingState}`);
    });

    peerConnection.addEventListener('iceconnectionstatechange ', () => {
        console.log(
            `ICE connection state change: ${peerConnection.iceConnectionState}`);
    });
}


async function peerToHostConnect(RTCPeerConnectionObj,offerData,answerRef,roomRef,peerName){
    RTCPeerConnectionObj = new RTCPeerConnection(configuration);
    registerPeerConnectionListeners(RTCPeerConnectionObj);

    //creating local video stream
    localStream.getTracks().forEach(track => {
        RTCPeerConnectionObj.addTrack(track, localStream);
    });


    // Code for collecting ICE candidates below
    const calleeCandidatesCollection = roomRef.collection(peerName+'ToHost');
    RTCPeerConnectionObj.addEventListener('icecandidate', event => {
        if (!event.candidate) {
            console.log('Got final candidate!');
            return;
        }
        console.log('Got candidate : ', event.candidate);
        calleeCandidatesCollection.add(event.candidate.toJSON());
    });
    // Code for collecting ICE candidates above

    //code for setting remote track
    RTCPeerConnectionObj.addEventListener('track', event => {
        console.log('Got remote track from host:', event.streams[0]);
        event.streams[0].getTracks().forEach(track => {
            console.log('Add a track to the remoteStream:', track);
            remoteStream.addTrack(track);
        });
    });

    // Code for creating SDP answer below

    console.log('Got offer from host:', offerData);
    await RTCPeerConnectionObj.setRemoteDescription(new RTCSessionDescription(offerData));
    const answer = await RTCPeerConnectionObj.createAnswer();
    console.log('Created answer:', answer);
    await RTCPeerConnectionObj.setLocalDescription(answer);

    const roomWithAnswer = {
        answer: {
            type: answer.type,
            sdp: answer.sdp,
        },
    };
    await answerRef.set(roomWithAnswer, { merge: true });
    // Code for creating SDP answer above

    // Listening for remote ICE candidates below
    roomRef.collection('HostTo'+peerName).onSnapshot(snapshot => {
        snapshot.docChanges().forEach(async change => {
            if (change.type === 'added') {
                let data = change.doc.data();
                console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
                await RTCPeerConnectionObj.addIceCandidate(new RTCIceCandidate(data));
            }
        });
    });
    // Listening for remote ICE candidates above

}

//connecting other peers///////////////////////////////////////////////////////////////////////////////////////////////////////////
async function connectNewPeer(meetingMetaId,currPeerName){
    const db = firebase.firestore();
    var meetRef = db.collection('meetings').doc(meetingMetaId);
    var offerRef = meetRef.collection("OfferByName");
    var answerRef = meetRef.collection("answerByName");
    var IceCandidateRef = meetRef;

    meetRef.collection("peersByName").doc("names")
        .onSnapshot(function(doc) {
            if(doc.data()) {
                var peerName=doc.data().peerName;
                if(peerName!=currPeerName) {
                    var RTCPeerObjName = peerName + "PeerConnection";
                    console.log("New peer added with name : ", peerName);
                    //add new peer meta func
                    addNewPeer(RTCPeerObjName, offerRef, answerRef, IceCandidateRef, peerName,currPeerName);
                }
                else{
                    console.log("running peerToPeerResponding");
                    peerToPeerResponding(meetingMetaId,IceCandidateRef,peerName,currPeerName);
                }
            }
        });
}

////////////////////responding to the connection of ther peers//////////////////////////////////////////////////////////////
async function peerToPeerResponding(meetingMetaId,IceCandidateRef,peerName,currPeerName){

    var RTCPeerConnectionObj = peerName+"RTCPeerConnection";
    var answerRef = IceCandidateRef.collection("answerByName").doc(peerName+'ToHost');

    IceCandidateRef.collection('nameList').get()
        .then(function(querySnapshot) {
            querySnapshot.forEach(async function(doc) {
                console.log(doc.id, " => ", doc.data());
                var CurrNameUnderWorking = doc.id
                await IceCandidateRef.collection("OfferByName").doc(doc.id+'To'+peerName)
                    .onSnapshot(async function(doc) {
                        if(doc.data()) {
                            console.log("Responding to the offer: offer collected from "+CurrNameUnderWorking);
                            var offerData=doc.data().offer;
                            var answerRef1 = IceCandidateRef.collection("answerByName").doc(peerName+'To'+CurrNameUnderWorking);
                           await peerPreviousPeerConnections(RTCPeerConnectionObj,offerData,answerRef1,IceCandidateRef,peerName,CurrNameUnderWorking);
                        }
                    });
            });
        })
        .catch(function(error) {
            console.log("Error getting documents: ", error);
        });

    IceCandidateRef.collection("OfferByName").doc('HostTo'+peerName)
        .onSnapshot(function(doc) {
            if(doc.data()) {
                console.log("connecting to host: offer collected from peer 1");
                var offerData=doc.data().offer;
                peerToHostConnect(RTCPeerConnectionObj,offerData,answerRef,IceCandidateRef,peerName);
            }
        });
}

async function addNewPeer(RTCPeerObjName,offerRef,answerRef,IceCandidateRef,peerName,currPeerName){

  //  document.getElementById(peerName).style.display="block";
    document.getElementById("messageBeforeConnecting").style.display="none";

    console.log('Calgo peer configuration: ', configuration);
    peerConnectionNew = new RTCPeerConnection(configuration);

    registerPeerConnectionListeners(peerConnectionNew);

    localStream.getTracks().forEach(track => {
        peerConnectionNew.addTrack(track, localStream);
    });

    //creating a video element for display
    var h = window.innerHeight;
    var newVideoTag = document.createElement("video");
    newVideoTag.classList.add("w3-round-large");
    newVideoTag.autoplay = true;
    newVideoTag.id=peerName;
    newVideoTag.style.width="100%";
    newVideoTag.style.maxHeight=h;

    var peerNameToDisplayText = document.createTextNode(peerName);
    var peerNameToDisplay = document.createElement("h4");
    peerNameToDisplay.appendChild(peerNameToDisplayText);
    peerNameToDisplay.classList.add("w3-text-black");
    peerNameToDisplay.classList.add("w3-white");
    peerNameToDisplay.classList.add("w3-round-large");

    var newVideoCell = document.createElement("div");
    newVideoCell.classList.add("w3-cell");

    newVideoCell.appendChild(peerNameToDisplay);
    newVideoCell.appendChild(newVideoTag);

    document.getElementById("addAllVideoDiv").appendChild(newVideoCell);
    //creating a video section for new peer adding above

    //set media of remote peer
    remoteStream2 = new MediaStream();
    document.getElementById(peerName).srcObject = remoteStream2;

    // Code for collecting ICE candidates below
    const callerCandidatesCollection = IceCandidateRef.collection(currPeerName+'To'+peerName);

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
    await offerRef.doc(currPeerName+'To'+peerName).set(roomWithOffer,{ merge: true });
    // Code for creating an offer and setting local discription above



    // Listening for remote session description below
    answerRef.doc(peerName+'To'+currPeerName).onSnapshot(async snapshot => {
        const data = snapshot.data();
        if (!peerConnectionNew.currentRemoteDescription && data && data.answer) {
            console.log('Got remote description from New Peer: ', data.answer);
            const rtcSessionDescription = new RTCSessionDescription(data.answer);
            await peerConnectionNew.setRemoteDescription(rtcSessionDescription);
        }
    });
    // Listening for remote session description above

    // Listen for remote ICE candidates below
    IceCandidateRef.collection(peerName+'To'+currPeerName).onSnapshot(snapshot => {
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


async function peerPreviousPeerConnections(RTCPeerConnectionObj,offerData,answerRef,roomRef,peerName,callerPeer){
   // document.getElementById(callerPeer).style.display="block";
    console.log("connecting to callerPeer : responding offer");
    RTCPeerConnectionObj = new RTCPeerConnection(configuration);
    registerPeerConnectionListeners(RTCPeerConnectionObj);

    //creating local video stream
    localStream.getTracks().forEach(track => {
        console.log("got local track to send to "+callerPeer)
        RTCPeerConnectionObj.addTrack(track, localStream);
    });


    var h = window.innerHeight;
    var newVideoTag = document.createElement("video");
    newVideoTag.classList.add("w3-round-large");
    newVideoTag.autoplay = true;
    newVideoTag.id=callerPeer;
    newVideoTag.style.width="100%";
    newVideoTag.style.maxHeight=h;

    var peerNameToDisplayText = document.createTextNode(callerPeer);
    var peerNameToDisplay = document.createElement("h4");
    peerNameToDisplay.appendChild(peerNameToDisplayText);
    peerNameToDisplay.classList.add("w3-text-black");
    peerNameToDisplay.classList.add("w3-white");
    peerNameToDisplay.classList.add("w3-round-large");

    var newVideoCell = document.createElement("div");
    newVideoCell.classList.add("w3-cell");

    newVideoCell.appendChild(peerNameToDisplay);
    newVideoCell.appendChild(newVideoTag);

    document.getElementById("addAllVideoDiv").appendChild(newVideoCell);
    //creating a video section for new peer adding above

    //peer2 added media track
    remoteStream3 = new MediaStream();
    document.getElementById(callerPeer).srcObject = remoteStream3;

    // Code for collecting ICE candidates below
    const calleeCandidatesCollection = roomRef.collection(peerName+'To'+callerPeer);
    RTCPeerConnectionObj.addEventListener('icecandidate', event => {
        if (!event.candidate) {
            console.log('Got final candidate!');
            return;
        }
        console.log('Got candidate : ', event.candidate);
        calleeCandidatesCollection.add(event.candidate.toJSON());
    });
    // Code for collecting ICE candidates above

    //code for setting remote track
    RTCPeerConnectionObj.addEventListener('track', event => {
        console.log('Got remote track from '+callerPeer+' :', event.streams[0]);
        event.streams[0].getTracks().forEach(track => {
            console.log('Add a track to the remoteStream:', track);
            remoteStream3.addTrack(track);
        });
    });

    // Code for creating SDP answer below

    console.log('Got offer from '+callerPeer+' : ', offerData);
    await RTCPeerConnectionObj.setRemoteDescription(new RTCSessionDescription(offerData));
    const answer = await RTCPeerConnectionObj.createAnswer();
    console.log('Created answer:', answer);
    await RTCPeerConnectionObj.setLocalDescription(answer);

    const roomWithAnswer = {
        answer: {
            type: answer.type,
            sdp: answer.sdp,
        },
    };
    await answerRef.set(roomWithAnswer, { merge: true });
    // Code for creating SDP answer above

    // Listening for remote ICE candidates below
    roomRef.collection(callerPeer+'To'+peerName).onSnapshot(snapshot => {
        snapshot.docChanges().forEach(async change => {
            if (change.type === 'added') {
                let data = change.doc.data();
                console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
                await RTCPeerConnectionObj.addIceCandidate(new RTCIceCandidate(data));
            }
        });
    });
    // Listening for remote ICE candidates above

}


init();

var heightOfVidCon = window.innerHeight;
document.getElementById("addAllVideoDiv").style.height=heightOfVidCon;

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


