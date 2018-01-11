/* Author: Yulia Hess 731183, Elena Klatt 741434 */

//Initialisation from the socket.io and node.js
var express = require('express');
var helmet = require('helmet');
var app = express();
var bodyParser = require("body-parser");
var siofu = require("socketio-file-upload");
var cfenv = require("cfenv")
var cradle = require('cradle');
var crypto = require('crypto');
var defaultMaxAge = 180 * 24 * 60 * 60;



var host = process.env.VCAP_APP_HOST;
var port = process.env.PORT || process.env.VCAP_APP_PORT || 3000;
//var port = 6379;
//var host = process.env.VCAP_APP_HOST || 'localhost';

//Enable reverse proxy support in Express.
app.enable('trust proxy');

var http = require('http').Server(app);
var io = require('socket.io')(http);

var redis = require('socket.io-redis');
io.adapter(redis({ host: host, port: 6379 }));

//var redis = require('socket.io-redis');
//io.adapter(redis({ host: host, port: port }));

//var io = require('socket.io')(3000);
//var redis = require('socket.io-redis');
//io.adapter(redis({ host: 'localhost', port: 6379 }));

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

//Database

//var cloudant = {
//     url : "https://e886fae7-da03-4fdd-9e13-b8cd5bd81308-bluemix:802c4f4be77ddc0a3b0633088aaed8b16bb537534cd7df663a557a8d942433e6@e886fae7-da03-4fdd-9e13-b8cd5bd81308-bluemix.cloudant.com"               
//};
//if (process.env.hasOwnProperty("VCAP_SERVICES")) {
//	  // Running on Bluemix. Parse out the port and host that we've been assigned.
//	  var env = JSON.parse(process.env.VCAP_SERVICES);
//	  var host = process.env.VCAP_APP_HOST;
////	  var port = process.env.VCAP_APP_PORT;
//	 
//	  // Also parse out Cloudant settings.
//	  cloudant = env['cloudantNoSQLDB'][0].credentials;  
//	}



//if (process.env.VCAP_SERVICES) {
//   var env = JSON.parse(process.env.VCAP_SERVICES);
//   var cloudant = env['cloudantNoSQLDB'][0].credentials;
//} else {
   var cloudant =     {
			  "username": "e886fae7-da03-4fdd-9e13-b8cd5bd81308-bluemix",
			  "password": "802c4f4be77ddc0a3b0633088aaed8b16bb537534cd7df663a557a8d942433e6",
			  "host": "e886fae7-da03-4fdd-9e13-b8cd5bd81308-bluemix.cloudant.com",
			  "port": 443,
			  "url": "https://e886fae7-da03-4fdd-9e13-b8cd5bd81308-bluemix:802c4f4be77ddc0a3b0633088aaed8b16bb537534cd7df663a557a8d942433e6@e886fae7-da03-4fdd-9e13-b8cd5bd81308-bluemix.cloudant.com"
			};
//};

var nano     = require('nano')(cloudant.url)
				, callback = console.log // this would normally be some callback
				, cookies  = {} // store cookies, normally redis or something
				;
//var un = "e886fae7-da03-4fdd-9e13-b8cd5bd81308-bluemix";
//var pw = "802c4f4be77ddc0a3b0633088aaed8b16bb537534cd7df663a557a8d942433e6";

var authCookie = "some stored cookie";

var db = nano.db.use('_users');



//Will prevent the browser from MIME-sniffing a response away from the declared content-type.
module.exports = function nosniff () {
	  return function nosniff (req, res, next) {
	    res.setHeader('X-Content-Type-Options', 'nosniff')
	    next()
	  }
	}


//enables the Cross-site scripting (XSS) filter built into most recent web browsers.
module.exports = function xXssProtection (options) {
	  if (options && options.setOnOldIE) {
	    return function xXssProtection (req, res, next) {
	      res.setHeader('X-XSS-Protection', '1; mode=block')
	      next()
	    }
	  } else {
	    return function xXssProtection (req, res, next) {
	      var matches = /msie\s*(\d+)/i.exec(req.headers['user-agent'])

	      var value
	      if (!matches || (parseFloat(matches[1]) >= 9)) {
	        value = '1; mode=block'
	      } else {
	        value = '0'
	      }

	      res.setHeader('X-XSS-Protection', value)
	      next()
	    }
	  }
	}


