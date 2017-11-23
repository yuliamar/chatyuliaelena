/* Author: Yulia Hess 731183, Elena Klatt 741434 */


//Initialisation from the socket.io and node.js
var express = require('express');
var helmet = require('helmet');
var app = express();
var bodyParser = require("body-parser");
var siofu = require("socketio-file-upload");
var cfenv = require("cfenv")
let port = process.env.PORT || process.env.VCAP_APP_PORT || 3000;

//Enable reverse proxy support in Express.
app.enable('trust proxy');

var http = require('http').Server(app);
var io = require('socket.io')(http);
var appEnv = cfenv.getAppEnv()
// array of users
var users = [];
// array of sockets
var sockets = {};

app.use(helmet());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// use uploader
app.use(siofu.router);
// set engine for templating
app.engine('.html', require('ejs').__express);
app.set('view engine', 'html')


//Session Management
//app.use(function (req, res, next) {
//	  var n = req.session.views || 0;
//	  req.session.views = n++;
//	  res.end(n + ' views');
//	});

//app.use(cookieSession({
//name: 'session',
//keys: [
//  process.env.COOKIE_KEY1,
//  process.env.COOKIE_KEY2
//]
//}));

//Will prevent the browser from MIME-sniffing a response away from the declared content-type.
module.exports = function nosniff () {
	  return function nosniff (req, res, next) {
	    res.setHeader('X-Content-Type-Options', 'nosniff')
	    next()
	  }
	}


app.get('/*',function(req,res,next){
    res.header('X-XSS-Protection' , 0 );
    next(); // http://expressjs.com/guide.html#passing-route control
});

//enables the Cross-site scripting (XSS) filter built into most recent web browsers.
//module.exports = function xXssProtection (options) {
//	  if (options && options.setOnOldIE) {
//	    return function xXssProtection (req, res, next) {
//	      res.setHeader('X-XSS-Protection', '1; mode=block')
//	      next()
//	    }
//	  } else {
//	    return function xXssProtection (req, res, next) {
//	      var matches = /msie\s*(\d+)/i.exec(req.headers['user-agent'])
//
//	      var value
//	      if (!matches || (parseFloat(matches[1]) >= 9)) {
//	        value = '1; mode=block'
//	      } else {
//	        value = '0'
//	      }
//
//	      res.setHeader('X-XSS-Protection', value)
//	      next()
//	    }
//	  }
//	}

////Sicherheit
////The page can only be displayed in a frame on the same origin as the page itself.
//add_header X-Frame-Options SAMEORIGIN;
////Will prevent the browser from MIME-sniffing a response away from the declared content-type.
//add_header X-Content-Type-Options nosniff;
////enables the Cross-site scripting (XSS) filter built into most recent web browsers.
//add_header X-XSS-Protection "1; mode=block";
////Es kann nur Inhalte aus den Domains herunterladen, die zugelassen sind.
////It can only download content from the domains that are allowed.
//add_header Content-Security-Policy "default-src 'self'";

app.use (function (req, res, next) {
        if (req.secure) {
                // request was via https, so do no special handling
                next();
        } else {
                // request was via http, so redirect to https
                res.redirect('https://' + req.headers.host + req.url);
        }
});

//Access rights to the uploads folder (Pictures, Videos ...)
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/files'));


// post method to chatroom.html
app.post('/chatroom.html', function (req, res) {
	var uname = req.body.uname;
	var msg = {
	    	'message': " is connected",
	    	'timestamp': Date.now(),
	    	'username': uname,
	    	'color' : 'grey'
	      }
	// check usernames
	if(uname in users){	
		res.render("pages/index", {
			error: "username already taken"
		});
	}else{
		io.sockets.emit('chat message',msg);
		// render chatroom page
		res.render("pages/chatroom", {
			username: uname
		});
	}

});


// get index.html from server
app.get('/index.html', function(req, res){
	 res.render("pages/index",{
			error: ""
	  });
});

//get index.html from server
app.get('/', function(req, res){
	  res.render("pages/index",{
			error: ""
	  });
});




