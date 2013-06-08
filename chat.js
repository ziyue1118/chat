var port = 5000;
var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var redis = require("redis").createClient();
//var jsonify = require('redis-jsonify');
//var client = jsonify(redis.createClient());


console.log("listening on port "+port);
server.listen(port);

app.get('/', function(req,res){
	res.sendfile(__dirname + '/chat.html');

});

var usernames = {};
var onlineClients={};
var rooms = {};

io.sockets.on('connection', function (socket){
	socket.on('sendchat',function(data){
        if (socket.room !== '' ){
            io.sockets.in(socket.room).emit('updateprivatechat',socket.username,data);
            jsonobj = { chatroom: socket.room, time: currentTime(), msg: data };
            redis.hmset(socket.username+"_"+currentTime(), jsonobj);
            redis.sadd(socket.username, socket.username+"_"+currentTime()); 
        }
        else {
            io.sockets.emit('updatechat',socket.username,data);
            
            jsonobj = { chatroom : '', time : currentTime(), msg : data };
            redis.hmset(socket.username+"_"+currentTime(), jsonobj);
            redis.sadd(socket.username, socket.username+"_"+currentTime());
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
        io.sockets.socket(id).emit('confirmation', message, chatroom);
    });
     
     socket.on('pm2',function(to,message){
         var id = onlineClients[to];
         io.sockets.socket(id).emit('updateprivatechat', "Sorry "+ message + " does not want to talk to you");
     });

    socket.on('history',function(nm, ctrm){
        console.log(nm);
        console.log("ctrm"+ ctrm);
        var message;
        var time;
        var chatroom; 
        redis.smembers(nm,function(err,keys){
            
            if(keys != null){
                keys.forEach(function(key){
                    console.log(key);
                    redis.hget(key, "chatroom",function(err,objcm){
                        chatroom = objcm;
                        console.log(chatroom+"##"+ctrm);
                        if (chatroom === ctrm){
                            redis.hget(key, "msg", function(err, objms){
                                message = objms;
                            });   
                            redis.hget(key,"time",function(err,objti){
                                time=objti;

                            });   
                            io.sockets.in(socket.room).emit('updatehistorychat',socket.username, message, time);      
                        }    
                    });

                });

            

            }

        });
        
        //io.sockets.emit('updatechat', socket.username, nm);

        
    });
    socket.on('joinroom', function(newroom){
        socket.room = newroom;
        socket.join(newroom);
    	socket.emit('updateprivatechat','SERVER', socket.username + ' have connected to ' + newroom);
    	socket.broadcast.to(newroom).emit('updateprivatechat','SERVER',socket.username + ' have connected to '+ socket.room);
        
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









