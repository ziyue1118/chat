var port = 5004;
var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var redis = require("redis").createClient();
var crypto = require('crypto');
var tokenGenerator = require('./token_generator.js');

console.log("listening on port " + port);
server.listen(port);

app.configure(function() {
    app.use(require('express').logger());
    app.use(require('express').bodyParser());
    app.use(require('express').methodOverride());
    app.use(app.router);
    app.use(require('express').static(__dirname + '/bootstrap'));
    app.use(require('express').static(__dirname + '/angular'));
});
app.get('/', function(req,res){
    res.sendfile(__dirname + '/achat.html');

});

var usernames = {};
var onlineClients={};
var rooms = {};
var histarr = [];
var chatSocket = io.of('/chat');
var whiteSocket = io.of('/whiteboard');

chatSocket.authorization(function (handshakeData, callback) {
            console.log("This is for chatSocket");
            //console.log(handshakeData);
            console.log("username: "+ handshakeData.query.username);
            console.log("token: " + handshakeData.query.token);
            var username = handshakeData.query.username;
            var token = handshakeData.query.token;
        if (username === undefined) callback("Not a moonlyt user error");
        if (username){
            if (tokenGenerator(username) === token){
                callback(null, true);
            }
            else {
                callback("you are not allowed", false);
            }
        }
});

chatSocket.on('connection', function (socket){

    socket.on('joinroom', function(username, room){
        socket.username = username;

        if (room) {
            socket.room = room;
            socket.join(room);

            console.log("**********************************")
            console.log(username + " joined room " + room);
            if (rooms[room] === undefined){
                rooms[room] = [socket.username];
            }
            else {
                rooms[room].push(socket.username);
            
            }
            chatSocket.in(socket.room).emit('updateusers', rooms[room]);
            onlineClients[username] = socket.id;
            socket.broadcast.to(socket.room).emit('updatechat', username, 'has joined the lesson')
        }
    });

    socket.on('isTyping', function(bool, partner){
        socket.broadcast.to(socket.room).emit('isTyping', bool, partner);
    });

    socket.on('sendchat',function(data, time){
        if (socket.room){
            console.log(data);

            setTimeout(function(){
                //console.log(socket);
                socket.broadcast.to(socket.room).emit('updatechat',socket.username,data);
                jsonobj = { author: socket.username, time: recordtime(), msg: data };
                redis.hmset(socket.username+"#"+socket.room+"#"+currentTime(), jsonobj);
                socket.emit('ackchat', time);
            }, 1500)
        }

    });

    socket.on('history',function(nm, tm, ctrm){
        console.log(nm);
        console.log(tm);
        console.log("ctrm"+ ctrm);
        var histobj = new Object();
        var nid = onlineClients[nm];
        var tid = onlineClients[tm];
        var result = new Array();
        redis.keys("*#"+ctrm+"#*", function(err,keys){
            if(err) return console.log(err);
            for (var i = 0; i<keys.length; i++){
                console.log(keys[i]);

                //var histarr = new Array();
                redis.hgetall(keys[i],function(err, obj){
                    histobj.author = obj.author;
                    histobj.time = obj.time;
                    histobj.message = obj.msg;
                    histobj[i]=obj;
                    result.push(obj);
                    result.sort(date_sort_asc);
                    console.log(result);
                    if (result.length > 10){
                        chatSocket.socket(nid).emit('updatehistorychat', result.slice(result.length-10,result.length));
                    }
                    else{
                        chatSocket.socket(nid).emit('updatehistorychat', result);                        
                    }    
                });

            }
        
        }); 
    });

    socket.on('disconnect',function(){

        console.log("**************");
        console.log(rooms[socket.room]);
        if (rooms[socket.room]){
            var index = rooms[socket.room].indexOf(socket.username);
            rooms[socket.room].splice(index,1);
            chatSocket.in(socket.room).emit('updateusers', rooms[socket.room]);
            console.log("disconnect*******");
            socket.leave(socket.room);
        }
    });
});

function currentTime() {
    var objToday = new Date(),
    curYear = objToday.getFullYear(),
    curMonth = objToday.getMonth()+1,
    curDate = objToday.getDate(),
    curHour = objToday.getHours(),
    curMinute = objToday.getMinutes() < 10 ? "0" + objToday.getMinutes() : objToday.getMinutes(),
    curSeconds = objToday.getSeconds() < 10 ? "0" + objToday.getSeconds() : objToday.getSeconds();
    var now =    curMonth + "/" + curDate + "/" + curYear+ "_"+ curHour + ":" + curMinute + ":" + curSeconds;

    return now;
}


function recordtime(){
    var time = new Date();
    return time; 
}

var date_sort_asc = function (a, b) {

    if (a.time > b.time) return 1;
    if (a.time < b.time) return -1;
    return 0; 
};







