'use strict';

var config = require('./config.js');

module.exports = function(app) {
	var bids = require('../system/bidsController.js');
	var bidrequest = require('../system/bidrequestController.js');
	var impTracker = require('../system/impTrackerController.js');
	var clickTRacker = require('../system/clickTrackerController.js');

	app.route('/').get(function(req, res) { res.send("Hi, bye!"); });
	
	app.route('/' + config.bidsPath)
		.get(bids.index)
		.post(bids.bids);

	app.route('/' + config.impTrackerPath)
		.get(impTracker.tracker);

	app.route('/' + config.clickTrackerPath)
		.get(clickTRacker.tracker);

	app.route('/bidrequest')
		.get(bidrequest.generate);
};
