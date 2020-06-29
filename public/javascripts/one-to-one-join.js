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
let meetingIDGlobal = null;
let localStreamScreen = null;
let meetingMetaSuperId =document.getElementById('showClientMeetingIDCalleSide').textContent

function init() {
    openUserMedia();
}

function joinRoom(meetingId) {
    document.getElementById("joinCallButton").style.display="none";
    document.getElementById("hangupButton").style.display="block";
    document.getElementById("messageBeforeConnecting").style.display="none";
    document.getElementById("screenSharingButton").style.display="block";
    document.getElementById("remoteVideo").style.display="block";

    meetingIDGlobal = meetingId;
    // meetingId = prompt("Please enter Meeting ID - ", 1234);
    console.log('Joined Calgo Meeting: ', meetingId);
    checkForScreenSharing(meetingId);
    //document.querySelector('#showClientMeetingIDCalleSide').innerText = `ID - ${meetingId}`;
    joinMeetingById(meetingId);
}

async function joinMeetingById(roomId) {
    const db = firebase.firestore();
    const roomRef = db.collection('meetings').doc(`${roomId}`);
    const roomSnapshot = await roomRef.get();
    console.log('Got room:', roomSnapshot.exists);

    if (roomSnapshot.exists) {
        console.log('Create PeerConnection with configuration: ', configuration);
        peerConnection = new RTCPeerConnection(configuration);
        registerPeerConnectionListeners(peerConnection);
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Code for collecting ICE candidates below
        const calleeCandidatesCollection = roomRef.collection('calleeCandidates');
        peerConnection.addEventListener('icecandidate', event => {
            if (!event.candidate) {
                console.log('Got final candidate!');
                return;
            }
            console.log('Got candidate: ', event.candidate);
            calleeCandidatesCollection.add(event.candidate.toJSON());
        });
        // Code for collecting ICE candidates above

        peerConnection.addEventListener('track', event => {
            console.log('Got remote track:', event.streams[0]);
            event.streams[0].getTracks().forEach(track => {
                console.log('Add a track to the remoteStream:', track);
                remoteStream.addTrack(track);
            });
        });

        // Code for creating SDP answer below
        const offer = roomSnapshot.data().offer;
        console.log('Got offer:', offer);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        console.log('Created answer:', answer);
        await peerConnection.setLocalDescription(answer);

        const roomWithAnswer = {
            answer: {
                type: answer.type,
                sdp: answer.sdp,
            },
        };
        await roomRef.update(roomWithAnswer);
        // Code for creating SDP answer above

        // Listening for remote ICE candidates below
        roomRef.collection('callerCandidates').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(async change => {
                if (change.type === 'added') {
                    let data = change.doc.data();
                    console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
                    await peerConnection.addIceCandidate(new RTCIceCandidate(data));
                }
            });
        });
        // Listening for remote ICE candidates above
    }
}

async function openUserMedia(e) {
    const stream = await navigator.mediaDevices.getUserMedia(
        {video: true,
            audio: {'echoCancellation': true}});
    document.querySelector('#localVideo').srcObject = stream;
    localStream = stream;
    remoteStream = new MediaStream();

    document.getElementById("joinCallButton").style.display="block";
    document.getElementById("vidDisableButton").style.display="block";
    document.getElementById("micDisableButton").style.display="block";
    document.getElementById("chatToggleButton").style.display="block";

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
    location.replace("https://calgo1.herokuapp.com");
}


init();

