'use strict';

/**
 * Module dependencies.
 */
var fs = require('fs'),
	http = require('http'),
	express = require('express'),
	morgan = require('morgan'),
	bodyParser = require('body-parser'),
	session = require('express-session'),
	sessionStore = require('express-mysql-session'),
	expressValidator = require('express-validator'),
	compress = require('compression'),
	methodOverride = require('method-override'),
	cookieParser = require('cookie-parser'),
	helmet = require('helmet'),
	flash = require('connect-flash'),
	config = require('./config/config'),
	compression = require('compression'),
	multipart = require('connect-multiparty'),
	db = require('./config/db');


	// Initialize express app
	var app = express();

	// Passing the request url to environment locals
	app.use(function(req, res, next) {
		res.locals.url = req.protocol + '://' + req.headers.host + req.url;
		next();
	});

	// Showing stack errors
	app.set('showStackError', true);

	app.set('bgate_var', require('./config/bgate_var.js'));

	app.set('view engine', 'jade');

	// Environment dependent middleware
	if (process.env.NODE_ENV === 'development') {
		// Enable logger (morgan)
		app.use(morgan('dev'));

		// Disable views cache
		app.set('view cache', false);
	} else if (process.env.NODE_ENV === 'production') {
		app.locals.cache = 'memory';
	}

	// Request body parsing middleware should be above methodOverride
	app.use(bodyParser.urlencoded({
		extended: true
	}));
	
	app.use(bodyParser.json());
	app.use(compression()); //use compression 
	app.use(methodOverride());
	
	app.use(expressValidator({
		errorFormatter: function(param, msg, value) {
			return msg;
		}
	}));

	// CookieParser should be above session
	app.use(cookieParser());

	// connect flash for flash messages
	app.use(flash());

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
		res.status(404).send({"CODE":400, "ERR":1, "MESSAGE":"Not found."});
	});



console.info("Listening in port " + config.port + " ...");
http.createServer(app).listen(config.port);