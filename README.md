# CalGo - Calling On The Go (rfrf demo round)
This is a node.js application built on express framework. It uses webRTC protocol for the real-time communication. Google cloud firestore is used a a signalling server.

## Getting Started with CalGo
Calgo uses a trickle tehnique to establish communication real fast. It uses webRTC which is a serverless communication between peers so the data is secure by default, also it has built-in encryption so the communiction is end-to-end encrypted. 

* It is a cloud based application so no external plugin required to download.
* It is cross-platform and supports all major browsers (except IE, though if you use that you don't bother about technologies anyway!). 
* Signup to host your own call and share the meeting Id with peers.
* Join a meeting using meeting Id.

## How to run FoodServer locally on your machine

  * Clone the repository to your device (by default it will be saved as calgo).
  * Install nodejs and expressjs through npm
  * Check for other dependencies in the dependencies section below and [package.json](https://github.com/shashank404error/codemonk/blob/master/package.json) for versions.
  * Prefrably you need to create a firebase app and get your app.initialise() credential from there. Goto [firebase](https://firebase.google.com/) then follow the standard steps to get the credentials and paste it [here].
                            
## Dependencies
   * **ejs**  - Templating language to support HTML markup with plain javascript.
   * **express** - A node.js framework for making servers.
   * **jssha** - Implements the complete Secure Hash Standard (SHA) family.
   * **http-errors** - to handle all HTTP errors.
   * **morgan** - An express middleware to log all the request to the application.
   * **socket.io** - It enables realtime, bi-directional communication between web clients and servers.
   * **btoa** - Creates a Base64-encoded ASCII string from a binary string.
    
   
    You can view all the other dependencies in package.json file
    

## Built With
intellij's webstorm

## Author
Subhash Mishra | 
 Mitali Bansal | 
 Shashank Prakash