async function checkForScreenSharing(meetingId){
    const db = firebase.firestore();
    const meet = db.collection("meetings").doc(meetingId);
    meet.collection("SchreenSharing").doc("status").onSnapshot(function(doc) {
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
    const ssRef = roomRef.collection('SchreenSharing').doc("connection");
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

async function connectPeerVideo(meetingId) {
    const stream = document.getElementById('remoteScreen').srcObject;
    const tracks = stream.getTracks();

    tracks.forEach(function(track) {
        track.stop();
    });

    document.getElementById('remoteScreen').style.display="none";
    document.getElementById('remoteVideo').style.display="block";
}

async function screenShare() {

    if(meetingIDGlobal) {

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
        const meetingRef = db.collection('meetings').doc(meetingIDGlobal);
        const ssRef = meetingRef.collection('SchreenSharing').doc("connectionRemote");

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

        var setWithMerge = meetingRef.collection('SchreenSharing').doc("statusRemote").set({
            ssEnabled: true
        }, {merge: true});
    }
    else{
        alert("Meeting ID not fetched!");
    }
}

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
    var setWithMerge = meetingRef.collection('SchreenSharing').doc("statusRemote").set({
        ssEnabled: false
    }, {merge: true});

    document.getElementById('localScreen').style.display = "none";
    document.getElementById('localVideo').style.display = "block";
    document.getElementById("ResumeVidCallButton").style.display="none";
    document.getElementById("screenSharingButton").style.display="block";
}
//code for resuming video call above

var w = window.innerWidth;
var h = window.innerHeight;
document.getElementById("remoteVideo").height=h;
document.getElementById("remoteVideo").width=w;
document.getElementById("remoteScreen").height=h;
document.getElementById("remoteScreen").width=w;

//group chat code below/////////////////////////////////////////////////////////////////////////////////


//Load chats
firebase.database().ref('chats/'+meetingMetaSuperId).on('value', function(snapshot) {
    document.getElementById("loadChatMetaDiv").innerHTML = "";
    snapshot.forEach(function(childSnapshot) {
        var childKey = childSnapshot.key;
        var childData = childSnapshot.val();

        var chatDiv  =  document.createElement("h6");
        var senderImg  =  document.createElement("img");
        senderImg.src = childData.userProfilePic;
        senderImg.width="35";
        senderImg.height="35";
        senderImg.classList.add("w3-round-xxlarge");
        senderImg.classList.add("w3-margin-right");

        var chatText = document.createTextNode(childData.chat);
        chatDiv.classList.add("w3-padding");
        chatDiv.classList.add("w3-round-large");
        if(childData.uid==document.getElementById("uidHidden").textContent){
            //chatText.classList.add("w3-pale-green");
            chatDiv.classList.add("w3-right-align");
        }
        else{
            chatDiv.appendChild(senderImg);
        }
        chatDiv.appendChild(chatText);

        document.getElementById("loadChatMetaDiv").appendChild(chatDiv);
        document.getElementById('loadChatMetaDiv').scrollTop = 9999999;
        document.getElementById('chatImg').src="images/chatRecieved.png";
    });
});
//  }




//signin using google
function signinUsingGoogleBtn(){

    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithRedirect(provider);
    firebase.auth().getRedirectResult().then(function(result) {
        if (result.credential) {
            var token = result.credential.accessToken;

        }
        var user = result.user;
//  document.getElementById("test").innerHTML=user;
    }).catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;

        var errorMessage = error.message;
        // The email of the user's account used.
        var email = error.email;
        // The firebase.auth.AuthCredential type that was used.
        var credential = error.credential;
        // ...
    });
}

function saveChatToDb(chatText){
    var chat = document.getElementById("chatTextTxtBox").value;
    var userUid = document.getElementById("uidHidden").textContent;
    var userPhotoURL = document.getElementById("photoUrlHidden").textContent;
    var updates = {
        uid: userUid,
        chat: chat,
        userProfilePic: userPhotoURL
    };
    var keyTimeStamp = Date.now();
    firebase.database().ref('chats/'+meetingMetaSuperId+'/'+keyTimeStamp).update(updates).then(function(){
        document.getElementById("chatTextTxtBox").value="";
    });

}

firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        if (user != null) {
            uid = user.uid;
            document.getElementById("uidHidden").innerHTML=uid;
            document.getElementById("photoUrlHidden").innerHTML=user.photoURL;
            document.getElementById("chatbox").style.display="block";
            document.getElementById("signupBtn").style.display="none";
            document.getElementById("ifNotSignedinForClose").style.display="none";
            document.getElementById("signedUpUserName").innerHTML = user.displayName+" 's Chats ";
//                document.getElementById("userImg").src = user.photoURL;
        }
    } else {
        document.getElementById("signupBtn").style.display="block";
        document.getElementById("chatbox").style.display="none";
        document.getElementById("ifNotSignedinForClose").style.display="block";
        //document.getElementById("name").innerHTML="Hi User<hr>";
    }
});

function signout(){
    firebase.auth().signOut().then(function() {
        // Sign-out successful.
    }).catch(function(error) {
        // An error happened.
    });
}

function closeChatModelWindow(){
    document.getElementById('modelChat').style.display='none';
    document.getElementById('chatImg').src="images/chat.png";
}

//enter button sends chat
// Execute a function when the user releases a key on the keyboard
function doit_onkeypress(event){
    if (event.keyCode == 13 || event.which == 13){
        saveChatToDb();
    }
}

//group chat code above