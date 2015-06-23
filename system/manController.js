'use strict';

var config = require('../config/config');

exports.index = function(req, res) {
	console.log("INFO: Open API Manual");
	if (!req.query.s || req.query.s != config.trigger_key) 
		return res.status(404).send("Hi, bye!");

	var api = "<b>BGate API List</b><br /><br />";
	for (var i in config.routes) {
		api += "  " + config.routes[i] + "<br />\t\n";
	}

	res.send(api);
}