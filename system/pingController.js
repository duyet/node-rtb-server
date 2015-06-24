'use strict';

exports.pingme = function(req, res) {
	console.info("INFO: ["+ new Date() +"] Ping me");
	res.end("pong");
};