'use strict';

var config = require('../config/config');
var BGateAgent = require('../helper/BgateAgent.js');
var Publisher = require('../helper/Publisher.js');

exports.trigger_reset_agent = function(req, res) {
	if (!req.query || !req.query.s || req.query.s != config.trigger_token) {
		return res.status(404).send("Not Found");
	}

	console.log("###################################################");
	console.log("########### WARNING: RESTART BGATE AGENT ##########");
	console.log("###################################################");

	// Refresh BGate Agent Data from DB
	console.time("INFO: Reseting BGate Agent.");
	BGateAgent.init(function() {
		console.log("INFO: ["+ new Date() +"] Reset BGate Agent success.");
		console.timeEnd("INFO: Reseting BGate Agent.");
	});

	// console.log(BGateAgent);

	res.send("ok");
};

exports.trigger_reset_publisher = function(req, res) {
	if (!req.query || !req.query.s || req.query.s != config.trigger_token) {
		return res.status(404).send("Not Found");
	}

	console.log("###################################################");
	console.log("########### WARNING: RESTART PUBLISHER ############");
	console.log("###################################################");


	console.time("INFO: Reseting Publisher.");
	Publisher.init(function() {
		console.log("INFO: ["+ new Date() +"] Reset BGate Publisher success.");
		console.timeEnd("INFO: Reseting Publisher.");
	});

	console.log(Publisher.data);

	res.send("ok");
}

exports.trigger_reset_all = function(req, res) {
	if (!req.query || !req.query.s || req.query.s != config.trigger_token) {
		return res.status(404).send("Not Found");
	}

	console.log("###################################################");
	console.log("########### WARNING: RESTART ALL ##################");
	console.log("###################################################");

	console.time("INFO: Reseting BGate Agent.");
	BGateAgent.init(function() {
		console.log("INFO: ["+ new Date() +"] Reset BGate Agent success.");
		console.timeEnd("INFO: Reseting BGate Agent.");
	});

	console.time("INFO: Reseting BGate Publisher.");
	Publisher.init(function() {
		console.log("INFO: ["+ new Date() +"] Reset BGate Publisher success.");
		console.timeEnd("INFO: Reseting BGate Publisher.");
	});

	res.send("ok");
}
