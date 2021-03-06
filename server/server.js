// Load required modules
var http    = require("http");              // http server core module
var express = require("express");           // web framework external module
var serveStatic = require('serve-static');  // serve static files
var socketIo = require("socket.io");        // web socket external module
var easyrtc = require("../lib/easyrtc_server");               // EasyRTC external module
var CONFIG = require('./config.json');
var fs = require('fs');

//  variables
var port = CONFIG.port;
var dir = './static/html/';



// Set process name
process.title = "node-easyrtc";

// Setup and configure Express http server. Expect a subfolder called "static" to be the web root.
var app = express();
app.use(serveStatic('static', {'index': ['html/index.html']}));

// Start Express http server
var webServer = http.createServer(app).listen(port);

// Sends the names of the files that are on the server
app.get('/get_pages', function(req, res, next) {
    fs.readdir(dir, function (err, files) {
        console.log(files);
        res.json({message: files});
    });;
});

// Start Socket.io so it attaches itself to Express server
var socketServer = socketIo.listen(webServer);

// easyrtc.setOption("logLevel", "debug");

// Overriding the default easyrtcAuth listener, only so we can directly access its callback
easyrtc.events.on("easyrtcAuth", function(socket, easyrtcid, msg, socketCallback, callback) {
    easyrtc.events.defaultListeners.easyrtcAuth(socket, easyrtcid, msg, socketCallback, function(err, connectionObj){
        if (err || !msg.msgData || !msg.msgData.credential || !connectionObj) {
            callback(err, connectionObj);
            return;
        }

        connectionObj.setField("credential", msg.msgData.credential, {"isShared":false});

        console.log("["+easyrtcid+"] Credential saved!", connectionObj.getFieldValueSync("credential"));

        callback(err, connectionObj);
    });
});

// To test, lets print the credential to the console for every room join!
easyrtc.events.on("roomJoin", function(connectionObj, roomName, roomParameter, callback) {
    console.log("["+connectionObj.getEasyrtcid()+"] Credential retrieved!", connectionObj.getFieldValueSync("credential"));
    easyrtc.events.defaultListeners.roomJoin(connectionObj, roomName, roomParameter, callback);
});

// Start EasyRTC server
var rtc = easyrtc.listen(app, socketServer, null, function(err, rtcRef) {
    console.log("Initiated");

    rtcRef.events.on("roomCreate", function(appObj, creatorConnectionObj, roomName, roomOptions, callback) {
        console.log("roomCreate fired! Trying to create: " + roomName);

        appObj.events.defaultListeners.roomCreate(appObj, creatorConnectionObj, roomName, roomOptions, callback);
    });
});

socketServer.on('connection', function(socket){
  console.log('connection');
  socket.on('move', function(msg){
    socketServer.emit('move', msg);
  });
});


webServer.listen(port, function () {
    console.log('listening on http://localhost:' + port);
});