module.exports = function hsts (options) {
	  options = options || {}

	  var maxAge = options.maxAge != null ? options.maxAge : defaultMaxAge
	  var includeSubDomains = (options.includeSubDomains !== false) && (options.includeSubdomains !== false)
	  var setIf = options.hasOwnProperty('setIf') ? options.setIf : alwaysTrue

	  if (options.hasOwnProperty('maxage')) {
	    throw new Error('maxage is not a supported property. Did you mean to pass "maxAge" instead of "maxage"?')
	  }
	  if (arguments.length > 1) {
	    throw new Error('HSTS passed the wrong number of arguments.')
	  }
	  if (typeof maxAge !== 'number') {
	    throw new TypeError('HSTS must be passed a numeric maxAge parameter.')
	  }
	  if (maxAge < 0) {
	    throw new RangeError('HSTS maxAge must be nonnegative.')
	  }
	  if (typeof setIf !== 'function') {
	    throw new TypeError('setIf must be a function.')
	  }
	  if (options.hasOwnProperty('includeSubDomains') && options.hasOwnProperty('includeSubdomains')) {
	    throw new Error('includeSubDomains and includeSubdomains cannot both be specified.')
	  }

	  var header = 'max-age=' + Math.round(maxAge)
	  if (includeSubDomains) {
	    header += '; includeSubDomains'
	  }
	  if (options.preload) {
	    header += '; preload'
	  }

	  return function hsts (req, res, next) {
	    if (setIf(req, res)) {
	      res.setHeader('Strict-Transport-Security', header)
	    }

	    next()
	  }
	}

	function alwaysTrue () {
	  return true
	}

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


// post method to chatroom.html
app.post('/chatroom.html', function (req, res) {
	var uname = req.body.uname;
	var passwd = req.body.passwd;
	
	nano.auth(uname, passwd, function (err, body, headers) {
	  if (err) {
		  console.log("login error");
		  console.log(err);
		  res.render("pages/index", {
				error: "wrong username or passwort"
			});
	  }
	
	  if (headers && headers['set-cookie']) {
		authCookie = headers['set-cookie'];
	  }
	  
	  
	  getUserInfo(body.name)
	  console.log("it worked");
	  
	  joinChatroom(res, uname);
	});

});


function joinChatroom(res, uname){
	var msg = {
	    	'message': " is connected",
	    	'timestamp': Date.now(),
	    	'username': uname,
	    	'color' : 'grey'
	      }
	//	 check usernames
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
}

//post method to chatroom.html
app.post('/register', function (req, res) {
	var uname = req.body.uname;
	var passwd = req.body.passwd;
	var avatar = req.body.avatar;
	
	if(createUser(uname, passwd, avatar) == false){
		res.render("pages/index", {
			error: "username already taken"
		});
	}
	joinChatroom(res, uname);
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
	  uploader.dir = "public/files";
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
		  
			  if(event.file.meta.hello != "avatar"){
				  // get selected username 
				  var username = event.file.meta.hello;
			        var msg = {
				    	'username': socket.username,
				    	'color': socket.color,
				    	'socketId': socket.id,
				    	'timestamp': Date.now(),
						'link': 'https://chataplication.eu-de.mybluemix.net/files/'+ event.file.name,
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
			        
			  }else{
				  
//				var watson = require('watson-developer-cloud');
//				var fs = require('fs');
//				var visual_recognition = watson.visual_recognition({
//				  api_key: 'abd64dee35146daed4a61354d162e98def85e4de',
//				  version: 'v3',
//				  version_date: '2016-05-20'
//				});
//				  var params = {
//				    images_file: fs.createReadStream('public/files/'+ event.file.name)
//				  };
//
//				  visual_recognition.detectFaces(params,
//				    function(err, response) {
//				      if (err)
//				        console.log(err);
//				      else
//				        console.log(JSON.stringify(response, null, 2));
//				    });
				  
				  
				  var msg = {
						'link': 'https://chataplication.eu-de.mybluemix.net/files/'+ event.file.name,
						'filename': event.file.name
					}
				  
				  socket.emit('media', msg);
			  }
	  });
	  
	  // catch uploader error output
	  uploader.on("error", function(event){
		  console.log("Error from uploader", event);
	  });
});


function createUser(name, password,avatar, callback){
	
  db.get(name, function (err, doc) {
    if(err && err.error === 'not_found'){
	    db.insert({
	    	"_id": "org.couchdb.user:"+name,
		    "name": name,
		    "type": "user",
		    "roles": [],
		    "password": password,
		    "avatar": avatar
	    }, callback)
    } else if(err) {
      callback(err)
    } else {
      return false;
    }
  })
}


function getUserInfo(name){
	console.log(name)
	db.get(name, function (err, doc) {
		console.log(doc);
		console.log(err);
	});
}

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
    console.log("server starting on " + port)
});


