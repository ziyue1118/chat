var app = angular.module('chatapp',[]);
app.factory('socket',function($rootScope){
		var URL = window.location.protocol + "//" +window.location.host;
		console.log("Connecting to " +URL);
		var socket = io.connect(URL);
		return {
			on:function (eventName, callback){
				socket.on(eventName, function(){
					var args = arguments;
					$rootScope.$apply(function(){
						callback.apply(socket,args);
					});
				});
			},
			emit:function(){
				console.log(arguments);
				var args = Array.prototype.slice.call(arguments);
				console.log("args" + args);
				if (typeof arguments[args.length-1] === 'function'){
					console.log("THis is really a function");
					var callback = args.pop();
					var appliedCallback = function() {
    						var callbackedArgs = arguments;
    						$rootScope.$apply(function() {
    							callback.apply(socket, callbackedArgs);
    						});
    					}
    					args.push(appliedCallback);
				}
				socket.emit.apply(socket, args);
			}

		};	
});


app.directive("showtalk", function(){
	return {
			restrict: 'E',
			template: '<div ng-repeat= "x in xs" ><b>{{x.username}}: </b>{{x.message}}</div>',
			scope: {
				   xs: '='
			}
     }
});

app.controller('mainCtrl',function($scope, socket){
	var client_name;
	var talk_to_name;
	var private_chatroom;
	
	$scope.conversations = [];
	$scope.privatechats = [];
	$scope.historytalks = [];
	$scope.isprivate = false;
	function isPrivate(){
			return $scope.isprivate;
	}
	function isPublic(){
		  return !isPrivate();
	}

	socket.on('connect', function(){
		console.log("hello world");
		client_name= prompt("What's your name?");
		socket.emit('adduser',client_name);
		$scope.users.push(client_name);
	});
	
	socket.on('updateusers',function(data){
		console.log("updateusers is called");
		$scope.users = [];
		for (var key in data){
			 $scope.users.push(key);
		}
	});
  
	socket.on('updatechat',function(username, data){
		$scope.conversations.push({username:username, message:data});
	});

	socket.on('updateprivatechat',function(username, data){
		$scope.privatechats.push({username:username, message:data});
	});

	socket.on('confirmation',function(data,chatroom){
		talk_to_name = data;
		private_chatroom = talk_to_name+'_'+client_name;
		var cflag = confirm(data + ' wants to talk to you?');
		if (cflag === true){
	
			socket.emit('joinroom',talk_to_name, chatroom);
			if (!isPrivate()){
				  $scope.isprivate = isPublic();
			}
		}
		else {
			socket.emit('pmdeny', data, client_name);
		}	
	});
  
  socket.on('updatehistorychat',function(result){
  	$scope.historytalks = [];
  	for (var piece in result){
  		 $scope.historytalks.push(result[piece]);
  		 // $scope.historytalks.push({author: result[piece].author, msg: 
  		 // 	result[piece].msg, time:result[piece].time});
  	}
  });

	$scope.sendmessage = function(messageName){
		socket.emit('sendchat', $scope[messageName]);
		$scope[messageName] = '';
	}
	$scope.keypress = function($event, messageName){
		if ($event.keyCode === 13){
			$scope.sendmessage(messageName);
		}
	}
	$scope.openprivatetalk = function(user){
		talk_to_name = user;
		private_chatroom = client_name+'_'+talk_to_name;
		$scope.privatechats = []; 
		if (!isPrivate()){
		 	 $scope.isprivate = isPublic();
		}
		socket.emit('pm', talk_to_name, client_name, private_chatroom);
		socket.emit('joinroom', talk_to_name, private_chatroom);


	}
	$scope.showhistory = function(){
		$scope.clearhistory();
		socket.emit('history', client_name, talk_to_name, private_chatroom);
	}
	$scope.clearhistory = function(){
		$scope.historytalks = [];
	}
	$scope.leaveprivateroom = function(){
		socket.emit('leaveroom');
		private_chatroom = '';
		if (isPrivate()){
			$scope.isprivate =	isPublic();
		}
	}

});