// ToDo:
// X undo button 
// X scroll-toggle
// separate undos ( separate canvases (user id for canvas id?) )
// colors/thickness (side panel)
// X redo
// 



$(function(){

	var iPadAgent = navigator.userAgent.match(/iPad/i) != null;
  var iPodAgent = navigator.userAgent.match(/iPhone/i) != null;
  var AndroidAgent = navigator.userAgent.match(/Android/i) != null;
  var webOSAgent = navigator.userAgent.match(/webOS/i) != null;

	// This demo depends on the canvas element
	if(!('getContext' in document.createElement('canvas'))){
		alert('Sorry, it looks like your browser does not support canvas!');
		return false;
	}

	// The URL of your web server (the port is set in app.js)
	var url = 'http://localhost:8080';

	var doc = $(document),
		win = $(window),
		canvas = $('#paper'),
		canvas2 = $('#other'),
		ctx = canvas[0].getContext('2d'),
		ctx2 = canvas2[0].getContext('2d'),
		instructions = $('#instructions');


	// Generate an unique ID
	var id = Math.round($.now()*Math.random());
	
	// A flag for drawing activity
	var drawing = false;

	var clients = {};
	var cursors = {};

	var socket = io.connect();
	
	// This array will store the restoration points of the canvas
	// console.log("resetting restore points")
	var restorePoints = [];
	var redoPoints = [];

	socket.on('moving', function (data) {
		// console.log(data.id);
		if(! (data.id in clients)){
			// a new user has come online. create a cursor for them
			cursors[data.id] = $('<div class="cursor">').appendTo('#cursors');
		}
		
		// Move the mouse pointer
		cursors[data.id].css({
			'left' : data.x,
			'top' : data.y
		});
		
		// Is the user drawing?
		if(data.drawing && clients[data.id]){
			
			// Draw a line on the canvas. clients[data.id] holds
			// the previous position of this user's mouse pointer
			
			drawLine(clients[data.id].x, clients[data.id].y, data.x, data.y, data.erasing, ctx2);

			if(data.erasing){
				drawLine(clients[data.id].x, clients[data.id].y, data.x, data.y, data.erasing, ctx);				
			}
		}
		
		// Saving the current client state
		clients[data.id] = data;
		clients[data.id].updated = $.now();
	});

	var prev = {};
	
	canvas.on('mousedown touchstart',function(e){
		if (!scrollingOn()) {
      e.preventDefault();

///////////////////////////////////////////////////
      ctx2.closePath();
      ctx2.stroke();

      console.log("touchstart/mousedown");
///////////////////////////////////////////////////

			drawing = true;
			prev.x = getX(e);
			prev.y = getY(e);
			
			redoPoints = [];

			// Hide the instructions
			instructions.fadeOut();
		}
	});
	
	/////////////////////////////////////////
	

	// The function which saves the restoration points
	function saveRestorePoint() {
		// Get the current canvas drawing as a base64 encoded value
	
		var oCanvas = canvas[0];
		var imgSrc = oCanvas.toDataURL("image/png");
		// console.log("pushpushspus")
		// and store this value as a 'restoration point', to which we can later revert
		// console.log("First it has length: " + restorePoints.length);
		restorePoints.push(imgSrc);
		// console.log("After pushing it has length: " + restorePoints.length);
	}	

	// Function to restore the canvas from a restoration point
	function undoDrawOnCanvas() {
		// If we have some restore points
		if (restorePoints.length > 0) {
			
			redoPoints.push(canvas[0].toDataURL("image/png"));
			// console.log(redoPoints);
			// The source of the image, is the last restoration point
			var prevImg = restorePoints.pop();
			revert(prevImg, canvas[0], ctx);
			return prevImg;
		}
	}

	function redo() {
		
		var oCanvas = canvas[0];
		var imgSrc = oCanvas.toDataURL("image/png");

		if (redoPoints.length > 0) {
			restorePoints.push(imgSrc)

			var nextImg = redoPoints.pop();
			revert(nextImg, canvas[0], ctx);
			return nextImg;
		}
	}

	function revert(image, canvas_id, context_id) {
		var can = canvas_id;
		can.width = can.width;
		// console.log("cleared")
		var undoImg = new Image();
		// When the image object is fully loaded in the memory...
		undoImg.onload = function() {
			// Get the canvas context
			var canvasContext = canvas_id.getContext("2d");		
			// and draw the image (restore point) on the canvas. That would overwrite anything
			// already drawn on the canvas, which will basically restore it to a previous point.
			context_id.drawImage(undoImg, 0, 0);
			// console.log(undoImg);
		}
		undoImg.src = image;
	}


	/////////////////////////////////////////
	// doc.bind('touchend', function(){
	// });

	doc.on('mouseup mouseleave touchend',function(e){
		e.preventDefault();
		drawing = false;
		// alert(drawing);
		// alert(hasTouch());
		ctx.closePath();
		ctx2.closePath();
		ctx2.stroke();
		// ctx.beginPath();
		// ctx2.beginPath();
		//undoDrawOnCanvas();

		socket.emit('touchend', {'drawing' : false})
	});

	socket.on('touchend', function(data) {
		console.log(data.drawing);
		drawing = data.drawing
		ctx2.closePath();
		ctx2.stroke();
	});

	

	canvas.on('mousedown touchstart',function(){
/////////////////////////////
		ctx.closePath();
		drawing = true;

/////////////////////////////
		saveRestorePoint();

	});



	$("#redo-btn").click(function(){
		if (redoPoints.length > 0){
			var nextImg = redo();
			socket.emit('redo', {'nxt' : nextImg})
		}
	});

	socket.on('redo', function(data) {
		revert(data.nxt, canvas2[0], ctx2)
		// console.log("redoing!!!!!!!!")
	})	
/////// UNDO //////////////
	$("#undo-btn").click(function(){
		if (restorePoints.length > 0){
			var prevImg = undoDrawOnCanvas();
			socket.emit('undo', {'prev' : prevImg})
		}
	});


	socket.on('undo', function(data) {
		revert(data.prev, canvas2[0], ctx2)
	})


	function scrollingOn() {
      return $('#scroll-toggle').prop('checked')
   }

	function erasingOn() {
      return $('#eraser-toggle').prop('checked')
  }

  function hasTouch() {
    return iPadAgent || iPodAgent || AndroidAgent || webOSAgent;
  }
/////////////////////////////////////////////


	function getX(e) {
		return hasTouch() ? e.originalEvent.touches[0].pageX : e.pageX
	}

	function getY(e) {
		return hasTouch() ? e.originalEvent.touches[0].pageY : e.pageY
	}

	var lastEmit = $.now();

	doc.on('mousemove touchmove',function(e){
		if($.now() - lastEmit > 30){
			socket.emit('mousemove',{
				'x': getX(e),
				'y': getY(e),
				'drawing': drawing,
				'id': id,
				'erasing': erasingOn()
			});
			lastEmit = $.now();
		}
		
		// Draw a line for the current user's movement, as it is
		// not received in the socket.on('moving') event above
		
		if(drawing){
			
			drawLine(prev.x, prev.y, getX(e), getY(e), erasingOn(), ctx);

			if(erasingOn()){
				drawLine(prev.x, prev.y, getX(e), getY(e), erasingOn(), ctx2);
			}
			
			prev.x = getX(e);
			prev.y = getY(e);
		}
	});

	// Remove inactive clients after 10 seconds of inactivity
	setInterval(function(){
		
		for(ident in clients){
			if($.now() - clients[ident].updated > 10000){
				
				// Last update was more than 10 seconds ago. 
				// This user has probably closed the page
				
				cursors[ident].remove();
				delete clients[ident];
				delete cursors[ident];
			}
		}
		
	},10000);

	function drawLine(fromx, fromy, tox, toy, isDrawing, context_id){
		if (isDrawing) {
			context_id.globalCompositeOperation="destination-out";
		} else {
			context_id.globalCompositeOperation="source-over";
		}

		context_id.beginPath();
		context_id.lineCap = "round";
		context_id.lineJoin = "round";
		context_id.lineWidth = 4;
		context_id.moveTo(fromx, fromy);
		context_id.lineTo(tox, toy);
    context_id.closePath();

    if(context_id == ctx){
    	context_id.strokeStyle = "red";
    }
    console.log(context_id.style);


		context_id.stroke();

	}

});