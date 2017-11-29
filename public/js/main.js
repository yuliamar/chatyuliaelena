/* Author: Yulia Hess 731183, Elena Klatt 741434 */ 

$( document ).ready(function() {
	 
    // init socket.io
    var socket = io.connect();
    var uploader = new SocketIOFileUpload(socket);

    // uploader listener on button press
    uploader.listenOnSubmit(document.getElementById("upload-button"), document.getElementById("input-file"));

    // upload listener on upload start
    uploader.addEventListener("start", function(event){
    	// get username from select form
    	var username = $('#popup-userlist').find(":selected").text();
    	console.log("start");
    	console.log(username);
    	event.file.meta.hello = username;
    });
    
    // open modal
    $('.modal-open').click(function() {
    	 var msg = {
    	    	'username': username
    	        }    
    	      socket.emit('get users', msg);
    	  $('.overlay').addClass('visible');
    });
    
    socket.on('getUsers',function(data){
    	// write userlist in popup 
    	$('#popup-userlist').html(data);
    });
    
    // close modal
    $('#modal-close').click(function() {
    	$('.overlay').removeClass('visible');
    });
 
    
    // upload progress
    uploader.addEventListener("progress", function(event){
        var percent = event.bytesLoaded / event.file.size * 100;
        console.log("File is", percent.toFixed(2), "percent loaded");
    });

    // file upload complete
    uploader.addEventListener("complete", function(event){
        console.log(event.success);
        console.log(event.file);
    });
    
    
	// check media type and display in message box
	socket.on('media',function(data){
	
		var message = "";
		
		if (data.link.match(/.+\.(mp4|ogg|webm)$/i))
		{
			message += '<video src="' + data.link	+ '" controls>';
			message += '<a target="_blank" href="' + data.link + '" download>'+ data.filename + '</a>';
		} 
		else if (data.link.match(/.+\.(jpg|png|jpeg|bmp|gif)$/i))
		{
			message += '<a target="_blank" href="'	+ data.link	+ '">';
			message	+= '<img src="' + data.link + '">';
			message	+= '</a>';
		} 
		else
		{
			message += '<a target="_blank" href="'	+ data.link	+ '">'+ data.filename +'</a>';
		}
		
		$('#messages').append(buildMessage(
				data.timestamp, 
				data.username, 
				data.color, 
				message, 
				data.socketId, 
   			 	"media-message"
		));
		
		// scroll down 
//		$(".chat-wrapper").animate({ scrollTop: $(document).height() }, 500);
	});
	
    // on message submit 
    $('form').submit(function(){
    	// get value from form
    	if( $('#m').val().length == 0){
    		return false;
    	}
      var msg = {
    	'message': $('#m').val(),
    	'timestamp': Date.now(),
    	'username': username
      }    
      socket.emit('chat message', msg);
      // reset form value
      $('#m').val('');
      return false;
    });
    
    // get chat message
    socket.on('chat message', function(msg){

      console.log(msg);
	  $('#messages').append(buildMessage(
			  msg.timestamp, 
			  msg.username, 
			  msg.color, 
			  msg.message, 
			  msg.socketId,
			  "message"
	   ));
	  
//	  $(".chat-wrapper").animate({ scrollTop: $(document).height() }, 500);
  
    });
    
    // get whisper message
    socket.on('whisper', function(msg){
    	 $('#messages').append(buildMessage(
    			 msg.timestamp, 
    			 msg.username+" whispers", 
    			 msg.color, 
    			 msg.message, 
    			 msg.socketId, 
    			 "private-message"
    	));
    	 
//    	 $(".chat-wrapper").animate({ scrollTop: $(document).height() }, 500);
	});
    
    // set username on server
    socket.emit('addUser', username);
    
    
    // template message
    function buildMessage(timestamp, name, color, message, MessageSocketId, cssClass){
    	
    	
    	if(MessageSocketId == socket.id){
    	  cssClass = "self";
    	  var name = "Ich";
    	}
    	  
    	if(color == 'grey'){
    		cssClass = 'system-message';
    	}
    	
    	var time = getTime(timestamp);
    	var html 	= "<li class='"+cssClass+"'>";
    	html 		+= "<span style='color:"+color+";' class='"+cssClass+"-username username'>";
    	html 		+= name;
    	html 		+= "</span>";
    	html 		+= "<span class='message'>";
    	html 		+= message;
    	html 		+= "</span>";
    	html 		+= time;
    	html 		+= "</li>";
    	
    	return html;
    }

    
    // convert timestamp to date
    function getTime(timestamp){
    	
    	var date = new Date(timestamp);
    	var hour =date.getHours(); 
    	var hour = ("0" + hour).slice(-2);
    	var minute = date.getMinutes();
    	var minute = ("0" + minute).slice(-2);
    	
    	return  "<span class='time'>"+hour+":"+minute+"</span>"
    }
     

 });
 
 