//-------- If a Clients connect's to the server-----------
io.on('connection', function(socket){
	
	  // init uploader
	  var uploader = new siofu();
	  uploader.dir = "files";
	  uploader.listen(socket);
	   
     
	 console.log("user connected");
	 sockets[socket.id] = socket; 
	 
 
	 //User is added to the Userlist
	 socket.on('addUser', function (data) {
		 console.log("Benutzer hinzugefuegt "+data);
		 socket.username = data;
		 socket.color = getRandomRolor();
		 // add user to users object
		 users[socket.username] = socket;
	 });
	 
	 //Get user list
	 socket.on('get users', function (data) {
		 // set select options for file sending
		 list = '<select id="popup-userlist" name="userslist">';
		 list += '<option selected value="0">send to all</option>';		  
		 Object.keys(users).forEach(function(key) {
			  list += '<option value="'+users[key].username+'">'+users[key].username+'</option>';		  
		  });
		 list += '</select>';
		 
		 var usersList = {
		    	'data': users
		      }
		 
		 socket.emit('getUsers', list);

	 });
	 
	//If a client disconnects, send it to all clients
	 socket.on('disconnect', function(){
			var msg = {
			    	'message': " is disconnected",
			    	'timestamp': Date.now(),
			    	'username': socket.username,
			    	'color' : 'grey'
			      }			
	    console.log('user disconnected');
	    io.emit('chat message', msg);
	    
	    //User is deleted from the list
	    delete users[socket.username];
	    	 
	  });
	  
	  //list with all online Users with the Usernames
	  socket.on('chat message', function(msg){
		  if(msg.message == "/list"){
			  var list = "<h3>online users</h3>";
			  list += "<ol>";
			  Object.keys(users).forEach(function(key) {
				  list += "<li style='color:"+users[key].color+"'>"+users[key].username+"</li><br>";		  
			  });
			  list += "</ol>";
			  var msg = {
				    	'message': list, 
				    	'timestamp': Date.now(),
				    	'username': socket.username,
				    	'socketId': socket.id,
				    	'color': socket.color
				      }
			  //send user list to client
			  socket.emit('chat message', msg);
		  }	
		  // substr message to get name and whisper message
		  else if(msg.message.substr(0, 3) === '/w '){  //  /w name msg
			
			tmpMsg = msg.message.substr(3);
			var index = tmpMsg.indexOf(' ')
			if(index !== -1){
				var name = tmpMsg.substr(0, index);
				var tmpMsg = tmpMsg.substr(index + 1);
		
				if(name in users){
					
					 var whisper = {
				    	'message': tmpMsg,
				    	'timestamp': Date.now(),
				    	'username': socket.username,
				    	'color': socket.color,
				    	'socketId': socket.id
				      }
					
					// send to sender
					socket.emit('whisper', whisper);
					// send to client
					users[name].emit('whisper', whisper);
				}
			}
		 }else{
			
		  msg.socketId = socket.id 
		  msg.color = socket.color;
		  
	      io.emit('chat message',msg);
		 }
	  });
	  
	  // Do something when a file is saved:
	  uploader.on("saved", function(event){
		  // get selected username 
		  var username = event.file.meta.hello;
	        var msg = {
		    	'username': socket.username,
		    	'color': socket.color,
		    	'socketId': socket.id,
		    	'timestamp': Date.now(),
				'link': 'https://chataplication.eu-de.mybluemix.net:'+port+"/"+ event.file.name,
				'filename': event.file.name
			}
	        
	        if(username == "send to all"){
	        	// send to all
	        	io.emit('media', msg);
	        }else{
	        	// send to specific clients
	        	socket.emit('media', msg);
	        	users[username].emit('media', msg);
	        }
	        
		    
	  });
	  
	  // catch uploader error output
	  uploader.on("error", function(event){
		  console.log("Error from uploader", event);
	  });
});


//a color is calculated for each username
function getRandomRolor() {
	var letters = '0123456789'.split('');
	var color = '#';
	for (var i = 0; i < 6; i++) {
		color += letters[Math.round(Math.random() * 10)];
	}
	return color;
}


// listen to port
	http.listen(port, function() {
//	http.listen(appEnv.port, appEnv.bind, function() { 
    console.log("server starting on " + port)
})


