var port = 5002;
var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var redis = require("redis").createClient();

console.log("listening on port "+port);
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
io.sockets.on('connection', function (socket){
    socket.on('sendchat',function(data){
        if (socket.room !== '' ){
            io.sockets.in(socket.room).emit('updateprivatechat',socket.username,data);
            jsonobj = { author: socket.username, time: recordtime(), msg: data };
            redis.hmset(socket.username+"#"+socket.room+"#"+currentTime(), jsonobj);

        }
        else {
            io.sockets.emit('updatechat',socket.username, data);
            jsonobj = { author: socket.username, time: recordtime(), msg: data };
            redis.hmset(socket.username+"#"+socket.room+"#"+currentTime(), jsonobj);

        }
    });

    socket.on('adduser',function(username){
       socket.username = username;
       usernames[username] = username;
       socket.room = ''; 
       onlineClients[username]=socket.id;
       socket.emit('updatechat','SERVER','you have connected');
       socket.broadcast.emit('updatechat','SERVER',username+' has connected');
       io.sockets.emit('updateusers', usernames);

   });
    socket.on('pm',function(to,message,chatroom){
        var id = onlineClients[to];
        //console.log("#####" + message);
        io.sockets.socket(id).emit('confirmation', message, chatroom);
    });

    socket.on('pmdeny',function(to,message){
       var id = onlineClients[to];
       io.sockets.socket(id).emit('updateprivatechat', message, ' I cannot talk to you rigth now!');
   });

    socket.on('history',function(nm, tm, ctrm){
        console.log(nm);
        console.log(tm);
        console.log("ctrm"+ ctrm);
        var histobj = new Object();
        var nid = onlineClients[nm];
        var tid = onlineClients[tm];
        var result = [];
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
                io.sockets.socket(nid).emit('updatehistorychat', result.slice(result.length-10,result.length));
            });

        }
        
    }); 
    });
    socket.on('joinroom', function(to,newroom){
        socket.room = newroom;
        socket.join(newroom);
        socket.emit('updateprivatechat','SERVER', 'You are talking to ' + to + ' in '+ newroom);
        socket.broadcast.to(newroom).emit('updateprivatechat','SERVER',socket.username + ' agrees to talk with you in '+ socket.room);

    });
    socket.on('leaveroom',function(){
        socket.broadcast.emit('updatechat','SERVER',socket.username + ' have left from '+socket.room);
        socket.leave(socket.room);
        socket.room = '';
        socket.emit('updatechat','SERVER',socket.username + ' have connected');
    });

    socket.on('disconnect',function(){
        delete usernames[socket.username];
        io.sockets.emit('updateusers',usernames);
        socket.broadcast.emit('updatechat','SERVER',socket.username + ' has disconnected');
        socket.leave(socket.room);
        socket.emit('updatechat','SERVER','you have connected');
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







