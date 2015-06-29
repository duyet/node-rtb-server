'use strict';

console.info("\n\n\n\n................................................\n\n\n");

// PMX for HTTP Analysic
require('pmx').init();

var fs = require('fs'),
	http = require('http'),
	express = require('express'),
	morgan = require('morgan'),
	bodyParser = require('body-parser'),
	session = require('express-session'),
	sessionStore = require('express-mysql-session'),
	expressValidator = require('express-validator'),
	methodOverride = require('method-override'),
	cookieParser = require('cookie-parser'),
	helmet = require('helmet'),
	cors = require('cors'),
	//flash = require('connect-flash'),
	FileStreamRotator = require('file-stream-rotator'),
	config = require('./config/config'),
	compression = require('compression'),
	multipart = require('connect-multiparty'),
	db = require('./config/db');

	require("dot").process({
		global: "_page.render"
		, destination: __dirname + "/render/"
		, path: (__dirname + "/templates")
	});

	console.info("INFO: Init BGate Server");
	// Initialize express app
	var app = express();

	// Passing the request url to environment locals
	app.use(function(req, res, next) {
		res.locals.url = req.protocol + '://' + req.headers.host + req.url;
		next();
	});

	// Showing stack errors
	app.set('showStackError', true);

	app.set('view engine', 'jade');

	// https://en.wikipedia.org/wiki/Cross-origin_resource_sharing
	app.use(cors());

	// -----------------------------------
	// Log 
	// -----------------------------------
	var logDir = __dirname + config.logDir;
	// ensure log directory exists
	fs.existsSync(logDir) || fs.mkdirSync(logDir);

	// create a rotating write stream
	var accessLogStream = FileStreamRotator.getStream({
		filename: logDir + '/access/access-%DATE%.log',
		frequency: 'daily',
		verbose: false,
		date_format: "YYYY-MM-DD"
	})
	// setup the logger
	app.use(morgan('combined', {stream: accessLogStream}))


	// Environment dependent middleware
	if (config.debug) {
		// Disable views cache
		app.set('view cache', false);
	} else {
		app.locals.cache = 'memory';
	}

	// Request body parsing middleware should be above methodOverride
	app.use(bodyParser.urlencoded({
		extended: true
	}));
	
	app.use(bodyParser.json());
	app.use(compression({level: 9})); //use compression 
	app.use(methodOverride());
	
	app.use(expressValidator({
		errorFormatter: function(param, msg, value) {
			return msg;
		}
	}));

	// CookieParser should be above session
	app.use(cookieParser());

	// connect flash for flash messages
	//app.use(flash());

	// Use helmet to secure Express headers
	app.use(helmet.xframe());
	app.use(helmet.xssFilter());
	app.use(helmet.nosniff());
	app.use(helmet.ienoopen());
	app.disable('x-powered-by');

	/*
	app.use(function(req, res, next) {
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader("Access-Control-Allow-Credentials", "true");
		res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
		res.header("Access-Control-Allow-Headers", "X-Requested-With");
		//res.setHeader("Content-Type","application/json");
		return next();
	});
	*/

	
	app.use(function(req, res, next) {
	   res.header("Access-Control-Allow-Origin", "*");
	   res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
	   res.header("Access-Control-Allow-Headers", "x-openrtb-version,Content-Type,*");
	   res.header("X-Frame-Options", "ALLOWALL");
	   if (req.method === 'OPTIONS') {
	   		console.log("INFO: Browser send OPTIONS request.");
			res.statusCode = 204;
			return res.end();
	  } else {
	    return next();
	  }
	});
	

	// Assume 'not found' in the error msgs is a 404. this is somewhat silly, but valid, you can do whatever you like, set properties, use instanceof etc.
	app.use(function(err, req, res, next) {
		// If the error object doesn't exists
		if (!err) return next();

		// Log it
		console.error(err.stack);

		// Error page

		res.status(500).send({"CODE":500,"ERR":1, "MESSAGE": err.stack});
	});

	require("./config/routes.js")(app);

	// Assume 404 since no middleware responded
	app.use(function(req, res) {
		console.log("ERR: 404 not found.");
		res.status(404).send({"CODE":404, "ERR":1, "MESSAGE":"Not found."});
	});


console.info("INFO: Listening in port " + config.port + " ...");
console.info("==================== Ready to connect =================\n");
http.createServer(app).listen(config.port);