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

function getUserGoogleSignedIn() {
    var provider = new firebase.auth.GoogleAuthProvider();

    firebase.auth().signInWithRedirect(provider);

    firebase.auth().getRedirectResult().then(function (result) {
        if (result.credential) {
            // This gives you a Google Access Token. You can use it to access the Google API.
            var token = result.credential.accessToken;
            // ...
        }
        // The signed-in user info.
        var user = result.user;
        console.log(user);
        console.log("Here");
    }).catch(function (error) {
        // Handle Errors here.
        var errorCode = error.code;
        console.log(errorCode);
        var errorMessage = error.message;
        console.log(errorMessage);
        // The email of the user's account used.
        var email = error.email;
        console.log(email);
        // The firebase.auth.AuthCredential type that was used.
        var credential = error.credential;
        console.log(credential);
        // ...
    });
}

firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        // User is signed in.
        console.log("logged in");
        document.getElementById("hostAMeetingBtn").style.display="block";
        document.getElementById("logoutText").style.display="block";
        document.getElementById("pForNotLoggedIn").style.display="none";
        document.getElementById("pForLoggedIn").style.display="block";
        document.getElementById("pForLoggedIn").innerHTML="<b><img src='"+user.photoURL+"' class='w3-round-xxlarge' style='width:50px; height: 50px;'> Hi, "+user.displayName+"</b><br><br>";
    } else {
        // No user is signed in.
        console.log("Not logged in");
        document.getElementById("initialSignUpGoogle").style.display="block";
    }
});

function signOutFromGoogleLogin(){
    firebase.auth().signOut().then(function() {
        document.getElementById("hostAMeetingBtn").style.display = "none";
        document.getElementById("pForLoggedIn").style.display = "none";
        document.getElementById("pForNotLoggedIn").style.display = "block";
        document.getElementById("initialSignUpGoogle").style.display = "block";
        document.getElementById("logoutText").style.display="none";

    }).catch(function(error) {
        // An error happened.
        console.log(error);
    });
}